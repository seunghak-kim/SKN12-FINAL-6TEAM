from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base

class Friend(Base):
    """친구/캐릭터 모델"""
    __tablename__ = "friends"
    
    friends_id = Column(Integer, primary_key=True, autoincrement=True)
    friends_name = Column(String(10), nullable=False)
    friends_description = Column(Text, nullable=False)
    tts_audio_url = Column(String(2048))
    tts_voice_type = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # 관계 정의
    chat_sessions = relationship("ChatSession", back_populates="friend")
    drawing_test_results = relationship("DrawingTestResult", back_populates="friend")