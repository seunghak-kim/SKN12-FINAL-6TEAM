import os
from typing import Dict, Any, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from ..models.chat import ChatSession, ChatMessage
from .prompt_manager import PersonaPromptManager
from pydantic import SecretStr
from dotenv import load_dotenv
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from prompt_chaining import ChainedPromptManager

load_dotenv()
# OPENAPIKEY 생성 
api_key_str = os.getenv("OPENAI_API_KEY")
OPENAI_API_KEY = SecretStr(api_key_str) if api_key_str is not None else None

class AIService:
    """OpenAI API 연동 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # OpenAI API 키가 있으면 
        if OPENAI_API_KEY and str(OPENAI_API_KEY) != "None":
            self.llm = ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY, 
                                    temperature=0.9, max_tokens=1000)
        else: # OpenAI API키가 없을 경우 에러 발생 
            raise ValueError("OpenAI API 키가 없습니다. 환경 변수(OPENAI_API_KEY)를 설정해주세요.")
        
        # 프롬프트 매니저 초기화
        self.prompt_manager = PersonaPromptManager()
        self.chained_prompt_manager = ChainedPromptManager()
    
    def get_persona_prompt(self, persona_type: str = "내면형", **context) -> str:
        """페르소나별 시스템 프롬프트 생성"""
        return self.prompt_manager.get_persona_prompt(persona_type, **context)
    
    def process_message(self, session_id: UUID, user_message: str, persona_type: str = "내면형", **context) -> str:
        """2단계 체이닝으로 페르소나 챗봇 메시지 처리"""
        try:
            # 세션 정보 가져오기
            session = self.db.query(ChatSession).filter(ChatSession.chat_sessions_id == session_id).first()
            if not session:
                raise ValueError(f"세션을 찾을 수 없습니다: {session_id}")
            
            # 대화 히스토리 가져오기
            messages = (
                self.db.query(ChatMessage)
                .filter(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at)
                .all()
            )
            
            # 1단계: 공통 답변 생성
            common_response, tokens_step1 = self._generate_common_response(messages, user_message, **context)
            
            # 2단계: 페르소나별 변환
            persona_response, tokens_step2 = self._transform_to_persona(common_response, persona_type, user_message, **context)
            
            # 총 토큰 사용량 출력
            total_tokens = {
                'step1_input': tokens_step1['input'],
                'step1_output': tokens_step1['output'], 
                'step2_input': tokens_step2['input'],
                'step2_output': tokens_step2['output'],
                'total_input': tokens_step1['input'] + tokens_step2['input'],
                'total_output': tokens_step1['output'] + tokens_step2['output'],
                'grand_total': tokens_step1['input'] + tokens_step1['output'] + tokens_step2['input'] + tokens_step2['output']
            }
            
            print(f"🔗 2단계 체이닝 토큰 사용량:")
            print(f"   1단계(공통답변): 입력 {total_tokens['step1_input']}, 출력 {total_tokens['step1_output']}")
            print(f"   2단계(페르소나): 입력 {total_tokens['step2_input']}, 출력 {total_tokens['step2_output']}")
            print(f"   총합: 입력 {total_tokens['total_input']}, 출력 {total_tokens['total_output']}, 전체 {total_tokens['grand_total']}")
            
            # 사용자 메시지 저장
            user_msg = ChatMessage(
                session_id=session_id,
                sender_type="user",
                content=user_message
            )
            self.db.add(user_msg)
            self.db.flush()
            
            # AI 응답 메시지 저장
            assistant_msg = ChatMessage(
                session_id=session_id,
                sender_type="assistant",
                content=persona_response
            )
            self.db.add(assistant_msg)
            
            # 세션의 updated_at 업데이트 (가장 최근 대화 시간 반영)
            from sqlalchemy.sql import func
            session.updated_at = func.now()
            self.db.add(session)
            
            self.db.commit()
            
            return persona_response
            
        except Exception as e:
            # 오류 발생 시 기본 응답
            error_response = "미안해... 지금은 마음이 좀 복잡해서 제대로 답변을 주기 어려워. 잠시 후에 다시 이야기해줄 수 있을까..?"
            
            # 사용자 메시지는 저장
            try:
                user_msg = ChatMessage(
                    session_id=session_id,
                    sender_type="user",
                    content=user_message
                )
                self.db.add(user_msg)
                self.db.commit()
            except:
                pass
            
            return error_response
    
    def _generate_common_response(self, messages: list, user_message: str, **context) -> Tuple[str, Dict[str, int]]:
        """1단계: 공통 규칙으로 기본 답변 생성"""
        try:
            # 공통 규칙 프롬프트 로드
            common_rules = self.chained_prompt_manager.load_common_rules()
            
            # LLM에 보낼 메시지 구성
            llm_messages = []
            llm_messages.append(SystemMessage(content=f"""# 거북이상담소 AI 상담사 - 공통 답변 생성

{common_rules}

