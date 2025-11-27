"""
관리자 API 엔드포인트
- 사용자 데이터 정리 관련 기능
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.cleanup_service import cleanup_service
from ..models import DrawingTestResult, DrawingTest, Persona
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .auth import get_current_user

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

class DashboardTestResult(BaseModel):
    test_id: int
    user_name: Optional[str]
    execution_time: datetime
    duration_seconds: Optional[float]
    persona_name: Optional[str]
    summary: Optional[str]
    
    class Config:
        orm_mode = True

@router.get("/admin/dashboard", response_model=List[DashboardTestResult])
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    대시보드용 테스트 결과 데이터 조회
    - 테스트 실행 시간
    - 테스트 소요 시간 (초)
    - 테스트 결과 (요약)
    - 선택된 페르소나 캐릭터
    - 관리자 권한 필요
    """
    # 관리자 권한 확인
    from ..models.user import UserInformation
    user_info = db.query(UserInformation).filter(UserInformation.user_id == current_user["user_id"]).first()
    
    if not user_info or user_info.role != 'ADMIN':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다."
        )

    results = db.query(DrawingTestResult).join(DrawingTest).join(Persona).all()
    
    dashboard_data = []
    for result in results:
        user_name = "Unknown"
        duration = 0.0
        
        if result.test:
            if result.test.user_information:
                user_name = result.test.user_information.nickname
            
            # 소요 시간 계산 (결과 생성 시간 - 테스트 제출 시간)
            if result.created_at and result.test.submitted_at:
                delta = result.created_at - result.test.submitted_at
                duration = delta.total_seconds()
                print(f"Test {result.test_id}: Created {result.created_at}, Submitted {result.test.submitted_at}, Duration {duration}")
            else:
                print(f"Test {result.test_id}: Missing timestamps - Created {result.created_at}, Submitted {result.test.submitted_at}")
            
        dashboard_data.append({
            "test_id": result.test_id,
            "user_name": user_name,
            "execution_time": result.created_at,
            "duration_seconds": round(duration, 2),
            "persona_name": result.persona.name if result.persona else "None",
            "summary": result.summary_text
        })
        
    # 최신순 정렬
    dashboard_data.sort(key=lambda x: x["execution_time"], reverse=True)
    
    return dashboard_data