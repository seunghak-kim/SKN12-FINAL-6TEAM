from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# 채팅 세션 스키마
class ChatSessionBase(BaseModel):
    session_name: Optional[str] = Field(None, max_length=255, description="세션 이름")
    user_id: int = Field(..., description="사용자 ID")
    persona_id: int = Field(..., description="페르소나 ID")

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSessionUpdate(BaseModel):
    session_name: Optional[str] = Field(None, max_length=255, description="세션 이름")
    is_active: Optional[bool] = Field(None, description="활성화 상태")

class ChatSessionResponse(ChatSessionBase):
    chat_sessions_id: UUID = Field(..., description="세션 ID")
    is_active: bool = Field(..., description="활성화 상태")
    created_at: datetime = Field(..., description="생성 시간")
    updated_at: datetime = Field(..., description="수정 시간")
    
    model_config = {"from_attributes": True}

# 채팅 메시지 스키마
class ChatMessageBase(BaseModel):
    content: str = Field(..., min_length=1, description="메시지 내용")

class ChatMessageCreate(ChatMessageBase):
    sender_type: str = Field(..., pattern="^(user|friend)$", description="발신자 타입")

class ChatMessageResponse(ChatMessageBase):
    chat_messages_id: UUID = Field(..., description="메시지 ID")
    session_id: UUID = Field(..., description="세션 ID")
    sender_type: str = Field(..., description="발신자 타입")
    created_at: datetime = Field(..., description="생성 시간")
    
    model_config = {"from_attributes": True}

# 채팅 세션 상세 정보 (메시지 포함)
class ChatSessionDetailResponse(ChatSessionResponse):
    messages: List[ChatMessageResponse] = Field(default=[], description="메시지 목록")

# 메시지 전송 요청
class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, description="메시지 내용")

# 메시지 전송 응답
class SendMessageResponse(BaseModel):
    user_message: ChatMessageResponse = Field(..., description="사용자 메시지")
    assistant_message: ChatMessageResponse = Field(..., description="AI 응답 메시지")
    session_updated: bool = Field(..., description="세션 업데이트 여부")


# # 에러 응답
# class ErrorResponse(BaseModel):
#     error: str = Field(..., description="에러 메시지")
#     detail: Optional[str] = Field(None, description="에러 상세")
#     code: Optional[int] = Field(None, description="에러 코드")