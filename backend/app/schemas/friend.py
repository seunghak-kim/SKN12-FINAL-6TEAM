from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PersonaBase(BaseModel):
    """페르소나/캐릭터 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=10, description="페르소나 이름")
    description: str = Field(..., min_length=1, description="페르소나 설명")
    is_active: bool = Field(default=True, description="활성화 상태")

class PersonaCreate(PersonaBase):
    """페르소나 생성 스키마"""
    pass

class PersonaUpdate(BaseModel):
    """페르소나 업데이트 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=10, description="페르소나 이름")
    description: Optional[str] = Field(None, min_length=1, description="페르소나 설명")
    is_active: Optional[bool] = Field(None, description="활성화 상태")

class PersonaResponse(PersonaBase):
    """페르소나 응답 스키마"""
    persona_id: int = Field(..., description="페르소나 ID")
    created_at: datetime = Field(..., description="생성 시간")
    
    model_config = {"from_attributes": True}