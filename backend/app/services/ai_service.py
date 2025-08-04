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
            
            # 히스토리 관리: 메시지가 10개 이상이면 요약 업데이트
            if len(messages) >= 10:
                session = self._manage_conversation_history(session, messages)
            
            # 1단계: 공통 답변 생성 (세션 정보 포함)
            common_response, tokens_step1 = self._generate_common_response(session, messages, user_message, **context)
            
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
    
    def _generate_common_response(self, session: ChatSession, messages: list, user_message: str, **context) -> Tuple[str, Dict[str, int]]:
        """1단계: 공통 규칙으로 기본 답변 생성"""
        try:
            # 공통 규칙 프롬프트 로드
            common_rules = self.chained_prompt_manager.load_common_rules()
            
            # 그림검사 분석 결과 컨텍스트 준비
            user_analysis_context = ""
            if context.get('user_analysis_result'):
                analysis_result = context['user_analysis_result']
                user_analysis_context = f"""

[사용자 그림검사 분석 정보]
이 사용자의 그림검사 분석 결과를 참고하여 더 개인화된 상담을 제공해주세요:
- 주요 심리 특성: {analysis_result.get('result_text', '분석 정보 없음')}
- 분석 요약: {analysis_result.get('raw_text', '')[:200]}...

위 정보를 바탕으로 사용자의 심리 상태와 성향을 고려한 답변을 생성해주세요."""
            
            # 대화 요약 컨텍스트 준비
            conversation_context = ""
            if session.conversation_summary:
                conversation_context = f"""

[과거 대화 요약]
{session.conversation_summary}

위 요약은 이전 대화의 핵심 내용입니다. 이를 참고하여 대화의 연속성을 유지해주세요."""
            
            # LLM에 보낼 메시지 구성
            llm_messages = []
            llm_messages.append(SystemMessage(content=f"""# 거북이상담소 AI 상담사 - 공통 답변 생성

{common_rules}{user_analysis_context}{conversation_context}

위 규칙에 따라 사용자의 메시지에 대해 기본적이고 중립적인 상담 답변을 생성해주세요.
이 답변은 나중에 각 페르소나의 특성에 맞게 변환될 예정입니다."""))
            
            # 대화 히스토리 추가 (최근 8개만)
            recent_messages = messages[-8:] if len(messages) > 8 else messages
            for msg in recent_messages:
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
        
        # 그림 분석 결과가 있으면 GPT-4o로 개인화된 인사 생성
        if user_analysis_result:
            try:
                return self._generate_personalized_greeting(persona_type, user_analysis_result)
            except Exception as e:
                print(f"개인화된 인사 생성 실패: {e}")
                # 실패시 기본 인사로 폴백
        
        # 기본 인사말 (폴백용)
        base_greetings = {
            "내면형": "안녕... 나는 내면이야. 말보다 느낌이 먼저일 때, 조용한 마음으로 함께 있을 수 있다면 좋겠어.",
            "추진형": "저는 당신의 고민을 함께 해결해갈 추진이에요. 지금부터 가장 중요한 얘기를 해볼까요?",
            "관계형": "저는 당신의 고민을 함께 해결해갈 관계이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "안정형": "저는 당신을 안정시켜드릴 안정이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "쾌락형": "저는 당신의 고민을 함께 해결해갈 쾌락이에요. 지금부터 재밌는 얘기를 해볼까요?"
        }
        
        return base_greetings.get(persona_type, base_greetings["내면형"])

    def _generate_personalized_greeting(self, persona_type: str, user_analysis_result: dict) -> str:
        """그림 분석 결과를 바탕으로 GPT-4o가 개인화된 첫 인사 생성"""
        
        # 페르소나별 기본 성격 설명
        persona_descriptions = {
            "내면형": "내면이: 감정과 사고의 깊은 바다를 탐험하는 조력자. 비관적 성향을 가지고 있으며 깊이 있는 통찰 제공",
            "추진형": "추진이: 목표 달성을 강력히 추진하는 전략가. 결과 지향적이고 효율성을 극대화하는 스타일",
            "관계형": "관계이: 사람들과의 관계와 소통을 중시하는 따뜻한 상담자",
            "안정형": "안정이: 중립과 조화를 지향하는 안전한 대화 파트너. 신중하고 부드러운 말투",
            "쾌락형": "쾌락이: 즐거움과 활력을 추구하는 반쯤 미친 에너지 넘치는 동반자"
        }
        
        # GPT-4o 프롬프트 구성
        prompt = f"""당신은 {persona_descriptions.get(persona_type, persona_descriptions['내면형'])}입니다.

사용자의 그림검사 분석 결과를 바탕으로 개인화된 첫 인사 메시지를 생성해주세요.

**그림 분석 결과:**
{user_analysis_result}

**요구사항:**
1. 위 분석 결과를 자연스럽게 반영하되, 분석 내용을 직접 언급하지 말고 은연중에 드러나도록 하세요
2. 해당 페르소나의 말투와 성격에 맞게 작성하세요
3. 따뜻하고 공감적인 톤으로 첫 인사를 건네세요
4. 150자 이내로 작성하세요
5. 사용자가 편안하게 대화를 시작할 수 있도록 유도하세요

첫 인사 메시지:"""

        # GPT-4o 호출
        from langchain.schema import HumanMessage
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        greeting = response.content.strip()
        
        print(f"[AI] 개인화된 인사 생성: {greeting}")
        return greeting
    
    def _manage_conversation_history(self, session: ChatSession, messages: list) -> ChatSession:
        """대화 히스토리 관리: 슬라이딩 윈도우 + 요약 방식"""
        try:
            # 최근 8개 메시지는 유지하고, 나머지는 요약에 포함
            recent_messages = messages[-8:]
            old_messages = messages[:-8]
            
            if old_messages:
                # 기존 요약과 오래된 메시지들을 합쳐서 새로운 요약 생성
                old_summary = session.conversation_summary or ""
                new_summary = self._generate_conversation_summary(old_summary, old_messages)
                
                # 세션에 요약 업데이트
                session.conversation_summary = new_summary
                self.db.add(session)
                self.db.flush()
                
                print(f"[히스토리] 대화 요약 업데이트: {len(old_messages)}개 메시지 요약됨")
                
        except Exception as e:
            print(f"대화 히스토리 관리 오류: {e}")
            
        return session
    
    def _generate_conversation_summary(self, existing_summary: str, messages: list) -> str:
        """과거 대화 내용을 요약 생성"""
        try:
            # 메시지들을 텍스트로 변환
            conversation_text = []
            for msg in messages:
                sender = "사용자" if msg.sender_type == "user" else "상담사"
                conversation_text.append(f"{sender}: {msg.content}")
            
            conversation_str = "\n".join(conversation_text)
            
            # 요약 프롬프트
            summary_prompt = f"""다음은 심리 상담 대화 내용입니다. 이를 간결하게 요약해주세요.

기존 요약 (있다면):
{existing_summary}

새로운 대화 내용:
{conversation_str}

요구사항:
1. 사용자의 주요 고민과 감정 상태를 중심으로 요약
2. 상담사가 제공한 주요 조언이나 통찰 포함  
3. 대화의 흐름과 중요한 전환점 기록
4. 200자 이내로 간결하게 작성
5. 기존 요약이 있다면 통합하여 작성

요약:"""

            # GPT로 요약 생성
            from langchain.schema import HumanMessage
            response = self.llm.invoke([HumanMessage(content=summary_prompt)])
            summary = response.content.strip()
            
            print(f"[요약] 생성된 대화 요약: {summary[:100]}...")
            return summary
            
        except Exception as e:
            print(f"대화 요약 생성 오류: {e}")
            # 실패 시 기존 요약 반환
            return existing_summary or "대화 요약 생성 실패"
    
    def get_available_personas(self) -> list:
        """사용 가능한 페르소나 목록 반환"""
        return self.prompt_manager.get_available_personas()