from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db, Base, engine
import os

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/reset-database")
async def reset_database(
    confirm: bool = False,
    db: Session = Depends(get_db)
):
    """
    데이터베이스를 완전히 초기화합니다.
    
    주의: 이 작업은 모든 데이터를 삭제합니다!
    """
    
    # 개발 환경에서만 허용
    if os.getenv("ENVIRONMENT") != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 기능은 개발 환경에서만 사용 가능합니다."
        )
    
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="confirm=true 파라미터가 필요합니다."
        )
    
    try:
        # 모든 테이블 삭제
        Base.metadata.drop_all(bind=engine)
        
        # 모든 테이블 재생성
        Base.metadata.create_all(bind=engine)
        
        # 기본 친구 데이터 삽입
        friends_data = [
            (1, '추진이', '목표 달성과 성공을 추구하며, 효율적이고 실용적인 해결책을 제시합니다.'),
            (2, '내면이', '깊이 있는 자기 성찰과 개인적 성장에 집중합니다.'),
            (3, '관계이', '타인과의 조화로운 관계 형성에 뛰어납니다.'),
            (4, '쾌락이', '삶의 즐거움과 다양한 경험을 추구합니다.'),
            (5, '안정이', '평화롭고 안정적인 환경을 선호하며, 갈등을 조화롭게 해결합니다.')
        ]
        
        for friend_id, name, description in friends_data:
            db.execute(text("""
                INSERT INTO friends (friends_id, friends_name, friends_description, created_at) 
                VALUES (:id, :name, :desc, NOW())
                ON CONFLICT (friends_id) DO NOTHING
            """), {"id": friend_id, "name": name, "desc": description})
        
        db.commit()
        
        return {
            "success": True,
            "message": "데이터베이스가 성공적으로 초기화되었습니다.",
            "reset_timestamp": "now"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 초기화 중 오류 발생: {str(e)}"
        )

@router.get("/database-status")
async def get_database_status(db: Session = Depends(get_db)):
    """데이터베이스 상태 확인"""
    try:
        # 각 테이블의 레코드 수 확인
        tables = ["users", "friends", "chat_sessions", "chat_messages", "drawing_tests", "agreements", "ratings"]
        status = {}
        
        for table in tables:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                status[table] = count
            except Exception as e:
                status[table] = f"Error: {str(e)}"
        
        return {
            "database_status": "connected",
            "table_counts": status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 상태 확인 중 오류: {str(e)}"
        )