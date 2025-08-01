"""
그림 테스트 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime
import shutil

# 필요한 경우에만 스키마를 import하도록 주석 처리
from app.models.test import DrawingTest, DrawingTestResult
from app.database import get_db
from app.api.auth import get_current_user
# UserInformation은 더 이상 사용하지 않음

router = APIRouter()

# 이미지 업로드 및 그림 테스트 생성
@router.post("/drawing-tests/upload", status_code=status.HTTP_201_CREATED)
async def upload_drawing_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """그림 이미지 업로드 및 테스트 생성"""
    
    # 파일 확장자 검증
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp"}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 파일 형식입니다. (jpg, jpeg, png, gif, bmp만 가능)"
        )
    
    # 고유한 파일명 생성
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # 저장 경로 설정
    upload_dir = "result/images"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 데이터베이스에 테스트 생성
        new_test = DrawingTest(
            user_id=current_user["user_id"],
            image_url=file_path
        )
        
        db.add(new_test)
        db.commit()
        db.refresh(new_test)
        
        return {
            "test_id": new_test.test_id,
            "user_id": new_test.user_id,
            "image_url": new_test.image_url,
            "submitted_at": new_test.submitted_at,
            "message": "이미지가 성공적으로 업로드되었습니다."
        }
        
    except Exception as e:
        # 파일 저장 실패 시 파일 삭제
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/drawing-tests")
async def get_drawing_tests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """그림 테스트 목록 조회"""
    tests = db.query(DrawingTest).offset(skip).limit(limit).all()
    
    return [
        {
            "test_id": test.test_id,
            "user_id": test.user_id,
            "image_url": test.image_url,
            "submitted_at": test.submitted_at
        }
        for test in tests
    ]

@router.get("/drawing-tests/{test_id}")
async def get_drawing_test(test_id: int, db: Session = Depends(get_db)):
    """특정 그림 테스트 조회"""
    test = db.query(DrawingTest).filter(
        DrawingTest.test_id == test_id
    ).first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그림 테스트를 찾을 수 없습니다."
        )
    
    return {
        "test_id": test.test_id,
        "user_id": test.user_id,
        "image_url": test.image_url,
        "submitted_at": test.submitted_at
    }

@router.put("/drawing-tests/{test_id}")
async def update_drawing_test(test_id: int, db: Session = Depends(get_db)):
    """그림 테스트 수정"""
    test = db.query(DrawingTest).filter(
        DrawingTest.test_id == test_id
    ).first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그림 테스트를 찾을 수 없습니다."
        )
    
    db.commit()
    db.refresh(test)
    
    return {
        "test_id": test.test_id,
        "user_id": test.user_id,
        "image_url": test.image_url,
        "submitted_at": test.submitted_at,
        "message": "테스트가 성공적으로 업데이트되었습니다."
    }

# 테스트 결과 관련 엔드포인트
from pydantic import BaseModel
from typing import Optional

class TestResultCreate(BaseModel):
    test_id: int
    persona_type: int
    summary_text: Optional[str] = None

@router.post("/drawing-test-results", status_code=status.HTTP_201_CREATED)
async def create_test_result(
    result_data: TestResultCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """테스트 결과 생성"""
    # 해당 테스트가 현재 사용자의 것인지 확인
    test = db.query(DrawingTest).filter(
        DrawingTest.test_id == result_data.test_id,
        DrawingTest.user_id == current_user["user_id"]
    ).first()
    
    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="테스트를 찾을 수 없습니다."
        )
    
    # 이미 결과가 있는지 확인하고 있으면 업데이트, 없으면 생성
    existing_result = db.query(DrawingTestResult).filter(
        DrawingTestResult.test_id == result_data.test_id
    ).first()
    
    if existing_result:
        # 기존 결과 업데이트
        existing_result.persona_type = result_data.persona_type
        # summary_text가 제공된 경우에만 업데이트 (파이프라인 결과 보존)
        if result_data.summary_text:
            existing_result.summary_text = result_data.summary_text
        db.commit()
        db.refresh(existing_result)
        
        return {
            "result_id": existing_result.result_id,
            "test_id": existing_result.test_id,
            "persona_type": existing_result.persona_type,
            "summary_text": existing_result.summary_text,
            "created_at": existing_result.created_at,
            "message": "테스트 결과가 성공적으로 업데이트되었습니다."
        }
    else:
        # 새 결과 생성
        new_result = DrawingTestResult(
            test_id=result_data.test_id,
            persona_type=result_data.persona_type,
            summary_text=result_data.summary_text or "분석 결과가 생성되지 않았습니다."
        )
        
        db.add(new_result)
        db.commit()
        db.refresh(new_result)
        
        return {
            "result_id": new_result.result_id,
            "test_id": new_result.test_id,
            "persona_type": new_result.persona_type,
            "summary_text": new_result.summary_text,
            "created_at": new_result.created_at,
            "message": "테스트 결과가 성공적으로 생성되었습니다."
        }

@router.get("/drawing-test-results/my-results")
async def get_my_test_results(
    current_user: dict = Depends(get_current_user),
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """현재 사용자의 테스트 결과 조회 (이미지 포함)"""
    
    # 사용자의 모든 테스트와 결과를 조회
    results = db.query(DrawingTest).filter(
        DrawingTest.user_id == current_user["user_id"]
    ).offset(skip).limit(limit).all()
    
    response_data = []
    for test in results:
        test_data = {
            "test_id": test.test_id,
            "user_id": test.user_id,
            "image_url": test.image_url,
            "submitted_at": test.submitted_at,
            "result": None
        }
        
        # 결과가 있다면 포함
        if test.result:
            test_data["result"] = {
                "result_id": test.result.result_id,
                "persona_type": test.result.persona_type,
                "summary_text": test.result.summary_text,
                "created_at": test.result.created_at,
                "persona_info": None
            }
            
            # 페르소나 정보도 포함
            if test.result.persona:
                test_data["result"]["persona_info"] = {
                    "persona_id": test.result.persona.persona_id,
                    "name": test.result.persona.name,
                    "description": test.result.persona.description
                }
        
        response_data.append(test_data)
    
    return response_data

@router.get("/drawing-test-results/latest-matched")
async def get_latest_matched_persona(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자의 가장 최근 매칭된 페르소나 조회"""
    
    # 사용자의 가장 최근 테스트 결과 조회
    latest_result = db.query(DrawingTestResult).join(DrawingTest).filter(
        DrawingTest.user_id == current_user["user_id"],
        DrawingTestResult.persona_type.isnot(None)
    ).order_by(DrawingTestResult.created_at.desc()).first()
    
    if not latest_result:
        return {"matched_persona_id": None}
    
    return {
        "matched_persona_id": latest_result.persona_type,
        "matched_at": latest_result.created_at
    }

