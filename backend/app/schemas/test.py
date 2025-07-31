from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DrawingTestBase(BaseModel):
    """그림 테스트 기본 스키마"""
    user_id: int = Field(..., description="사용자 ID")
    image_url: Optional[str] = Field(None, max_length=2048, description="그림 이미지 URL")

class DrawingTestCreate(DrawingTestBase):
    """그림 테스트 생성 스키마"""
    pass

class DrawingTestUpdate(BaseModel):
    """그림 테스트 업데이트 스키마"""
    image_url: Optional[str] = Field(None, max_length=2048, description="그림 이미지 URL")

class DrawingTestResponse(DrawingTestBase):
    """그림 테스트 응답 스키마"""
    test_id: int = Field(..., description="테스트 ID")
    submitted_at: datetime = Field(..., description="제출 시간")
    
    model_config = {"from_attributes": True}

class DrawingTestResultBase(BaseModel):
    """그림 테스트 결과 기본 스키마"""
    test_id: int = Field(..., description="테스트 ID")
    persona_type: Optional[int] = Field(None, description="친구 타입 ID")
    summary_text: Optional[str] = Field(None, description="결과 요약")

class DrawingTestResultCreate(DrawingTestResultBase):
    """그림 테스트 결과 생성 스키마"""
    pass

class DrawingTestResultUpdate(BaseModel):
    """그림 테스트 결과 업데이트 스키마"""
    persona_type: Optional[int] = Field(None, description="친구 타입 ID")
    summary_text: Optional[str] = Field(None, description="결과 요약")

class DrawingTestResultResponse(DrawingTestResultBase):
    """그림 테스트 결과 응답 스키마"""
    result_id: int = Field(..., description="결과 ID")
    created_at: datetime = Field(..., description="생성 시간")
    
    model_config = {"from_attributes": True}

# class DrawingTestWithResultResponse(DrawingTestResponse):
#     """결과를 포함한 그림 테스트 응답 스키마"""
#     result: Optional[DrawingTestResultResponse] = Field(None, description="테스트 결과")