from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AgreementBase(BaseModel):
    """약관 동의 기본 스키마"""
    user_id: int = Field(..., description="사용자 ID")
    is_agree: bool = Field(default=False, description="동의 여부")

class AgreementCreate(AgreementBase):
    """약관 동의 생성 스키마"""
    pass

class AgreementUpdate(BaseModel):
    """약관 동의 업데이트 스키마"""
    is_agree: Optional[bool] = Field(None, description="동의 여부")

class AgreementResponse(AgreementBase):
    """약관 동의 응답 스키마"""
    agreement_id: int = Field(..., description="약관 동의 ID")
    agreed_at: datetime = Field(..., description="동의 시간")
    
    model_config = {"from_attributes": True}