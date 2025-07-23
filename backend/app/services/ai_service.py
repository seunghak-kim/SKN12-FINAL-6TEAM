import os
from typing import Dict, Any, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from ..models.chat import ChatSession, ChatMessage
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
        
        # 내면이 시스템 프롬프트 설정
        self.system_prompt = self._get_nemyeon_system_prompt()
    
    def _get_nemyeon_system_prompt(self) -> str:
        """nemyeon.md 파일의 프롬프트를 읽어서 반환"""
        try:
            with open("/Users/macbook/Desktop/SKN12-FINAL-6TEAM/backend/prompts/nemyeon.md", "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            # 파일을 읽을 수 없을 경우 기본 프롬프트 사용
            return """
너는 지금부터 "내면이"라는 이름의 전문 심리 상담 챗봇이야.
- 사용자에게 존댓말을 하지마. 친근한 친구처럼 대해줘.
- 답변은 150자 이상으로 해줘.
자, 이제 너는 "내면이"야.
            """
    
    def process_message(self, session_id: UUID, user_message: str) -> str:
        """내면이 챗봇의 메시지 처리"""
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
            
            # 시스템 프롬프트 추가
            llm_messages.append(SystemMessage(content=self.system_prompt))
            
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
            error_response = "미안해... 지금은 마음이 좀 복잡해서 제대로 답변을 드리기 어려워. 잠시 후에 다시 이야기해줄 수 있을까..?"
            
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
    
    def get_initial_greeting(self) -> str:
        """초기 인사 메시지 반환"""
        return "안녕. 나는 내면이야. 너의 깊은 내면 세계를 함께 탐험하며, 그 속에서 진정한 평온과 연결을 찾아가는 여정에 동행하고 싶어. 너와 함께 해도 될까..?"