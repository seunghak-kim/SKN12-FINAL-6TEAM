from sqlalchemy import Column, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base

class Agreement(Base):
    """약관 동의 모델"""
    __tablename__ = "agreements"
    
    agreement_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_informations.user_id'), nullable=False)
    is_agree = Column(Boolean, default=False)
    agreed_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # 관계 정의
    user_information = relationship("UserInformation", back_populates="agreements")