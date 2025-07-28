"""
평가 관리 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.rating import RatingCreate, RatingUpdate, RatingResponse
from app.models.rating import Rating
from app.database import get_db
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """새 평가 생성"""
    # 사용자 인증 확인
    if current_user["user_id"] != rating_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 평가를 생성할 수 없습니다."
        )
    
    # 같은 사용자의 같은 세션에 대한 평가가 이미 있는지 확인
    existing_rating = db.query(Rating).filter(
        Rating.user_id == rating_data.user_id,
        Rating.session_id == rating_data.session_id
    ).first()
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 이 세션에 대한 평가가 존재합니다."
        )
    
    new_rating = Rating(
        user_id=rating_data.user_id,
        session_id=rating_data.session_id,
        rating=rating_data.rating,
        comment=rating_data.comment
    )
    
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    
    return RatingResponse(
        ratings_id=new_rating.ratings_id,
        user_id=new_rating.user_id,
        session_id=new_rating.session_id,
        rating=new_rating.rating,
        comment=new_rating.comment,
        created_at=new_rating.created_at
    )

@router.get("/", response_model=List[RatingResponse])
async def get_ratings(
    skip: int = 0, 
    limit: int = 100, 
    user_id: Optional[int] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """평가 목록 조회"""
    query = db.query(Rating)
    
    if user_id:
        query = query.filter(Rating.user_id == user_id)
    
    if session_id:
        query = query.filter(Rating.session_id == session_id)
    
    ratings = query.offset(skip).limit(limit).all()
    
    return [
        RatingResponse(
            ratings_id=rating.ratings_id,
            user_id=rating.user_id,
            session_id=rating.session_id,
            rating=rating.rating,
            comment=rating.comment,
            created_at=rating.created_at
        )
        for rating in ratings
    ]

@router.get("/{rating_id}", response_model=RatingResponse)
async def get_rating(rating_id: int, db: Session = Depends(get_db)):
    """특정 평가 조회"""
    rating = db.query(Rating).filter(
        Rating.ratings_id == rating_id
    ).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="평가를 찾을 수 없습니다."
        )
    
    return RatingResponse(
        ratings_id=rating.ratings_id,
        user_id=rating.user_id,
        session_id=rating.session_id,
        rating=rating.rating,
        comment=rating.comment,
        created_at=rating.created_at
    )

@router.put("/{rating_id}", response_model=RatingResponse)
async def update_rating(rating_id: int, rating_data: RatingUpdate, db: Session = Depends(get_db)):
    """평가 수정"""
    rating = db.query(Rating).filter(
        Rating.ratings_id == rating_id
    ).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="평가를 찾을 수 없습니다."
        )
    
    if rating_data.rating is not None:
        rating.rating = rating_data.rating
    
    if rating_data.comment is not None:
        rating.comment = rating_data.comment
    
    db.commit()
    db.refresh(rating)
    
    return RatingResponse(
        ratings_id=rating.ratings_id,
        user_id=rating.user_id,
        session_id=rating.session_id,
        rating=rating.rating,
        comment=rating.comment,
        created_at=rating.created_at
    )

@router.delete("/{rating_id}")
async def delete_rating(rating_id: int, db: Session = Depends(get_db)):
    """평가 삭제"""
    rating = db.query(Rating).filter(
        Rating.ratings_id == rating_id
    ).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="평가를 찾을 수 없습니다."
        )
    
    db.delete(rating)
    db.commit()
    
    return {"message": "평가가 성공적으로 삭제되었습니다."}

@router.get("/sessions/{session_id}/average", response_model=dict)
async def get_session_average_rating(session_id: str, db: Session = Depends(get_db)):
    """특정 세션의 평균 평점 조회"""
    from sqlalchemy import func
    
    result = db.query(
        func.avg(Rating.rating).label('average_rating'),
        func.count(Rating.ratings_id).label('total_ratings')
    ).filter(
        Rating.session_id == session_id
    ).first()
    
    return {
        "session_id": session_id,
        "average_rating": float(result.average_rating) if result.average_rating else 0.0,
        "total_ratings": result.total_ratings
    }

@router.get("/users/{user_id}/average", response_model=dict)
async def get_user_average_rating(user_id: int, db: Session = Depends(get_db)):
    """특정 사용자의 평균 평점 조회"""
    from sqlalchemy import func
    
    result = db.query(
        func.avg(Rating.rating).label('average_rating'),
        func.count(Rating.ratings_id).label('total_ratings')
    ).filter(
        Rating.user_id == user_id
    ).first()
    
    return {
        "user_id": user_id,
        "average_rating": float(result.average_rating) if result.average_rating else 0.0,
        "total_ratings": result.total_ratings
    }