"""
거북이상담소 HTP 심리검사 파이프라인 API
이 모듈은 프론트엔드에서 이미지 분석 요청을 처리하는 API 엔드포인트를 제공합니다.
TestPage.tsx에서 버튼 클릭 시 호출되는 통합 파이프라인 인터페이스입니다.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime

# 내부 모듈
from ..database import get_db
from ..models.user import UserInformation
from .auth import get_current_user
from ..services.analysis_service import AnalysisService, get_analysis_service

router = APIRouter()




@router.post("/analyze-image")
async def analyze_drawing_image(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    그림 이미지 분석 API
    
    TestPage.tsx의 '분석 시작하기' 버튼에서 호출됩니다.
    업로드된 이미지를 HTP 심리검사 파이프라인으로 처리합니다.
    """
    # file 또는 image 중 하나를 사용 (프론트엔드 호환성)
    upload_file = file or image
    
    if not upload_file:
        raise HTTPException(
            status_code=422,
            detail="이미지 파일이 업로드되지 않았습니다. 'file' 또는 'image' 필드에 파일을 첨부해주세요."
        )
    
    try:
        result = await service.start_analysis(
            db=db,
            user_id=current_user["user_id"],
            file=upload_file,
            description=description,
            background_tasks=background_tasks
        )
        return JSONResponse(status_code=202, content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"이미지 분석 요청 처리 중 오류가 발생했습니다: {str(e)}"
        )





@router.get("/analysis-status/{test_id}")
async def get_analysis_status(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    분석 상태 조회 API
    
    프론트엔드에서 분석 진행 상황을 확인할 때 사용합니다.
    """
    try:
        status = service.get_status(
            db=db,
            test_id=test_id,
            user_id=current_user["user_id"]
        )
        return JSONResponse(content=status)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"분석 상태 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/pipeline-health")
async def check_pipeline_health(
    service: AnalysisService = Depends(get_analysis_service)
):
    """
    파이프라인 상태 확인 API
    
    시스템 관리자가 파이프라인 구성 요소의 상태를 확인할 때 사용합니다.
    """
    try:
        # 기본 상태 정보
        status = {
            "pipeline_status": "unknown",
            "timestamp": datetime.now().isoformat(),
        }
        
        pipeline = service.get_pipeline()
        if pipeline:
            status["pipeline_status"] = "active"
            status["config"] = {
                "model_dir": str(pipeline.config.model_dir),
                "yolo_model": pipeline.config.yolo_model_path
            }
        else:
            status["pipeline_status"] = "inactive"
            
        return JSONResponse(content=status)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "pipeline_status": "error",
                "error": str(e)
            }
        )