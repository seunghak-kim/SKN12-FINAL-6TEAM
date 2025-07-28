"""
친구 관리 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.friend import FriendCreate, FriendUpdate, FriendResponse
from app.models.friend import Friend
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=FriendResponse, status_code=status.HTTP_201_CREATED)
async def create_friend(friend_data: FriendCreate, db: Session = Depends(get_db)):
    """새 친구 생성"""
    # 친구 이름 중복 확인
    existing_friend = db.query(Friend).filter(
        Friend.friends_name == friend_data.friends_name
    ).first()
    
    if existing_friend:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 친구 이름입니다."
        )
    
    new_friend = Friend(
        friends_name=friend_data.friends_name,
        friends_description=friend_data.friends_description,
        is_active=True
    )
    
    db.add(new_friend)
    db.commit()
    db.refresh(new_friend)
    
    return FriendResponse(
        friends_id=new_friend.friends_id,
        friends_name=new_friend.friends_name,
        friends_description=new_friend.friends_description,
        is_active=new_friend.is_active,
        created_at=new_friend.created_at
    )

@router.get("/", response_model=List[FriendResponse])
async def get_friends(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """친구 목록 조회"""
    friends = db.query(Friend).filter(
        Friend.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [
        FriendResponse(
            friends_id=friend.friends_id,
            friends_name=friend.friends_name,
            friends_description=friend.friends_description,
            is_active=friend.is_active,
            created_at=friend.created_at
        )
        for friend in friends
    ]

@router.get("/{friend_id}", response_model=FriendResponse)
async def get_friend(friend_id: int, db: Session = Depends(get_db)):
    """특정 친구 조회"""
    friend = db.query(Friend).filter(
        Friend.friends_id == friend_id
    ).first()
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="친구를 찾을 수 없습니다."
        )
    
    return FriendResponse(
        friends_id=friend.friends_id,
        friends_name=friend.friends_name,
        friends_description=friend.friends_description,
        is_active=friend.is_active,
        created_at=friend.created_at
    )

@router.put("/{friend_id}", response_model=FriendResponse)
async def update_friend(friend_id: int, friend_data: FriendUpdate, db: Session = Depends(get_db)):
    """친구 정보 수정"""
    friend = db.query(Friend).filter(
        Friend.friends_id == friend_id
    ).first()
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="친구를 찾을 수 없습니다."
        )
    
    # 친구 이름 변경 시 중복 확인
    if friend_data.friends_name and friend_data.friends_name != friend.friends_name:
        existing_friend = db.query(Friend).filter(
            Friend.friends_name == friend_data.friends_name,
            Friend.friends_id != friend_id
        ).first()
        
        if existing_friend:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 친구 이름입니다."
            )
        
        friend.friends_name = friend_data.friends_name
    
    if friend_data.friends_description is not None:
        friend.friends_description = friend_data.friends_description
    
    if friend_data.is_active is not None:
        friend.is_active = friend_data.is_active
    
    db.commit()
    db.refresh(friend)
    
    return FriendResponse(
        friends_id=friend.friends_id,
        friends_name=friend.friends_name,
        friends_description=friend.friends_description,
        is_active=friend.is_active,
        created_at=friend.created_at
    )

@router.delete("/{friend_id}")
async def delete_friend(friend_id: int, db: Session = Depends(get_db)):
    """친구 삭제 (비활성화)"""
    friend = db.query(Friend).filter(
        Friend.friends_id == friend_id
    ).first()
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="친구를 찾을 수 없습니다."
        )
    
    friend.is_active = False
    db.commit()
    
    return {"message": "친구가 성공적으로 삭제되었습니다."}