위 규칙에 따라 사용자의 메시지에 대해 기본적이고 중립적인 상담 답변을 생성해주세요.
이 답변은 나중에 각 페르소나의 특성에 맞게 변환될 예정입니다."""))
            
            # 대화 히스토리 추가 (최근 8개만)
            for msg in messages[-8:]:
                if msg.sender_type == "user":
                    llm_messages.append(HumanMessage(content=msg.content))
                else:
                    llm_messages.append(AIMessage(content=msg.content))
            
            # 현재 사용자 메시지 추가
            llm_messages.append(HumanMessage(content=user_message))
            
            # OpenAI API 호출
            response = self.llm.invoke(llm_messages)
            common_response = response.content
            
            # 토큰 사용량 계산
            tokens = self._calculate_tokens(llm_messages, common_response, response)
            
            return common_response, tokens
            
        except Exception as e:
            print(f"공통 답변 생성 오류: {e}")
            fallback_response = "죄송합니다. 지금 답변을 생성하는데 어려움이 있어요. 조금 더 구체적으로 말씀해주시겠어요?"
            return fallback_response, {'input': 0, 'output': 0}
    
    def _transform_to_persona(self, common_response: str, persona_type: str, user_message: str, **context) -> Tuple[str, Dict[str, int]]:
        """2단계: 공통 답변을 페르소나 특성에 맞게 변환"""
        try:
            # 페르소나 매핑
            persona_mapping = {
                "내면형": "nemyeon",
                "추진형": "chujin", 
                "관계형": "gwangye",
                "안정형": "anjeong",
                "쾌락형": "querock"
            }
            
            persona_key = persona_mapping.get(persona_type, "nemyeon")
            persona_prompt = self.chained_prompt_manager.load_persona_prompt(persona_key)
            
            # 변환용 프롬프트 구성
            transform_prompt = f"""# 페르소나 변환 시스템

다음은 당신의 페르소나 특성입니다:

{persona_prompt}

## 변환 작업
위의 페르소나 특성에 맞게 다음 기본 답변을 자연스럽게 변환해주세요:

**기본 답변:**
{common_response}

**사용자 메시지:**
{user_message}

페르소나의 말투, 성격, 상담 스타일을 반영하여 답변을 변환해주세요. 
답변의 핵심 내용과 의도는 유지하되, 표현 방식을 페르소나에 맞게 조정해주세요."""
            
            llm_messages = [
                SystemMessage(content=transform_prompt),
                HumanMessage(content="위 지침에 따라 답변을 변환해주세요.")
            ]
            
            # OpenAI API 호출
            response = self.llm.invoke(llm_messages)
            persona_response = response.content
            
            # 토큰 사용량 계산
            tokens = self._calculate_tokens(llm_messages, persona_response, response)
            
            return persona_response, tokens
            
        except Exception as e:
            print(f"페르소나 변환 오류: {e}")
            # 변환 실패 시 공통 답변 반환
            return common_response, {'input': 0, 'output': 0}
    
    def _calculate_tokens(self, llm_messages: list, response_content: str, response_obj) -> Dict[str, int]:
        """토큰 사용량 계산"""
        if hasattr(response_obj, 'response_metadata') and 'token_usage' in response_obj.response_metadata:
            token_usage = response_obj.response_metadata['token_usage']
            return {
                'input': token_usage.get('prompt_tokens', 0),
                'output': token_usage.get('completion_tokens', 0)
            }
        else:
            # 대략적인 토큰 계산 (1토큰 ≈ 4글자)
            all_text = " ".join([msg.content for msg in llm_messages if hasattr(msg, 'content')])
            estimated_input = len(all_text) // 4
            estimated_output = len(response_content) // 4
            return {
                'input': estimated_input,
                'output': estimated_output
            }

    def get_initial_greeting(self, persona_type: str = "내면형", user_analysis_result: dict = None) -> str:
        """페르소나별 초기 인사 메시지 반환 (그림 분석 결과 반영)"""
        # 기본 인사말
        base_greetings = {
            "내면형": "안녕... 나는 내면이야. 말보다 느낌이 먼저일 때, 조용한 마음으로 함께 있을 수 있다면 좋겠어.",
            "추진형": "저는 당신의 고민을 함께 해결해갈 추진이에요. 지금부터 가장 중요한 얘기를 해볼까요?",
            "관계형": "저는 당신의 고민을 함께 해결해갈 관계이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "안정형": "저는 당신을 안정시켜드릴 안정이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "쾌락형": "저는 당신의 고민을 함께 해결해갈 쾌락이에요. 지금부터 재밌는 얘기를 해볼까요?"
        }
        
        base_greeting = base_greetings.get(persona_type, base_greetings["내면형"])
        
        # 그림 분석 결과가 있으면 반영
        if user_analysis_result and 'keyword_personality_analysis' in user_analysis_result:
            analysis_type = user_analysis_result['keyword_personality_analysis']['predicted_personality']
            print(f"그림 분석 결과 반영: {analysis_type}")
            
            # 분석 결과에 따른 추가 메시지
            analysis_additions = {
                "추진형": " 그림에서 보니 당신은 목표를 향해 나아가는 힘이 있어 보이네요.",
                "관계형": " 그림에서 보니 당신은 사람들과의 관계를 소중히 여기는 것 같아요.",
                "안정형": " 그림에서 보니 당신은 안정적이고 차분한 성향을 가지고 계시네요.",
                "내면형": " 그림에서 보니 당신만의 깊은 내면세계가 느껴져요.",
                "쾌락형": " 그림에서 보니 당신은 즐거움과 활력이 넘치는 분이네요."
            }
            
            if analysis_type in analysis_additions:
                base_greeting += analysis_additions[analysis_type]
        
        return base_greeting
    
    def get_available_personas(self) -> list:
        """사용 가능한 페르소나 목록 반환"""
        return self.prompt_manager.get_available_personas()