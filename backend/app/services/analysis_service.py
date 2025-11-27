import os
import uuid
import json
import time
import pytz
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import PIL.Image as PILImage
from PIL import ImageOps
import io

from ..config import settings
from ..models.test import DrawingTest, DrawingTestResult
from ..database import SessionLocal

# HTP 파이프라인 모듈
import sys
sys.path.insert(0, settings.MODEL_DIR)

try:
    from main import HTPAnalysisPipeline, PipelineStatus, PipelineResult, PipelineConfig
    PIPELINE_IMPORT_ERROR = None
except Exception as e:
    HTPAnalysisPipeline = None
    PipelineStatus = None
    PipelineResult = None
    PipelineConfig = None
    PIPELINE_IMPORT_ERROR = str(e)

class AnalysisService:
    _instance = None
    _pipeline_instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AnalysisService, cls).__new__(cls)
        return cls._instance

    def get_pipeline(self):
        """파이프라인 인스턴스 가져오기 (싱글톤 패턴)"""
        if self._pipeline_instance is None:
            if HTPAnalysisPipeline is None:
                missing_packages = ["pandas", "transformers", "ultralytics", "torch", "opencv-python", "scikit-learn"]
                raise HTTPException(
                    status_code=503,
                    detail={
                        "error": "HTP 분석 파이프라인을 사용할 수 없습니다.",
                        "reason": "필수 패키지가 설치되지 않았습니다.",
                        "missing_packages": missing_packages,
                        "install_command": f"pip install {' '.join(missing_packages)}",
                        "status": "service_unavailable"
                    }
                )
            
            # 설정 객체 생성 및 주입
            config = PipelineConfig(
                model_dir=Path(settings.MODEL_DIR),
                test_img_dir=Path(settings.TEST_IMG_DIR),
                detection_results_dir=Path(settings.DETECTION_RESULTS_DIR),
                rag_dir=Path(settings.BASE_DIR) / "llm" / "rag",
                log_dir=Path(settings.BASE_DIR) / "llm" / "logs",
                yolo_model_path=settings.YOLO_MODEL_PATH,
                supported_image_formats=tuple(settings.SUPPORTED_IMAGE_FORMATS)
            )
            self._pipeline_instance = HTPAnalysisPipeline(config=config)
        return self._pipeline_instance

    async def start_analysis(
        self, 
        db: Session, 
        user_id: int, 
        file: UploadFile, 
        description: Optional[str], 
        background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        """분석 시작: 이미지 저장 및 백그라운드 태스크 등록"""
        
        # 1. 파일 검증
        if not file.filename:
            raise HTTPException(status_code=422, detail="이미지 파일명이 없습니다.")
            
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=422, detail="이미지 파일만 업로드 가능합니다.")
            
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in settings.SUPPORTED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=422, 
                detail=f"지원하지 않는 이미지 형식입니다. ({', '.join(settings.SUPPORTED_IMAGE_FORMATS)} 지원)"
            )

        # 2. 고유 ID 및 경로 설정
        unique_id = str(uuid.uuid4())
        
        base_dir = Path(settings.RESULT_DIR) / "images"
        original_dir = base_dir / "original"
        yolo_dir = base_dir / "yolo"
        web_dir = base_dir / "web"
        
        for dir_path in [original_dir, yolo_dir, web_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
            
        original_path = original_dir / f"{unique_id}.jpg"
        yolo_path = yolo_dir / f"{unique_id}.jpg"
        web_path = web_dir / f"{unique_id}.jpg"
        
        # 파이프라인용 디렉토리 (호환성)
        pipeline = self.get_pipeline()
        pipeline_upload_dir = pipeline.config.test_img_dir
        pipeline_upload_dir.mkdir(parents=True, exist_ok=True)
        pipeline_image_path = pipeline_upload_dir / f"{unique_id}.jpg"

        # 3. 이미지 처리 및 저장
        try:
            image_data = await file.read()
            pil_image = PILImage.open(io.BytesIO(image_data))
            
            # EXIF 회전
            try:
                pil_image = ImageOps.exif_transpose(pil_image)
            except Exception:
                pass
                
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
                
            # 저장
            pil_image.save(original_path, 'JPEG', quality=95, optimize=True)
            
            yolo_image = pil_image.copy()
            yolo_image.thumbnail((320, 320), PILImage.Resampling.LANCZOS)
            yolo_image.save(yolo_path, 'JPEG', quality=10, optimize=True)
            
            web_image = pil_image.copy()
            web_image.thumbnail((640, 640), PILImage.Resampling.LANCZOS)
            web_image.save(web_path, 'JPEG', quality=85, optimize=True)
            
            # 파이프라인용 복사
            yolo_image.save(pipeline_image_path, 'JPEG', quality=10, optimize=True)
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"이미지 처리 중 오류 발생: {str(e)}")

        # 4. DB 레코드 생성
        seoul_tz = pytz.timezone('Asia/Seoul')
        utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        seoul_time = utc_now.astimezone(seoul_tz).replace(tzinfo=None)
        
        drawing_test = DrawingTest(
            user_id=user_id,
            image_url=f"result/images/original/{unique_id}.jpg",
            submitted_at=seoul_time
        )
        
        db.add(drawing_test)
        db.commit()
        db.refresh(drawing_test)

        # 5. 백그라운드 태스크 등록
        background_tasks.add_task(
            self.run_background_analysis,
            unique_id,
            drawing_test.test_id,
            description
        )

        return {
            "message": "이미지 분석이 시작되었습니다.",
            "test_id": drawing_test.test_id,
            "task_id": unique_id,
            "status": "processing",
            "estimated_time": "2-3분 소요 예상"
        }

    def run_background_analysis(self, unique_id: str, test_id: int, description: Optional[str]):
        """백그라운드 분석 실행"""
        db = SessionLocal()
        try:
            pipeline = self.get_pipeline()
            
            # 분석 실행 (ui_wait=False)
            result = pipeline.analyze_image(unique_id, ui_wait=False)
            
            # 결과 저장
            self._save_result(result, test_id, description, db)
            
        except Exception as e:
            print(f"백그라운드 분석 오류: {str(e)}")
            # 에러 상태 저장 로직
            try:
                seoul_tz = pytz.timezone('Asia/Seoul')
                utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)
                seoul_time = utc_now.astimezone(seoul_tz).replace(tzinfo=None)
                
                error_result = DrawingTestResult(
                    test_id=test_id,
                    persona_type=None,
                    summary_text=f"분석 중 오류가 발생했습니다: {str(e)}",
                    created_at=seoul_time
                )
                db.add(error_result)
                db.commit()
            except Exception as db_error:
                print(f"오류 상태 저장 실패: {db_error}")
        finally:
            db.close()

    def _save_result(self, result: Any, test_id: int, description: Optional[str], db: Session):
        """분석 결과 DB 저장"""
        pipeline = self.get_pipeline()
        
        personality_mapping = {
            "추진형": 1, "내면형": 2, "관계형": 3, "쾌락형": 4, "안정형": 5
        }
        
        persona_type_id = 2
        summary_text = "분석을 완료할 수 없습니다."
        persona_scores = {
            'dog_scores': 0.0, 'cat_scores': 0.0, 'rabbit_scores': 0.0, 
            'bear_scores': 0.0, 'turtle_scores': 0.0
        }

        if (PipelineStatus is not None and 
            hasattr(result, 'status') and 
            result.status == PipelineStatus.SUCCESS):
            
            # 1. 키워드 분석 결과
            if hasattr(result, 'keyword_analysis') and result.keyword_analysis:
                keyword_data = result.keyword_analysis
                probabilities = keyword_data.get('probabilities', {})
                
                if probabilities:
                    highest_prob_type = max(probabilities.items(), key=lambda x: x[1])[0]
                    persona_type_id = personality_mapping.get(highest_prob_type, 2)
                    
                    persona_scores.update({
                        'dog_scores': round(min(probabilities.get('추진형', 0.0), 999.99), 2),
                        'cat_scores': round(min(probabilities.get('내면형', 0.0), 999.99), 2),
                        'rabbit_scores': round(min(probabilities.get('관계형', 0.0), 999.99), 2),
                        'bear_scores': round(min(probabilities.get('쾌락형', 0.0), 999.99), 2),
                        'turtle_scores': round(min(probabilities.get('안정형', 0.0), 999.99), 2)
                    })
            
            # 2. 기본 성격 유형
            elif hasattr(result, 'personality_type') and result.personality_type:
                persona_type_id = personality_mapping.get(result.personality_type, 2)
            
            # 3. 심리 분석 텍스트
            summary_text = "성격 유형 분석이 완료되었습니다."
            if hasattr(result, 'psychological_analysis') and result.psychological_analysis:
                psych_analysis = result.psychological_analysis
                if isinstance(psych_analysis, dict) and psych_analysis.get('result_text'):
                    summary_text = psych_analysis['result_text']
        
        elif hasattr(result, 'error_message') and result.error_message:
            summary_text = f"분석 중 오류가 발생했습니다: {result.error_message}"

        # DB 저장/업데이트
        existing_result = db.query(DrawingTestResult).filter(DrawingTestResult.test_id == test_id).first()
        
        seoul_tz = pytz.timezone('Asia/Seoul')
        utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)
        seoul_time = utc_now.astimezone(seoul_tz).replace(tzinfo=None)
        
        if existing_result:
            existing_result.persona_type = persona_type_id
            existing_result.summary_text = summary_text
            existing_result.created_at = seoul_time
            existing_result.dog_scores = persona_scores['dog_scores']
            existing_result.cat_scores = persona_scores['cat_scores']
            existing_result.rabbit_scores = persona_scores['rabbit_scores']
            existing_result.bear_scores = persona_scores['bear_scores']
            existing_result.turtle_scores = persona_scores['turtle_scores']
        else:
            test_result = DrawingTestResult(
                test_id=test_id,
                persona_type=persona_type_id,
                summary_text=summary_text,
                created_at=seoul_time,
                **persona_scores
            )
            db.add(test_result)
            
        try:
            db.commit()
            # 로깅
            try:
                pipeline.logger.info(f"분석 결과 저장 성공 - test_id: {test_id}")
            except:
                pass
        except Exception as e:
            db.rollback()
            raise e

    def get_status(self, db: Session, test_id: int, user_id: int) -> Dict[str, Any]:
        """분석 상태 조회"""
        drawing_test = db.query(DrawingTest).filter(
            DrawingTest.test_id == test_id,
            DrawingTest.user_id == user_id
        ).first()
        
        if not drawing_test:
            raise HTTPException(status_code=404, detail="해당 테스트를 찾을 수 없습니다.")

        # unique_id 추출
        unique_id = None
        if drawing_test.image_url:
            import re
            match = re.search(r'result/images/original/(.+?)\.jpg', drawing_test.image_url)
            if match:
                unique_id = match.group(1)

        # 결과 조회
        test_result = db.query(DrawingTestResult).filter(DrawingTestResult.test_id == test_id).first()
        
        if not test_result:
            # 진행 중 상태 확인
            pipeline = self.get_pipeline()
            if unique_id:
                status_info = pipeline.get_analysis_status(unique_id)
                
                detection_completed = status_info.get("detection_completed", False)
                analysis_completed = status_info.get("analysis_completed", False)
                classification_completed = status_info.get("classification_completed", False)
                
                steps = [
                    {"name": "객체 탐지", "description": "YOLO를 사용한 그림 요소 검출", "completed": detection_completed, "current": not detection_completed},
                    {"name": "심리 분석", "description": "GPT-4를 사용한 심리상태 분석", "completed": analysis_completed, "current": detection_completed and not analysis_completed},
                    {"name": "성격 분류", "description": "키워드 분류기를 사용한 성격유형 분류", "completed": classification_completed, "current": analysis_completed and not classification_completed}
                ]
                
                current_step = next((i+1 for i, step in enumerate(steps) if step["current"]), 1)
                completed_steps = sum(1 for step in steps if step["completed"])
                
                if classification_completed:
                    return {
                        "test_id": test_id,
                        "status": "processing",
                        "message": "최종 결과 생성 중...",
                        "steps": steps,
                        "current_step": 3,
                        "completed_steps": 3,
                        "total_steps": 3,
                        "estimated_remaining": "잠시만 기다려주세요"
                    }
                
                return {
                    "test_id": test_id,
                    "status": "processing",
                    "message": f"단계 {current_step}/3 진행 중...",
                    "steps": steps,
                    "current_step": current_step,
                    "completed_steps": completed_steps,
                    "total_steps": 3,
                    "estimated_remaining": f"{4-completed_steps}분 소요 예상"
                }
            
            return {
                "test_id": test_id,
                "status": "processing",
                "message": "분석이 진행 중입니다...",
                "steps": [],
                "current_step": 1,
                "completed_steps": 0,
                "total_steps": 3
            }

        # 완료된 결과 반환
        personality_mapping = {1: "추진형", 2: "내면형", 3: "관계형", 4: "쾌락형", 5: "안정형"}
        
        probabilities = {
            "추진형": float(test_result.dog_scores or 0.0),
            "내면형": float(test_result.cat_scores or 0.0),
            "관계형": float(test_result.rabbit_scores or 0.0),
            "쾌락형": float(test_result.bear_scores or 0.0),
            "안정형": float(test_result.turtle_scores or 0.0)
        }
        
        if probabilities and any(v > 0 for v in probabilities.values()):
            predicted_personality = max(probabilities.items(), key=lambda x: x[1])[0]
            analysis_method = "keyword_classifier"
        else:
            predicted_personality = personality_mapping.get(test_result.persona_type, "내면형")
            analysis_method = "fallback"

        return {
            "test_id": test_id,
            "status": "completed",
            "message": "분석이 완료되었습니다.",
            "steps": [
                {"name": "객체 탐지", "description": "YOLO를 사용한 그림 요소 검출", "completed": True, "current": False},
                {"name": "심리 분석", "description": "GPT-4를 사용한 심리상태 분석", "completed": True, "current": False},
                {"name": "성격 분류", "description": "키워드 분류기를 사용한 성격유형 분류", "completed": True, "current": False}
            ],
            "current_step": 3,
            "completed_steps": 3,
            "total_steps": 3,
            "result": {
                "persona_type": test_result.persona_type,
                "summary_text": test_result.summary_text,
                "result_text": test_result.summary_text,
                "predicted_personality": predicted_personality,
                "probabilities": probabilities,
                "analysis_method": analysis_method,
                "keyword_analysis": {
                    "current_keywords": [], "previous_keywords": [], "total_keywords": 0,
                    "confidence": max(probabilities.values()) / 100.0 if probabilities else 0.0
                },
                "created_at": test_result.created_at.isoformat() if test_result.created_at else None,
                "image_url": drawing_test.image_url,
                "analyzed_image_url": unique_id and f"result/images/analyzed/{unique_id}.jpg" or None
            }
        }

analysis_service = AnalysisService()

def get_analysis_service() -> AnalysisService:
    return analysis_service
