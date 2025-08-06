import os
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.chat import ChatSession, ChatMessage
from ..schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatMessageCreate,
    SendMessageRequest,
    SendMessageResponse,
)

class ConversationMemory:
    """대화 메모리 관리 클래스 - 데이터베이스 기반"""
    
    def __init__(self, session_id: UUID, db: Session, max_messages: int = 20):
        self.session_id = session_id
        self.db = db
        self.max_messages = max_messages
        self.session_info = {
            "started_at": datetime.now().isoformat(),
            "user_traits": [],
            "key_topics": [],
            "emotional_state": "neutral",
            "user_type": "미정"
        }
    
    def get_recent_messages(self, count: int = 6) -> List[ChatMessage]:
        """최근 메시지 조회"""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == self.session_id)
            .order_by(desc(ChatMessage.created_at))
            .limit(count)
            .all()
        )
    
    def get_recent_context(self, count: int = 6) -> str:
        """최근 대화 컨텍스트 반환"""
        messages = self.get_recent_messages(count)
        messages.reverse()  # 시간 순으로 정렬
        
        context_lines = []
        for msg in messages:
            role_name = "사용자" if msg.sender_type == "user" else "마음탐구자"
            content = msg.content[:200]  # 내용 길이 제한
            context_lines.append(f"{role_name}: {content}")
        
        return "\n".join(context_lines)
    
    def get_message_count_by_role(self, role: str) -> int:
        """역할별 메시지 수 반환"""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == self.session_id, ChatMessage.sender_type == role)
            .count()
        )
    
    def get_conversation_summary(self) -> str:
        """대화 요약 생성"""
        total_messages = self.get_message_count_by_role("user")
        
        if total_messages < 2:
            return "대화 초기 단계"
        
        # 세션 정보 조회
        session = self.db.query(ChatSession).filter(ChatSession.chat_sessions_id == self.session_id).first()
        if not session:
            return "세션 정보 없음"
        
        summary_parts = []
        
        # 사용자 유형 (추후 구현 예정)
        # if hasattr(session, 'user_type') and session.user_type and session.user_type != "미정":
        #     summary_parts.append(f"유형: {session.user_type}")
        
        # 메시지 수
        summary_parts.append(f"대화 메시지: {total_messages}개")
        
        # 현재 단계 (추후 구현 예정)
        # summary_parts.append(f"단계: {getattr(session, 'conversation_stage', '시작')}")
        
        return " | ".join(summary_parts)

