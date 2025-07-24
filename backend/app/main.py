from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from dotenv import load_dotenv

from .api.chat import router as chat_router
from .api.auth import router as auth_router
from .api.user import router as user_router
from .api.friend import router as friend_router
from .api.test import router as test_router
from .api.rating import router as rating_router
from .api.agreement import router as agreement_router
from .api.admin import router as admin_router
from .database import create_tables

# 환경 변수 로드
load_dotenv()

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="Care Chat API",
    description="심리 상담 챗봇 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서만 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 설정
# result/images 디렉토리가 없으면 생성
import os
if not os.path.exists("result/images"):
    os.makedirs("result/images")
    
app.mount("/images", StaticFiles(directory="result/images"), name="images")

# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(user_router, prefix="/users", tags=["users"])
app.include_router(friend_router, prefix="/friends", tags=["friends"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(test_router, prefix="/api/v1/test", tags=["tests"])
app.include_router(rating_router, prefix="/ratings", tags=["ratings"])
app.include_router(agreement_router, prefix="/agreements", tags=["agreements"])
app.include_router(admin_router, prefix="/api/v1", tags=["admin"])

# 시작 이벤트
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    try:
        # 1. 데이터베이스 테이블 생성
        create_tables()
        print("Database tables created successfully")
        
        # 2. 페르소나 동기화
        from .services.persona_sync import persona_sync_service
        from .database import get_db
        
        db = next(get_db())
        try:
            sync_success = persona_sync_service.sync_friends_table(db)
            if sync_success:
                print("Persona synchronization completed successfully")
            else:
                print("Persona synchronization failed")
        finally:
            db.close()
        
        print("Care Chat API is starting...")
    except Exception as e:
        print(f"Application initialization failed: {e}")
        import traceback
        traceback.print_exc()
        raise

# 전역 예외 처리
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global exception: {exc}")
    print(f"Request URL: {request.url}")
    print(f"Request method: {request.method}")
    import traceback
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )
    
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )