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
    
    def get_persona_prompt(self, persona_type: str = "내면형", **context) -> str:
        """페르소나별 시스템 프롬프트 생성"""
        return self.prompt_manager.get_persona_prompt(persona_type, **context)
    
    def process_message(self, session_id: UUID, user_message: str, persona_type: str = "내면형", **context) -> str:
        """페르소나 챗봇의 메시지 처리"""
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
            
            # LLM에 보낼 메시지 구성
            llm_messages = []
            
            # 페르소나별 시스템 프롬프트 생성 및 추가
            system_prompt = self.get_persona_prompt(persona_type, **context)
            llm_messages.append(SystemMessage(content=system_prompt))
            
            # 대화 히스토리 추가 (최근 10개만)
            for msg in messages[-10:]:
                if msg.sender_type == "user":
                    llm_messages.append(HumanMessage(content=msg.content))
                else:
                    llm_messages.append(AIMessage(content=msg.content))
            
            # 현재 사용자 메시지 추가
            llm_messages.append(HumanMessage(content=user_message))
            
            # OpenAI API 호출
            response = self.llm.invoke(llm_messages)
            ai_response = response.content
            
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
                content=ai_response
            )
            self.db.add(assistant_msg)
            self.db.commit()
            
            return ai_response
            
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
    
    def get_initial_greeting(self, persona_type: str = "내면형") -> str:
        """페르소나별 초기 인사 메시지 반환 (test_chat의 st.write와 동일)"""
        greetings = {
            "내면형": "안녕... 나는 내면이야. 말보다 느낌이 먼저일 때, 조용한 마음으로 함께 있을 수 있다면 좋겠어. 지금... 너와 함께해도 될까..?",
            "추진형": "저는 당신의 고민을 함께 해결해갈 추진이에요. 지금부터 가장 중요한 얘기를 해볼까요?",
            "관계형": "저는 당신의 고민을 함께 해결해갈 관계이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "안정형": "저는 당신을 안정시켜드릴 안정이에요. 지금부터 마음 속 고민을 얘기해볼까요?",
            "쾌락형": "저는 당신의 고민을 함께 해결해갈 쾌락이에요. 지금부터 재밌는 얘기를 해볼까요?"
        }
        return greetings.get(persona_type, greetings["내면형"])
    
    def get_available_personas(self) -> list:
        """사용 가능한 페르소나 목록 반환"""
        return self.prompt_manager.get_available_personas()