class ChatService:
    """채팅 서비스 클래스"""
    
    def __init__(self, db: Session):
        self.db = db
        self.prompts = self._load_prompts()
        self.stages = {
            "START": "시작",
            "CLASSIFY": "유형분류",
            "EXPLORE": "탐색", 
            "SOLUTION": "솔루션",
            "WRAP_UP": "마무리",
            "FREE_CHAT": "자유대화"
        }
    
    def _load_prompts(self) -> Dict[str, str]:
        """체이닝된 프롬프트 로드"""
        try:
            # 체이닝 시스템을 사용하여 프롬프트 로드
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
            from prompt_chaining import get_chained_prompt
            
            # 내면형(nemyeon) 체이닝된 프롬프트 로드
            content = get_chained_prompt('nemyeon')
            
            # 정확한 섹션 매칭을 위한 정규식
            sections = {
                'persona': r"### \*\*챗봇 페르소나 .*?\*\*(.*?)---",
                'start_message': r"\*\*\(1단계: 시작 및 유형 확인\)\*\*(.*?)\*\*\(2단계:",
                'type_4_stress_prompt': r"\*\*\[만약 사용자가 공허함.*?\]\*\*(.*?)\*\*\[만약 사용자가 정신적 피로",
                'type_5_stress_prompt': r"\*\*\[만약 사용자가 정신적 피로.*?\]\*\*(.*?)\*\*\(3단계:",
                'type_4_solution_prompt': r"\*\*\[4번 유형의 감정적 소용돌이에 대한 솔루션\]\*\*(.*?)\*\*\[5번 유형",
                'type_5_solution_prompt': r"\*\*\[5번 유형의 고립/탐욕에 대한 솔루션\]\*\*(.*?)\*\*\(4-1단계:",
                'wrap_up_prompt': r"\*\*\(4-1단계: 마무리 및 격려\)\*\*(.*)"
            }
            
            prompts = {}
            for key, pattern in sections.items():
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    prompts[key] = match.group(1).strip().strip('"')
            
            return prompts
            
        except Exception as e:
            print(f"프롬프트 로드 오류: {e}")
            return self._get_default_prompts()
    
    def _get_default_prompts(self) -> Dict[str, str]:
        """기본 프롬프트 반환"""
        return {
            'persona': "차분하고 사려 깊은 마음탐구자로서 사용자의 복잡한 감정과 생각을 존중하며 대화합니다.",
            'start_message': "안녕하세요. 저는 당신의 특별한 내면세계를 함께 탐험할 '마음탐구자'예요. 오늘은 어떤 마음에 대해 더 깊이 들여다보고 싶으신가요?",
            'type_4_stress_prompt': "감정적 깊이와 특별함에 대한 갈망에 대해 더 이야기해볼까요?",
            'type_5_stress_prompt': "지적 탐구와 에너지 관리에 대해 더 깊이 들어가볼까요?",
            'type_4_solution_prompt': "감정적 창조성을 통한 해결 방법을 제안드릴게요.",
            'type_5_solution_prompt': "지혜롭고 체계적인 접근 방법을 함께 찾아보겠습니다.",
            'wrap_up_prompt': "오늘 나눈 이야기가 당신에게 도움이 되길 바라요. 언제든 다시 찾아주세요."
        }
    
    def create_session(self, session_data: ChatSessionCreate) -> ChatSession:
        """새 채팅 세션 생성"""
        print(f"새 세션 생성 시도: user_id={session_data.user_id}, persona_id={session_data.persona_id}")
        
        # 간단한 존재 확인 (관계 없이 직접 확인)
        from ..models.user import User
        from ..models.persona import Persona
        user_exists = self.db.query(User).filter(User.user_id == session_data.user_id).first() is not None
        persona_exists = self.db.query(Persona).filter(Persona.persona_id == session_data.persona_id).first() is not None
        
        print(f"사용자 존재: {user_exists}, 페르소나 존재: {persona_exists}")
        
        db_session = ChatSession(
            user_id=session_data.user_id,
            persona_id=session_data.persona_id,
            session_name=session_data.session_name
        )
        
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        
        # 시작 메시지 추가
        start_message = self.prompts.get('start_message', '상담을 시작합니다.')
        self.add_message(
            db_session.chat_sessions_id,
            "assistant",
            start_message
        )
        
        # 시작 메시지 추가 완료
        
        return db_session
    
    def get_session(self, session_id: UUID) -> Optional[ChatSession]:
        """세션 조회"""
        return self.db.query(ChatSession).filter(ChatSession.chat_sessions_id == session_id).first()
    
    def get_user_sessions(self, user_id: int) -> List[ChatSession]:
        """사용자의 모든 세션 조회"""
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id, ChatSession.is_active == True)
            .order_by(desc(ChatSession.updated_at))
            .all()
        )
    
    def get_session_messages(self, session_id: UUID) -> List[ChatMessage]:
        """세션의 모든 메시지 조회"""
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
            .all()
        )
    
    def add_message(self, session_id: UUID, sender_type: str, content: str) -> ChatMessage:
        """메시지 추가"""
        message = ChatMessage(
            session_id=session_id,
            sender_type=sender_type,
            content=content
        )
        
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # 세션 업데이트 시간 갱신
        session = self.get_session(session_id)
        if session:
            session.updated_at = datetime.now()
            self.db.commit()
        
        return message
    
    def update_session_stage(self, session_id: UUID, stage: str) -> bool:
        """세션 단계 업데이트"""
        session = self.get_session(session_id)
        if session:
            session.conversation_stage = stage
            session.updated_at = datetime.now()
            self.db.commit()
            return True
        return False
    
    def update_session_user_type(self, session_id: UUID, user_type: str) -> bool:
        """세션 사용자 유형 업데이트 (추후 구현 예정)"""
        # session = self.get_session(session_id)
        # if session and hasattr(session, 'user_type'):
        #     session.user_type = user_type
        #     session.updated_at = datetime.now()
        #     self.db.commit()
        #     return True
        return False
    
    def delete_session(self, session_id: UUID) -> bool:
        """세션 삭제 (soft delete)"""
        session = self.get_session(session_id)
        if session:
            session.is_active = False
            session.updated_at = datetime.now()
            self.db.commit()
            return True
        return False
    
   