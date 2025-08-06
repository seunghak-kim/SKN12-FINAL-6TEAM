from pydantic import BaseModel, EmailStr, Field, field_validator, ValidationInfo
from datetime import datetime
from typing import Optional, List
from enum import Enum
import re

# 에러 메시지 상수
class ErrorMessages:
    INVALID_NICKNAME = '닉네임은 한글, 영문, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.'
    INVALID_PASSWORD = '비밀번호는 최소 8자리 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'
    PASSWORD_REQUIRED = '일반 사용자는 비밀번호가 필요합니다.'
    PASSWORD_MISMATCH = '새 비밀번호가 일치하지 않습니다.'

# 유효성 검증 유틸리티
class ValidationUtils:
    @staticmethod
    def validate_password(password: str) -> bool:
        """비밀번호 복잡성 검증"""
        pattern = r'^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
        return re.match(pattern, password) is not None
    
    @staticmethod
    def validate_nickname(nickname: str) -> bool:
        """닉네임 패턴 검증"""
        pattern = r'^[a-zA-Z0-9가-힣_-]+$'
        return re.match(pattern, nickname) is not None

# 공통 속성을 정의하는 기본 스키마 
class UserType(str, Enum):
    """사용자 유형 enum"""
    REGULAR = "REGULAR"
    SOCIAL = "SOCIAL"

# 유저 회원 탈퇴시 필요한 부분
class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"

# 소셜로그인 구분자 
class SocialProvider(str, Enum):
    GOOGLE = "GOOGLE"
    KAKAO = "KAKAO"
    NAVER = "NAVER"
    GITHUB = 'GITHUB'

# 성별 구분 
class Gender(str, Enum):
    M = "M"
    F = "F"

# Base 스키마들
class UserBase(BaseModel):
    """사용자 기본 스키마"""
    nickname: str = Field(..., min_length=2, max_length=20, description="사용자 닉네임")
    user_type: UserType = Field(default=UserType.REGULAR, description="사용자 타입")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="사용자 상태")
    
    model_config = {"from_attributes": True}
    
    @field_validator('nickname')
    def validate_nickname(cls, v):
        if not ValidationUtils.validate_nickname(v):
            raise ValueError(ErrorMessages.INVALID_NICKNAME)
        return v

class SocialLoginBase(BaseModel):
    provider: SocialProvider = Field(..., description="소셜 로그인 제공자")
    social_id: str = Field(..., min_length=1, max_length=255, description="소셜 로그인 ID")
    
    
# 생성용 스키마들 
class UserCreate(UserBase):
    user_password: Optional[str] = Field(None, min_length=8, max_length=255, description="사용자 비밀번호")
    
    @field_validator('user_password')
    def validate_password(cls, v, info: ValidationInfo):
        if hasattr(info, 'data') and info.data.get('user_type') == UserType.REGULAR and not v:
            raise ValueError(ErrorMessages.PASSWORD_REQUIRED)
        
        if v and not ValidationUtils.validate_password(v):
            raise ValueError(ErrorMessages.INVALID_PASSWORD)
        return v 
    
# 토큰 관련 스키마 
class Token(BaseModel):
    access_token: str = Field(..., description="액세스 토큰")
    token_type: str = Field(default='bearer', description="토큰 타입")
    expires_in: int = Field(..., description="토큰 만료 시간(초)") 
    
class TokenData(BaseModel):
    user_id: Optional[int] = Field(None, description="사용자 ID")
    email: Optional[EmailStr] = Field(None, description="사용자 이메일")

# 비밀번호 변경 스키마 
class PasswordChange(BaseModel):
    current_password: str = Field(..., description="현재 비밀번호")
    new_password: str = Field(..., min_length=8, max_length=255, description="새 비밀번호")
    new_password_confirm: str = Field(..., description="새 비밀번호 확인")
    
    @field_validator('new_password')
    def validate_new_password(cls, v):
        if not ValidationUtils.validate_password(v):
            raise ValueError(ErrorMessages.INVALID_PASSWORD)
        return v
    
    @field_validator('new_password_confirm')
    def passwords_match(cls, v, info: ValidationInfo):
        if hasattr(info, 'data') and 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError(ErrorMessages.PASSWORD_MISMATCH)
        return v

# 응답용 스키마들
class UserResponse(UserBase):
    user_id: int = Field(..., description="사용자 ID")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="수정 시간")

    class Config:
        from_attributes = True

class SocialLoginResponse(BaseModel):
    user_id: int = Field(..., description="사용자 ID")
    nickname: str = Field(..., description="사용자 닉네임")
    is_new_user: bool = Field(..., description="신규 사용자 여부")    

# 로그인 용 스키마 
class UserLogin(BaseModel):
    id: str = Field(..., description="사용자 ID 또는 이메일")
    password: str = Field(..., description="비밀번호") 
    

# 업데이트용 스키마들
class UserUpdate(BaseModel):
    nickname: Optional[str] = Field(None, min_length=2, max_length=20, description="사용자 닉네임")
    user_password: Optional[str] = Field(None, min_length=8, max_length=255, description="사용자 비밀번호")
    
    @field_validator('nickname')
    def validate_nickname(cls, v):
        if v and not ValidationUtils.validate_nickname(v):
            raise ValueError(ErrorMessages.INVALID_NICKNAME)
        return v
    
    @field_validator('user_password')
    def validate_password(cls, v):
        if v and not ValidationUtils.validate_password(v):
            raise ValueError(ErrorMessages.INVALID_PASSWORD)
        return v

# 사용자 목록 조회용 스키마
class UserListResponse(BaseModel):
    users: List[UserResponse] = Field(..., description="사용자 목록")
    total: int = Field(..., description="전체 사용자 수")
    page: int = Field(..., description="현재 페이지")
    size: int = Field(..., description="페이지 크기")
    total_pages: int = Field(..., description="전체 페이지 수")
    
    class Config:
        from_attributes = True