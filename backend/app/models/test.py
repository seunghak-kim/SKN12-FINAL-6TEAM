from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, JSON, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base

class DrawingTest(Base):
    """그림 테스트 모델"""
    __tablename__ = "drawing_tests"
    
    test_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_informations.user_id'), nullable=False)
    image_url = Column(String(2048))
    submitted_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # 관계 정의
    user_information = relationship("UserInformation", back_populates="drawing_tests")
    result = relationship("DrawingTestResult", back_populates="test", uselist=False)

class DrawingTestResult(Base):
    """그림 테스트 결과 모델"""
    __tablename__ = "drawing_test_results"
    
    result_id = Column(Integer, primary_key=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey('drawing_tests.test_id'), unique=True, nullable=False)
    persona_type = Column(Integer, ForeignKey('personas.persona_id'))
    summary_text = Column(Text)
    dog_scores = Column(DECIMAL(5,2))
    cat_scores = Column(DECIMAL(5,2))
    rabbit_scores = Column(DECIMAL(5,2))
    bear_scores = Column(DECIMAL(5,2))
    turtle_scores = Column(DECIMAL(5,2))
    thumbs_up = Column(Integer)
    thumbs_down = Column(Integer)
    created_at = Column(DateTime, nullable=False)
    
    # 관계 정의
    test = relationship("DrawingTest", back_populates="result")
    persona = relationship("Persona", back_populates="drawing_test_results")