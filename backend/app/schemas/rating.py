from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class RatingBase(BaseModel):
    """평가 기본 스키마"""
    session_id: UUID = Field(..., description="세션 ID")
    user_id: int = Field(..., description="사용자 ID")
    rating: int = Field(..., ge=1, le=5, description="평점 (1-5)")
    comment: Optional[str] = Field(None, description="평가 코멘트")

class RatingCreate(RatingBase):
    """평가 생성 스키마"""
    pass

class RatingUpdate(BaseModel):
    """평가 업데이트 스키마"""
    rating: Optional[int] = Field(None, ge=1, le=5, description="평점 (1-5)")
    comment: Optional[str] = Field(None, description="평가 코멘트")

class RatingResponse(RatingBase):
    """평가 응답 스키마"""
    ratings_id: int = Field(..., description="평가 ID")
    created_at: datetime = Field(..., description="생성 시간")
    
    model_config = {"from_attributes": True}