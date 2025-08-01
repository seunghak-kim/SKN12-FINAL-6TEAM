"""
페르소나 관리 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaResponse
from app.models.persona import Persona
from app.database import get_db

router = APIRouter()

@router.post("/", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(persona_data: PersonaCreate, db: Session = Depends(get_db)):
    """새 페르소나 생성"""
    # 페르소나 이름 중복 확인
    existing_persona = db.query(Persona).filter(
        Persona.name == persona_data.name
    ).first()
    
    if existing_persona:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 페르소나 이름입니다."
        )
    
    new_persona = Persona(
        name=persona_data.name,
        description=persona_data.description,
        is_active=True
    )
    
    db.add(new_persona)
    db.commit()
    db.refresh(new_persona)
    
    return PersonaResponse(
        persona_id=new_persona.persona_id,
        name=new_persona.name,
        description=new_persona.description,
        is_active=new_persona.is_active,
        created_at=new_persona.created_at
    )

@router.get("/", response_model=List[PersonaResponse])
async def get_personas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """페르소나 목록 조회"""
    personas = db.query(Persona).filter(
        Persona.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [
        PersonaResponse(
            persona_id=persona.persona_id,
            name=persona.name,
            description=persona.description,
            is_active=persona.is_active,
            created_at=persona.created_at
        )
        for persona in personas
    ]

@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: int, db: Session = Depends(get_db)):
    """특정 페르소나 조회"""
    persona = db.query(Persona).filter(
        Persona.persona_id == persona_id
    ).first()
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="페르소나를 찾을 수 없습니다."
        )
    
    return PersonaResponse(
        persona_id=persona.persona_id,
        name=persona.name,
        description=persona.description,
        is_active=persona.is_active,
        created_at=persona.created_at
    )

@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(persona_id: int, persona_data: PersonaUpdate, db: Session = Depends(get_db)):
    """페르소나 정보 수정"""
    persona = db.query(Persona).filter(
        Persona.persona_id == persona_id
    ).first()
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="페르소나를 찾을 수 없습니다."
        )
    
    # 페르소나 이름 변경 시 중복 확인
    if persona_data.name and persona_data.name != persona.name:
        existing_persona = db.query(Persona).filter(
            Persona.name == persona_data.name,
            Persona.persona_id != persona_id
        ).first()
        
        if existing_persona:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 페르소나 이름입니다."
            )
        
        persona.name = persona_data.name
    
    if persona_data.description is not None:
        persona.description = persona_data.description
    
    if persona_data.is_active is not None:
        persona.is_active = persona_data.is_active
    
    db.commit()
    db.refresh(persona)
    
    return PersonaResponse(
        persona_id=persona.persona_id,
        name=persona.name,
        description=persona.description,
        is_active=persona.is_active,
        created_at=persona.created_at
    )

@router.delete("/{persona_id}")
async def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    """페르소나 삭제 (비활성화)"""
    persona = db.query(Persona).filter(
        Persona.persona_id == persona_id
    ).first()
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="페르소나를 찾을 수 없습니다."
        )
    
    persona.is_active = False
    db.commit()
    
    return {"message": "페르소나가 성공적으로 삭제되었습니다."}