@router.get("/debug/table-status")
async def debug_table_status(db: Session = Depends(get_db)):
    """디버깅용: 테이블 상태 확인"""
    try:
        # DrawingTest 테이블 카운트
        test_count = db.query(DrawingTest).count()
        
        # DrawingTestResult 테이블 카운트
        result_count = db.query(DrawingTestResult).count()
        
        # 최근 5개 결과
        recent_results = db.query(DrawingTestResult).order_by(
            DrawingTestResult.created_at.desc()
        ).limit(5).all()
        
        recent_data = []
        for result in recent_results:
            recent_data.append({
                "result_id": result.result_id,
                "test_id": result.test_id,
                "persona_type": result.persona_type,
                "created_at": result.created_at
            })
        
        return {
            "drawing_tests_count": test_count,
            "drawing_test_results_count": result_count,
            "recent_results": recent_data
        }
        
    except Exception as e:
        return {"error": str(e)}

@router.get("/drawing-test-results/{result_id}")
async def get_test_result(result_id: int, db: Session = Depends(get_db)):
    """특정 테스트 결과 조회"""
    result = db.query(DrawingTestResult).filter(
        DrawingTestResult.result_id == result_id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="테스트 결과를 찾을 수 없습니다."
        )
    
    return {
        "result_id": result.result_id,
        "test_id": result.test_id,
        "persona_type": result.persona_type,
        "summary_text": result.summary_text,
        "created_at": result.created_at
    }

