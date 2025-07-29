from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone

Base = declarative_base()

class SocialUser(Base):
    """소셜 로그인 사용자 테이블"""
    __tablename__ = "social_users"
    
    social_user_id = Column(Integer, primary_key=True, autoincrement=True) #기본 값 
    social_id = Column(String(255), unique=True, nullable=False) # 소설 로그인에서 제공해주는 ID 
    
    # 관계 정의 - social_users -> user_informations
    user_information = relationship("UserInformation", back_populates="social_user")
    
    def __repr__(self):
        return f"<SocialUser(social_user_id={self.social_user_id}, social_id='{self.social_id}')>"

class User(Base):
    """일반 사용자 테이블"""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    user_password = Column(String(255), nullable=False)  # bcrypt 해시 길이 고려
    
    # 관계 정의 - users -> user_informations
    user_information = relationship("UserInformation", back_populates="user")
    
    def __repr__(self):
        return f"<User(user_id={self.user_id})>"

class UserInformation(Base):
    """사용자 정보 테이블"""
    __tablename__ = "user_informations"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    # email = Column(String(255), unique=True) 추후 사용시 씀 
    nickname = Column(String(20), nullable=False)
    status = Column(String(10), nullable=False, default='ACTIVE') # ACTIVE, INACTIVE, DELETE 
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    deleted_at = Column(DateTime)
    
    # Foreign Key 관계
    social_user_id = Column(Integer, ForeignKey('social_users.social_user_id', ondelete='CASCADE'))
    regular_user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'))
    
    # 관계 정의
    social_user = relationship("SocialUser", back_populates="user_information")
    user = relationship("User", back_populates="user_information")
    
    # 다른 테이블과의 관계 (cascade delete)
    chat_sessions = relationship("ChatSession", back_populates="user_information", cascade="all, delete-orphan")
    drawing_tests = relationship("DrawingTest", back_populates="user_information", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="user_information", cascade="all, delete-orphan")
    agreements = relationship("Agreement", back_populates="user_information", cascade="all, delete-orphan")
    
    def __repr__(self):
        email_value = getattr(self, 'email', None) or 'None'
        return f"<UserInformation(user_id={self.user_id}, email='{email_value}', nickname='{self.nickname}')>"