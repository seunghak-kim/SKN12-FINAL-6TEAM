"""
약관 동의 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.agreement import AgreementCreate, AgreementUpdate, AgreementResponse
from app.models.agreement import Agreement
from app.database import get_db
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=AgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_agreement(agreement_data: AgreementCreate, db: Session = Depends(get_db)):
    """새 약관 동의 생성"""
    # 같은 사용자의 같은 약관에 대한 동의가 이미 있는지 확인
    existing_agreement = db.query(Agreement).filter(
        Agreement.user_id == agreement_data.user_id,
        Agreement.agreement_type == agreement_data.agreement_type
    ).first()
    
    if existing_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 이 약관에 대한 동의가 존재합니다."
        )
    
    new_agreement = Agreement(
        user_id=agreement_data.user_id,
        agreement_type=agreement_data.agreement_type,
        agreement_status=agreement_data.agreement_status,
        agreement_version=agreement_data.agreement_version
    )
    
    db.add(new_agreement)
    db.commit()
    db.refresh(new_agreement)
    
    return AgreementResponse(
        agreement_id=new_agreement.agreement_id,
        user_id=new_agreement.user_id,
        agreement_type=new_agreement.agreement_type,
        agreement_status=new_agreement.agreement_status,
        agreement_version=new_agreement.agreement_version,
        agreed_at=new_agreement.agreed_at
    )

@router.get("/", response_model=List[AgreementResponse])
async def get_agreements(
    skip: int = 0, 
    limit: int = 100, 
    user_id: Optional[int] = None,
    agreement_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """약관 동의 목록 조회"""
    query = db.query(Agreement)
    
    if user_id:
        query = query.filter(Agreement.user_id == user_id)
    
    if agreement_type:
        query = query.filter(Agreement.agreement_type == agreement_type)
    
    agreements = query.offset(skip).limit(limit).all()
    
    return [
        AgreementResponse(
            agreement_id=agreement.agreement_id,
            user_id=agreement.user_id,
            agreement_type=agreement.agreement_type,
            agreement_status=agreement.agreement_status,
            agreement_version=agreement.agreement_version,
            agreed_at=agreement.agreed_at
        )
        for agreement in agreements
    ]

@router.get("/{agreement_id}", response_model=AgreementResponse)
async def get_agreement(agreement_id: int, db: Session = Depends(get_db)):
    """특정 약관 동의 조회"""
    agreement = db.query(Agreement).filter(
        Agreement.agreement_id == agreement_id
    ).first()
    
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="약관 동의를 찾을 수 없습니다."
        )
    
    return AgreementResponse(
        agreement_id=agreement.agreement_id,
        user_id=agreement.user_id,
        agreement_type=agreement.agreement_type,
        agreement_status=agreement.agreement_status,
        agreement_version=agreement.agreement_version,
        agreed_at=agreement.agreed_at
    )

@router.put("/{agreement_id}", response_model=AgreementResponse)
async def update_agreement(agreement_id: int, agreement_data: AgreementUpdate, db: Session = Depends(get_db)):
    """약관 동의 수정"""
    agreement = db.query(Agreement).filter(
        Agreement.agreement_id == agreement_id
    ).first()
    
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="약관 동의를 찾을 수 없습니다."
        )
    
    if agreement_data.agreement_status is not None:
        agreement.agreement_status = agreement_data.agreement_status
    
    if agreement_data.agreement_version is not None:
        agreement.agreement_version = agreement_data.agreement_version
    
    db.commit()
    db.refresh(agreement)
    
    return AgreementResponse(
        agreement_id=agreement.agreement_id,
        user_id=agreement.user_id,
        agreement_type=agreement.agreement_type,
        agreement_status=agreement.agreement_status,
        agreement_version=agreement.agreement_version,
        agreed_at=agreement.agreed_at
    )

@router.delete("/{agreement_id}")
async def delete_agreement(agreement_id: int, db: Session = Depends(get_db)):
    """약관 동의 삭제"""
    agreement = db.query(Agreement).filter(
        Agreement.agreement_id == agreement_id
    ).first()
    
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="약관 동의를 찾을 수 없습니다."
        )
    
    db.delete(agreement)
    db.commit()
    
    return {"message": "약관 동의가 성공적으로 삭제되었습니다."}

@router.get("/users/{user_id}/status", response_model=dict)
async def get_user_agreement_status(user_id: int, db: Session = Depends(get_db)):
    """특정 사용자의 약관 동의 현황 조회"""
    agreements = db.query(Agreement).filter(
        Agreement.user_id == user_id
    ).all()
    
    agreement_status = {}
    for agreement in agreements:
        agreement_status[agreement.agreement_type] = {
            "status": agreement.agreement_status,
            "version": agreement.agreement_version,
            "agreed_at": agreement.agreed_at
        }
    
    return {
        "user_id": user_id,
        "agreements": agreement_status
    }

@router.post("/users/{user_id}/bulk", response_model=List[AgreementResponse])
async def create_bulk_agreements(user_id: int, agreements_data: List[AgreementCreate], db: Session = Depends(get_db)):
    """사용자의 여러 약관 동의를 일괄 생성"""
    created_agreements = []
    
    for agreement_data in agreements_data:
        # 사용자 ID 일치 확인
        if agreement_data.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="사용자 ID가 일치하지 않습니다."
            )
        
        # 중복 확인
        existing_agreement = db.query(Agreement).filter(
            Agreement.user_id == agreement_data.user_id,
            Agreement.agreement_type == agreement_data.agreement_type
        ).first()
        
        if existing_agreement:
            continue  # 이미 존재하면 건너뛰기
        
        new_agreement = Agreement(
            user_id=agreement_data.user_id,
            agreement_type=agreement_data.agreement_type,
            agreement_status=agreement_data.agreement_status,
            agreement_version=agreement_data.agreement_version
        )
        
        db.add(new_agreement)
        created_agreements.append(new_agreement)
    
    db.commit()
    
    for agreement in created_agreements:
        db.refresh(agreement)
    
    return [
        AgreementResponse(
            agreement_id=agreement.agreement_id,
            user_id=agreement.user_id,
            agreement_type=agreement.agreement_type,
            agreement_status=agreement.agreement_status,
            agreement_version=agreement.agreement_version,
            agreed_at=agreement.agreed_at
        )
        for agreement in created_agreements
    ]

@router.post("/htp-consent")
async def create_htp_consent(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """HTP 심리검사 개인정보 활용 동의"""
    try:
        # 이미 동의한 기록이 있는지 확인
        existing_agreement = db.query(Agreement).filter(
            Agreement.user_id == current_user["user_id"]
        ).first()
        
        if existing_agreement:
            # 이미 동의했으면 is_agree를 True로 업데이트
            existing_agreement.is_agree = True
            db.commit()
            return {"message": "동의가 업데이트되었습니다.", "agreement_id": existing_agreement.agreement_id}
        else:
            # 새로운 동의 기록 생성
            new_agreement = Agreement(
                user_id=current_user["user_id"],
                is_agree=True
            )
            db.add(new_agreement)
            db.commit()
            db.refresh(new_agreement)
            
            return {"message": "동의가 완료되었습니다.", "agreement_id": new_agreement.agreement_id}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"동의 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/htp-consent/status")
async def get_htp_consent_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """현재 사용자의 HTP 동의 상태 확인"""
    try:
        agreement = db.query(Agreement).filter(
            Agreement.user_id == current_user["user_id"]
        ).first()
        
        if agreement and agreement.is_agree:
            return {
                "has_agreed": True,
                "agreed_at": agreement.agreed_at.isoformat() if agreement.agreed_at else None
            }
        else:
            return {"has_agreed": False}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"동의 상태 확인 중 오류가 발생했습니다: {str(e)}"
        )