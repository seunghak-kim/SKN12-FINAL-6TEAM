from sqlalchemy import Column, Text, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base

class Rating(Base):
    """평가 모델"""
    __tablename__ = "ratings"
    
    ratings_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.chat_sessions_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('user_informations.user_id', ondelete='CASCADE'), nullable=False)
    persona_id = Column(Integer, ForeignKey('personas.persona_id'), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # 관계 정의
    session = relationship("ChatSession", back_populates="rating")
    user_information = relationship("UserInformation", back_populates="ratings")
    persona = relationship("Persona", back_populates="ratings")