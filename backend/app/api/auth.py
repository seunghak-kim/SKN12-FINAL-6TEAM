from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.auth_service import AuthService
from pydantic import BaseModel

router = APIRouter()
auth_service = AuthService()

# OAuth2 스키마 설정
from fastapi.security import HTTPBearer
oauth2_scheme = HTTPBearer()

# JWT 토큰에서 현재 사용자 정보를 추출하는 의존성
async def get_current_user(token = Depends(oauth2_scheme)) -> dict:
    """JWT 토큰에서 현재 사용자 정보를 추출합니다."""
    print(f"🔍 토큰 검증 시작 - 토큰: {token.credentials[:20]}..." if token and token.credentials else "❌ 토큰 없음")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.credentials:
        print("❌ 토큰이 제공되지 않음")
        raise credentials_exception
    
    payload = auth_service.verify_token(token.credentials)
    if payload is None:
        print("❌ 토큰 검증 실패")
        raise credentials_exception
        
    user_id = payload.get("sub")
    email = payload.get("email")
    print(f"📋 토큰에서 추출된 정보 - user_id: {user_id}, email: {email}")
    
    if user_id is None or email is None:
        print("❌ 토큰에서 필수 정보 누락")
        raise credentials_exception
        
    result = {"user_id": int(user_id), "email": email}
    print(f"✅ 토큰 검증 성공: {result}")
    return result

class GoogleCallbackRequest(BaseModel):
    code: str

class CheckNicknameRequest(BaseModel):
    nickname: str

class UpdateNicknameRequest(BaseModel):
    nickname: str

class GoogleTokenRequest(BaseModel):
    token: str

@router.post("/google")
async def google_login(
    request: GoogleTokenRequest,
    db: Session = Depends(get_db)
):
    """Google ID 토큰으로 로그인/회원가입"""
    try:
        print(f"🔄 Google 로그인 API 호출 - 토큰: {request.token[:50]}...")
        
        result = auth_service.google_login(db, request.token)
        if not result:
            print("❌ auth_service.google_login returned None")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        
        print(f"✅ auth_service 결과: {result}")
        
        # JWT 토큰 생성
        access_token = auth_service.create_access_token(
            data={"sub": str(result["user_id"]), "email": result.get("email", "unknown")}
        )
        print(f"🔑 JWT 토큰 생성 완료: {access_token[:20]}...")
        
        response_data = {
            "user": {
                "id": result["user_id"],
                "email": result.get("email", "unknown"),
                "google_id": result.get("google_id", "unknown"),
                "name": result.get("name", result["nickname"]),
                "profile_picture": result.get("picture"),
                "is_first_login": result["is_new_user"],
                "created_at": result.get("created_at", "2025-07-21T00:00:00Z"),
                "updated_at": result.get("created_at", "2025-07-21T00:00:00Z")
            },
            "access_token": access_token,
            "token_type": "bearer",
            "is_first_login": result["is_new_user"]
        }
        
        print(f"📤 API 응답 데이터: {response_data}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Google login API 오류: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google login failed: {str(e)}"
        )

@router.get("/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db)
):
    """Google OAuth 콜백 처리"""
    try:
        result = auth_service.handle_google_callback(db, code)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization code"
            )
        
        # JWT 토큰 생성
        access_token = auth_service.create_access_token(
            data={"sub": str(result.user_id), "email": "unknown"}
        )
        
        # 임시 세션 ID 생성하여 안전하게 토큰 전달
        import uuid
        session_id = str(uuid.uuid4())
        
        # 임시로 Redis나 메모리에 저장하는 대신 간단히 쿠키 사용
        from fastapi.responses import RedirectResponse
        
        response = RedirectResponse(
            url=f"http://localhost:3000/auth-callback?session={session_id}&is_new={str(result.is_new_user).lower()}"
        )
        
        # 쿠키에 토큰 저장 (HttpOnly, Secure 설정)
        response.set_cookie(
            key="auth_token",
            value=access_token,
            httponly=True,
            secure=False,  # 개발환경에서는 False
            samesite="lax",
            max_age=30 * 24 * 60 * 60  # 30일
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Callback processing failed: {str(e)}"
        )

@router.post("/verify-token")
async def verify_token(
    current_user: dict = Depends(get_current_user)
):
    """JWT 토큰 검증"""
    return {"valid": True, "user_id": current_user["user_id"], "email": current_user["email"]}

@router.get("/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 조회"""
    try:
        user_info = auth_service.get_user_by_id(db, current_user["user_id"])
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # 임시 닉네임인지 확인하여 first_login 판단
        is_first_login = user_info.nickname.startswith('temp_user_')
        
        return {
            "id": user_info.user_id,
            "email": current_user.get("email", "unknown"),
            "google_id": "unknown",  # 필요시 social_user에서 추출
            "name": user_info.nickname,
            "is_first_login": is_first_login,
            "created_at": user_info.created_at.isoformat() if user_info.created_at else None,
            "updated_at": user_info.created_at.isoformat() if user_info.created_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.post("/check-nickname")
async def check_nickname_availability(
    request: CheckNicknameRequest,
    db: Session = Depends(get_db)
):
    """닉네임 중복 검사"""
    try:
        is_available = auth_service.check_nickname_availability(db, request.nickname)
        return {"available": is_available, "nickname": request.nickname}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Nickname check failed: {str(e)}"
        )

@router.get("/get-token")
async def get_token_from_cookie(request: Request):
    """쿠키에서 토큰을 가져와 반환합니다."""
    try:
        token = request.cookies.get("auth_token")
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No auth token found in cookies"
            )
        
        # JWT 토큰에서 사용자 정보 추출
        payload = auth_service.verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user_id = payload.get("sub")
        
        return {
            "access_token": token,
            "user_id": int(user_id) if user_id else None,
            "token_type": "bearer"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get token: {str(e)}"
        )

@router.post("/complete-signup")
async def complete_signup(
    request: UpdateNicknameRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """회원가입 완료 (닉네임 설정)"""
    try:
        from ..schemas.user import UserUpdate
        
        # 닉네임 중복 확인
        is_available = auth_service.check_nickname_availability(db, request.nickname)
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 닉네임입니다."
            )
        
        user_update = UserUpdate(
            nickname=request.nickname
        )
        
        updated_user = auth_service.update_user(db, current_user["user_id"], user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        return {
            "message": "회원가입이 완료되었습니다.",
            "user_id": updated_user.user_id,
            "nickname": updated_user.nickname
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup completion failed: {str(e)}"
        )