from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base

class Persona(Base):
    """페르소나/캐릭터 모델"""
    __tablename__ = "personas"
    
    persona_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(10), nullable=False)
    description = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # 관계 정의
    chat_sessions = relationship("ChatSession", back_populates="persona")
    drawing_test_results = relationship("DrawingTestResult", back_populates="persona")
    ratings = relationship("Rating", back_populates="persona")