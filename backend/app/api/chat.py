from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from ..services.ai_service import AIService
from ..schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionDetailResponse,
    SendMessageRequest,
    SendMessageResponse,
    ChatMessageResponse
)
from ..models.chat import ChatSession, ChatMessage
from ..models.user import UserInformation
from ..models.friend import Friend

router = APIRouter()

def get_persona_type_from_friends_id(friends_id: int, db: Session = None) -> str:
    """friends_id를 페르소나 타입으로 매핑 (DB 동적 조회 + 기본값)"""
    # DB에서 실제 friends 데이터 조회 시도
    if db:
        try:
            friend = db.query(Friend).filter(Friend.friends_id == friends_id).first()
            if friend and friend.friends_name:
                return friend.friends_name
        except Exception as e:
            print(f"DB 조회 실패, 기본값 사용: {e}")
    
    # DB 조회 실패 시 기본 매핑 사용 (실제 DB 상황에 맞게 수정)
    default_mapping = {
        1: "추진형",  # 추진이
        2: "내면형",  # 내면이  
        3: "관계형",  # 관계이
        4: "쾌락형",  # 쾌락이
        5: "안정형"   # 안정이
    }
    return default_mapping.get(friends_id, "내면형")

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    session_data: ChatSessionCreate,
    db: Session = Depends(get_db)
):
    """새 채팅 세션 생성"""
    try:
        # 사용자 존재 확인
        user = db.query(UserInformation).filter(UserInformation.user_id == session_data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 친구 존재 확인
        friend = db.query(Friend).filter(Friend.friends_id == session_data.friends_id).first()
        if not friend:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="친구를 찾을 수 없습니다."
            )
        
        # 새 세션 생성
        new_session = ChatSession(
            user_id=session_data.user_id,
            friends_id=session_data.friends_id,
            session_name=session_data.session_name or f"{user.nickname}와 {friend.friends_name}의 대화",
            is_active=True
        )
        
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        return ChatSessionResponse(
            chat_sessions_id=new_session.chat_sessions_id,
            user_id=new_session.user_id,
            friends_id=new_session.friends_id,
            session_name=new_session.session_name,
            is_active=new_session.is_active,
            created_at=new_session.created_at,
            updated_at=new_session.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_user_sessions(
    user_id: int,
    db: Session = Depends(get_db)
):
    """사용자의 메시지가 있는 채팅 세션 목록 조회"""
    try:
        # 메시지가 최소 1개 이상 있는 세션만 조회
        sessions = db.query(ChatSession).filter(
            ChatSession.user_id == user_id,
            ChatSession.is_active == True
        ).join(ChatMessage, ChatSession.chat_sessions_id == ChatMessage.session_id).distinct().order_by(ChatSession.created_at.desc()).all()
        
        return [
            ChatSessionResponse(
                chat_sessions_id=session.chat_sessions_id,
                user_id=session.user_id,
                friends_id=session.friends_id,
                session_name=session.session_name,
                is_active=session.is_active,
                created_at=session.created_at,
                updated_at=session.updated_at
            )
            for session in sessions
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
async def get_session_detail(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """특정 채팅 세션 상세 조회 (메시지 포함)"""
    try:
        session = db.query(ChatSession).filter(
            ChatSession.chat_sessions_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="세션을 찾을 수 없습니다."
            )
        
        # 세션의 메시지들 조회
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        message_responses = [
            ChatMessageResponse(
                chat_messages_id=msg.chat_messages_id,
                session_id=msg.session_id,
                sender_type=msg.sender_type,
                content=msg.content,
                created_at=msg.created_at
            )
            for msg in messages
        ]
        
        return ChatSessionDetailResponse(
            chat_sessions_id=session.chat_sessions_id,
            user_id=session.user_id,
            friends_id=session.friends_id,
            session_name=session.session_name,
            is_active=session.is_active,
            created_at=session.created_at,
            updated_at=session.updated_at,
            messages=message_responses
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 상세 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(
    session_id: UUID,
    message_request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """메시지 전송 및 AI 응답 생성"""
    try:
        # 세션 존재 확인
        session = db.query(ChatSession).filter(
            ChatSession.chat_sessions_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="세션을 찾을 수 없습니다."
            )
        
        if not session.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="비활성화된 세션입니다."
            )
        
        # friends_id를 페르소나 타입으로 매핑
        persona_type = get_persona_type_from_friends_id(session.friends_id, db)
        
        # AI 서비스를 통한 메시지 처리 (페르소나 타입 포함)
        ai_service = AIService(db)
        ai_response_content = ai_service.process_message(
            session_id=session_id, 
            user_message=message_request.content,
            persona_type=persona_type
        )
        
        # AI 서비스에서 이미 메시지를 저장했으므로 최근 메시지들을 다시 가져옴
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.desc()).limit(2).all()
        
        # 가장 최근의 사용자 메시지와 AI 응답 메시지
        assistant_message = recent_messages[0]  # 가장 최근 (AI 응답)
        user_message = recent_messages[1]  # 그 다음 최근 (사용자 메시지)
        
        return SendMessageResponse(
            user_message=ChatMessageResponse(
                chat_messages_id=user_message.chat_messages_id,
                session_id=user_message.session_id,
                sender_type=user_message.sender_type,
                content=user_message.content,
                created_at=user_message.created_at
            ),
            assistant_message=ChatMessageResponse(
                chat_messages_id=assistant_message.chat_messages_id,
                session_id=assistant_message.session_id,
                sender_type=assistant_message.sender_type,
                content=assistant_message.content,
                created_at=assistant_message.created_at
            ),
            session_updated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"메시지 전송 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """세션 삭제 (비활성화)"""
    try:
        session = db.query(ChatSession).filter(
            ChatSession.chat_sessions_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="세션을 찾을 수 없습니다."
            )
        
        session.is_active = False
        db.commit()
        
        return {"message": "세션이 성공적으로 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """세션의 모든 메시지 조회"""
    try:
        # 세션 존재 확인
        session = db.query(ChatSession).filter(
            ChatSession.chat_sessions_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="세션을 찾을 수 없습니다."
            )
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        return [
            ChatMessageResponse(
                chat_messages_id=msg.chat_messages_id,
                session_id=msg.session_id,
                sender_type=msg.sender_type,
                content=msg.content,
                created_at=msg.created_at
            )
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"메시지 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/sessions/{session_id}/greeting", response_model=dict)
async def get_initial_greeting(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """세션의 페르소나별 초기 인사 메시지 조회"""
    try:
        # 세션 존재 확인
        session = db.query(ChatSession).filter(
            ChatSession.chat_sessions_id == session_id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="세션을 찾을 수 없습니다."
            )
        
        # friends_id를 페르소나 타입으로 매핑
        persona_type = get_persona_type_from_friends_id(session.friends_id, db)
        
        # AI 서비스에서 페르소나별 인사 메시지 가져오기
        ai_service = AIService(db)
        
        # 그림 분석 결과 로드
        try:
            from prompt_chaining import load_latest_analysis_result
            user_analysis_result = load_latest_analysis_result()
        except Exception as e:
            print(f"그림 분석 결과 로드 실패: {e}")
            user_analysis_result = None
        
        greeting = ai_service.get_initial_greeting(persona_type, user_analysis_result)
        
        return {
            "persona_type": persona_type,
            "friends_id": session.friends_id,
            "greeting": greeting
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"인사 메시지 조회 중 오류가 발생했습니다: {str(e)}"
        )