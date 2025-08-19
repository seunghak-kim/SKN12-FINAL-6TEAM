from app.models.test import DrawingTest, DrawingTestResult
from sqlalchemy.orm import Session
from typing import Dict, Any

def get_latest_drawing_summary(user_id: int, db: Session) -> str:
    """기존 호환성을 위한 함수 - 요약 텍스트만 반환"""
    result = get_latest_drawing_analysis(user_id, db)
    return result.get('summary', '아직 그림검사 결과가 없어요!')

def get_latest_drawing_analysis(user_id: int, db: Session) -> Dict[str, Any]:
    """사용자의 최신 그림검사 분석 결과를 상세히 반환"""
    result = (
        db.query(DrawingTestResult)
        .join(DrawingTest)
        .filter(DrawingTest.user_id == user_id)
        .order_by(DrawingTest.submitted_at.desc())
        .first()
    )
    
    if not result:
        return {
            "has_result": False,
            "summary": "아직 그림검사 결과가 없어요!",
            "personality_scores": {},
            "persona_type": None,
            "result_text": "그림검사를 먼저 해보시면 더 개인화된 상담을 받으실 수 있어요!"
        }
    
    return {
        "has_result": True,
        "summary": result.summary_text or "분석 결과가 없습니다.",
        "personality_scores": {
            "추진이": float(result.dog_scores) if result.dog_scores else 0.0,
            "내면이": float(result.cat_scores) if result.cat_scores else 0.0,
            "햇살이": float(result.rabbit_scores) if result.rabbit_scores else 0.0,
            "쾌락이": float(result.bear_scores) if result.bear_scores else 0.0,
            "안정이": float(result.turtle_scores) if result.turtle_scores else 0.0,
        },
        "persona_type": result.persona_type,
        "created_at": result.created_at.isoformat() if result.created_at else None,
        "result_text": result.summary_text or "분석 결과가 없습니다."
    }
