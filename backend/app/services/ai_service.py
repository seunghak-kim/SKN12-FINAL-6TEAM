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
    
    def _process_drawing_analysis_for_querock(self, analysis_result: Dict[str, Any]) -> str:
        """쾌락이 특성에 맞게 그림검사 결과를 처리"""
        if not analysis_result.get('has_result'):
            return "아직 그림검사를 해보지 않으셨군요! 혹시 관심이 있으시다면, 당신의 내면세계를 더 깊이 탐험해볼 수 있는 재미있는 방법이 있어요."
        
        scores = analysis_result.get('personality_scores', {})
        querock_score = scores.get('쾌락이', 0.0)
        
        # 점수를 100으로 나누어 올바른 퍼센트 표시
        querock_percentage = querock_score / 100
        
        if querock_score > 0.7:
            return f"당신의 그림에서 보이는 창의적인 에너지가 정말 인상적이에요! 쾌락이 점수가 {querock_percentage:.2%}로 높게 나온 걸 보니, 새로운 경험을 추구하는 모험가의 마음이 강하시군요! 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
        elif querock_score > 0.4:
            return f"그림에서 다양한 색채와 형태를 사용하신 걸 보니, 새로운 경험을 추구하시는 분이시군요! 쾌락이 점수가 {querock_percentage:.2%}로 나타났어요. 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
        else:
            return f"그림에서 보이는 다른 성향들도 있지만, 그 이면에는 새로운 경험을 추구하는 모험가의 마음이 숨어있을지도 몰라요. 쾌락이 점수는 {querock_percentage:.2%}로 나타났어요. 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
    
    def _process_drawing_analysis_for_persona(self, analysis_result: Dict[str, Any], persona_type: str) -> str:
        """페르소나별로 그림검사 결과를 처리"""
        if not analysis_result.get('has_result'):
            return "아직 그림검사를 해보지 않으셨군요! 혹시 관심이 있으시다면, 당신의 내면세계를 더 깊이 탐험해볼 수 있는 재미있는 방법이 있어요."
        
        scores = analysis_result.get('personality_scores', {})
        
        # 페르소나별 특성에 맞는 해석
        persona_mapping = {
            "쾌락형": ("쾌락이", "창의적이고 새로운 경험을 추구하는"),
            "내면형": ("내면이", "깊이 있는 사고와 내적 성장을 중시하는"),
            "추진형": ("추진이", "목표 지향적이고 실행력이 뛰어난"),
            "관계형": ("관계이", "사람들과의 관계를 중시하는"),
            "안정형": ("안정이", "안정감과 균형을 추구하는")
        }
        
        target_persona, description = persona_mapping.get(persona_type, ("쾌락이", "창의적인"))
        target_score = scores.get(target_persona, 0.0)
        
        # 점수를 100으로 나누어 올바른 퍼센트 표시
        target_percentage = target_score / 100
        
        if target_score > 0.7:
            return f"당신의 그림에서 보이는 {description} 특성이 정말 인상적이에요! {target_persona} 점수가 {target_percentage:.2%}로 높게 나온 걸 보니, 이런 성향이 강하시군요! 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
        elif target_score > 0.4:
            return f"그림에서 {description} 면모가 보이시네요! {target_persona} 점수가 {target_percentage:.2%}로 나타났어요. 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
        else:
            return f"그림에서 보이는 다른 성향들도 있지만, 그 이면에는 {description} 마음이 숨어있을지도 몰라요. {target_persona} 점수는 {target_percentage:.2%}로 나타났어요. 더 자세한 분석이 궁금하시다면 마이페이지에서 검사결과를 확인해보세요."
    
    def _generate_drawing_context(self, analysis_result: Dict[str, Any], persona_type: str) -> str:
        """그림검사 결과를 컨텍스트로 변환"""
        if not analysis_result.get('has_result'):
            return """
[그림검사 정보]
아직 그림검사 결과가 없습니다. 사용자가 그림검사에 관심을 보이면 안내해주세요.
"""
        
        scores = analysis_result.get('personality_scores', {})
        summary = analysis_result.get('summary', '')
        
        # 페르소나별 특화된 해석
        if persona_type == "쾌락형":
            interpretation = self._process_drawing_analysis_for_querock(analysis_result)
        else:
            interpretation = self._process_drawing_analysis_for_persona(analysis_result, persona_type)
        
        return f"""
[그림검사 분석 결과]
{interpretation}

[상세 분석 정보]
- 분석 요약: {summary}
- 성격 점수: {', '.join([f'{k}: {(v/100):.2%}' for k, v in scores.items() if v > 0])}
- 주요 특성: {max(scores.items(), key=lambda x: x[1])[0] if scores else '분석 중'}

위 정보를 바탕으로 사용자의 심리 상태와 성향을 고려한 개인화된 상담을 제공해주세요.
"""
    
    def _detect_character_reference(self, user_message: str) -> Optional[str]:
        """사용자 메시지에서 다른 캐릭터에 대한 언급을 감지"""
        character_names = self.prompt_manager.get_all_character_names()
        
        for character in character_names:
            if character in user_message:
                return character
        return None
    
    def _get_character_context(self, current_persona: str, referenced_character: str) -> str:
        """참조된 캐릭터에 대한 컨텍스트 정보 생성"""
        character_info = self.prompt_manager.get_character_info(current_persona, referenced_character)
        
        if character_info:
            return f"""
## 캐릭터 상호작용 컨텍스트

사용자가 '{referenced_character}'에 대해 질문했습니다. 다음 정보를 바탕으로 답변해주세요:

{character_info}

**답변 가이드라인:**
- {referenced_character}의 특성과 말투를 정확히 설명해주세요
- 현재 당신({self.prompt_manager.persona_names.get(current_persona, '')})의 관점에서 {referenced_character}을 어떻게 보는지 포함해주세요
- {referenced_character}가 그런 특성을 가지게 된 이유나 배경을 에니어그램 관점에서 설명해주세요
- 따뜻하고 이해하기 쉽게 설명해주세요
"""
        return ""
    
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
            
            # 컨텍스트에 user_nickname 추가 (context에서 가져오거나 기본값 사용)
            user_nickname = context.get('user_nickname', '사용자')
            context_with_nickname = {**context, 'user_nickname': user_nickname}
            
            # 캐릭터 간 상호작용 감지
            referenced_character = self._detect_character_reference(user_message)
            if referenced_character:
                character_context = self._get_character_context(persona_type, referenced_character)
                context_with_nickname['character_interaction'] = character_context
            
            # 1단계: 공통 답변 생성 (세션 정보 포함)
            common_response, tokens_step1 = self._generate_common_response(session, messages, user_message, **context_with_nickname)
            
            # 2단계: 페르소나별 변환 (컨텍스트 전달)
            persona_response, tokens_step2 = self._transform_to_persona(common_response, persona_type, user_message, **context_with_nickname)
            
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
            
            # 사용자 닉네임 가져오기
            user_nickname = context.get('user_nickname', '사용자')
            
            # 그림검사 분석 결과 컨텍스트 준비
            user_analysis_context = ""
            if context.get('user_analysis_result'):
                analysis_result = context['user_analysis_result']
                # 새로운 상세 분석 결과 처리
                if isinstance(analysis_result, dict) and 'has_result' in analysis_result:
                    # 새로운 형식의 분석 결과
                    persona_type_for_analysis = context.get('persona_type_for_analysis', context.get('persona_type', '내면형'))
                    user_analysis_context = self._generate_drawing_context(analysis_result, persona_type_for_analysis)
                else:
                    # 기존 형식의 분석 결과 (호환성 유지)
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
            
            # 캐릭터 상호작용 컨텍스트 준비
            character_interaction_context = ""
            if 'character_interaction' in context and context['character_interaction']:
                character_interaction_context = f"""

{context['character_interaction']}

위 캐릭터 정보를 바탕으로 사용자의 질문에 답변해주세요."""
            
            # LLM에 보낼 메시지 구성
            llm_messages = []
            llm_messages.append(SystemMessage(content=f"""# 거북이상담소 AI 상담사 - 공통 답변 생성

{common_rules}{user_analysis_context}{conversation_context}{character_interaction_context}

## 호칭 규칙
답변할 때 다음 호칭 규칙을 반드시 따르세요:
- '사용자', '너', '당신', '귀하' 대신 '{user_nickname}' 사용

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
            
            # 공통 규칙도 함께 로드
            common_rules = self.chained_prompt_manager.load_common_rules()
            
            # 그림검사 분석 결과 컨텍스트 준비
            user_analysis_context = ""
            if context.get('user_analysis_result'):
                analysis_result = context['user_analysis_result']
                user_analysis_context = self._generate_drawing_context(analysis_result, persona_type)
            
            # 사용자 닉네임 가져오기
            user_nickname = context.get('user_nickname', '사용자')
            
            # 변환용 프롬프트 구성
            transform_prompt = f"""# 페르소나 변환 시스템

{common_rules}

다음은 당신의 페르소나 특성입니다:

{persona_prompt}{user_analysis_context}

## 호칭 규칙
답변할 때 다음 호칭 규칙을 반드시 따르세요:
- '사용자', '너', '당신', '귀하' 대신 '{user_nickname}님' 사용

## 변환 작업
위의 공통 규칙, 페르소나 특성, 그림분석 결과를 모두 반영하여 다음 기본 답변을 자연스럽게 변환해주세요:

**기본 답변:**
{common_response}

**사용자 메시지:**
{user_message}

페르소나의 말투, 성격, 상담 스타일을 반영하고, 사용자의 심리 특성도 고려하여 답변을 변환해주세요. 
답변의 핵심 내용과 의도는 유지하되, 표현 방식을 페르소나와 사용자에게 맞게 조정해주세요."""
            
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
        
        # 기본 인사는 프론트엔드에서 처리하므로 빈 문자열 반환
        return ""

    def _generate_personalized_greeting(self, persona_type: str, user_analysis_result, user_nickname: str = "사용자") -> str:
        """DB에서 가져온 그림 분석 결과를 바탕으로 GPT-4o가 개인화된 첫 인사 생성"""
        
        # DB 결과를 텍스트로 변환
        if user_analysis_result and hasattr(user_analysis_result, 'summary_text'):
            analysis_text = user_analysis_result.summary_text
            
            # 성격 유형 정보 추가
            persona_mapping = {
                1: "추진형",
                2: "내면형", 
                3: "관계형",
                4: "쾌락형",
                5: "안정형"
            }
            predicted_personality = persona_mapping.get(user_analysis_result.persona_type, "내면형")
            
            # 확률 정보 추가
            scores = {
                "추진형": float(user_analysis_result.dog_scores or 0.0),
                "내면형": float(user_analysis_result.cat_scores or 0.0),
                "관계형": float(user_analysis_result.rabbit_scores or 0.0),
                "쾌락형": float(user_analysis_result.bear_scores or 0.0),
                "안정형": float(user_analysis_result.turtle_scores or 0.0)
            }
            
            analysis_summary = f"""
그림 분석 결과:
- 분석된 성격 유형: {predicted_personality}
- 심리 분석: {analysis_text}
- 성격 점수 분포: {scores}
            """.strip()
        else:
            analysis_summary = "그림 분석 결과가 없습니다."
        
        # 공통 규칙 로드
        common_rules = self.chained_prompt_manager.load_common_rules()
        
        # 페르소나 매핑 및 프롬프트 로드
        persona_mapping_prompt = {
            "내면형": "nemyeon",
            "추진형": "chujin", 
            "관계형": "gwangye",
            "안정형": "anjeong",
            "쾌락형": "querock"
        }
        
        persona_key = persona_mapping_prompt.get(persona_type, "nemyeon")
        persona_prompt = self.chained_prompt_manager.load_persona_prompt(persona_key)
        
        # GPT-4o 프롬프트 구성
        prompt = f"""# 거북이상담소 AI 상담사 - 개인화된 첫 인사 생성

{common_rules}

{persona_prompt}

**중요한 말투 규칙:**
- 절대 존댓말을 사용하지 마세요 ("안녕하세요" 금지)
- 위의 페르소나 특성과 말투 규칙을 정확히 따라주세요

## 호칭 규칙
답변할 때 다음 호칭 규칙을 반드시 따르세요:
- '사용자', '너', '당신', '귀하' 대신 '{user_nickname}님' 사용
- 자연스럽고 친근한 톤으로 대화
- 예: "당신이 원하는..." → "{user_nickname}님이 원하시는..."

사용자의 그림검사 분석 결과를 바탕으로 개인화된 첫 인사 메시지를 생성해주세요.

**그림 분석 결과:**
{analysis_summary}

위 분석 결과를 자연스럽게 반영하되, 분석 내용을 직접 언급하지 말고 은연중에 드러나는 150자 이내의 첫 인사 메시지를 생성해주세요."""

        # GPT-4o 호출
        from langchain.schema import HumanMessage
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        greeting = response.content.strip()
        
        print(f"[AI] DB 기반 개인화된 인사 생성: {greeting}")
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
                print(f"[히스토리] 요약 내용: {new_summary}")
                
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