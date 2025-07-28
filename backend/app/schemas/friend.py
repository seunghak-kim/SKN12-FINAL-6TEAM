from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FriendBase(BaseModel):
    """친구/캐릭터 기본 스키마"""
    friends_name: str = Field(..., min_length=1, max_length=10, description="친구 이름")
    friends_description: str = Field(..., min_length=1, description="친구 설명")
    tts_audio_url: Optional[str] = Field(None, max_length=2048, description="TTS 오디오 URL")
    tts_voice_type: Optional[int] = Field(None, description="TTS 음성 타입")
    is_active: bool = Field(default=True, description="활성화 상태")

class FriendCreate(FriendBase):
    """친구 생성 스키마"""
    pass

class FriendUpdate(BaseModel):
    """친구 업데이트 스키마"""
    friends_name: Optional[str] = Field(None, min_length=1, max_length=10, description="친구 이름")
    friends_description: Optional[str] = Field(None, min_length=1, description="친구 설명")
    tts_audio_url: Optional[str] = Field(None, max_length=2048, description="TTS 오디오 URL")
    tts_voice_type: Optional[int] = Field(None, description="TTS 음성 타입")
    is_active: Optional[bool] = Field(None, description="활성화 상태")

class FriendResponse(FriendBase):
    """친구 응답 스키마"""
    friends_id: int = Field(..., description="친구 ID")
    created_at: datetime = Field(..., description="생성 시간")
    
    model_config = {"from_attributes": True}