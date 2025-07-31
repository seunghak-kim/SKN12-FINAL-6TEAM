from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base
import uuid

class ChatSession(Base):
    """채팅 세션 모델"""
    __tablename__ = "chat_sessions"
    
    chat_sessions_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('user_informations.user_id', ondelete='CASCADE'))
    persona_id = Column(Integer, ForeignKey('personas.persona_id'))
    session_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now())
    
    # 관계 정의
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    user_information = relationship("UserInformation", back_populates="chat_sessions")
    friend = relationship("Persona", back_populates="chat_sessions")
    rating = relationship("Rating", back_populates="session", uselist=False)

class ChatMessage(Base):
    """채팅 메시지 모델"""
    __tablename__ = "chat_messages"
    
    chat_messages_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.chat_sessions_id', ondelete='CASCADE'))
    sender_type = Column(String(20), nullable=False)  # 'user' or 'friend'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # 관계 정의
    session = relationship("ChatSession", back_populates="messages")