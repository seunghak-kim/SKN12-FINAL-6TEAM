"""
관리자 API 엔드포인트
- 사용자 데이터 정리 관련 기능
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.cleanup_service import cleanup_service

router = APIRouter()

@router.post("/admin/cleanup-expired-users")
async def cleanup_expired_users(db: Session = Depends(get_db)):
    """1년 지난 INACTIVE 사용자들을 물리적으로 삭제"""
    result = cleanup_service.cleanup_expired_users(db)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )
    
    return result

@router.get("/admin/cleanup-stats")
async def get_cleanup_stats(db: Session = Depends(get_db)):
    """정리 대상 사용자 통계 조회"""
    stats = cleanup_service.get_cleanup_stats(db)
    
    if "error" in stats:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=stats["error"]
        )
    
    return stats