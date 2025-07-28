import os
import sys
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

# 내부 모듈 임포트
from crop_by_labels import crop_objects_by_labels
from analyze_images_with_gpt import analyze_image_gpt
from keyword_classifier import run_keyword_prediction_from_result

# 경로 설정
sys.path.append(os.path.dirname(__file__))


class PipelineStatus(Enum):
    """파이프라인 실행 상태"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"
    FAILED = "failed"


class PersonalityType(Enum):
    """성격 유형 분류"""
    CHUJIN = "추진형"  # 추진이
    NAEMYEON = "내면형"  # 내면이
    GWANGYE = "관계형"  # 관계이
    KWAERAK = "쾌락형"  # 쾌락이
    ANJEONG = "안정형"  # 안정이


@dataclass
class PipelineConfig:
    """파이프라인 설정 클래스"""
    model_dir: Path
    test_img_dir: Path
    detection_results_dir: Path
    rag_dir: Path
    log_dir: Path
    
    # 파일 형식 설정
    supported_image_formats: tuple = ('.jpg', '.jpeg', '.png')
    
    # 모델 설정  
    yolo_model_path: str = "best.pt"
    kobert_model_path: str = "kobert_model"
    
    # API 설정
    openai_api_timeout: int = 120
    max_retries: int = 3


@dataclass 
class PipelineResult:
    """파이프라인 실행 결과"""
    status: PipelineStatus
    image_base: str
    timestamp: datetime
    
    # 각 단계별 결과
    detection_success: bool = False
    analysis_success: bool = False
    classification_success: bool = False
    
    # 결과 데이터
    detected_objects: Optional[Dict] = None
    psychological_analysis: Optional[Dict] = None
    personality_type: Optional[str] = None
    confidence_score: Optional[float] = None
    
    # 오류 정보
    error_message: Optional[str] = None
    error_stage: Optional[str] = None
    traceback: Optional[str] = None


class HTPAnalysisPipeline:
    """HTP 심리검사 이미지 분석 파이프라인 클래스"""
    
    def __init__(self, config: Optional[PipelineConfig] = None):
        """파이프라인 초기화
        
        Args:
            config: 파이프라인 설정. None이면 기본 설정 사용
        """
        self.config = config or self._create_default_config()
        self.logger = self._setup_logging()
        self._validate_environment()
    
    def _create_default_config(self) -> PipelineConfig:
        """기본 설정 생성"""
        base_dir = Path(__file__).parent
        return PipelineConfig(
            model_dir=base_dir,
            test_img_dir=base_dir / "../test_images",
            detection_results_dir=base_dir / "../detection_results", 
            rag_dir=base_dir / "../rag",
            log_dir=base_dir / "../logs"
        )
    
    def _setup_logging(self) -> logging.Logger:
        """로깅 설정"""
        # 로그 디렉토리 생성
        self.config.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 로거 생성
        logger = logging.getLogger('htp_pipeline')
        logger.setLevel(logging.INFO)
        
        # 핸들러가 이미 있다면 제거 (중복 방지)
        if logger.handlers:
            logger.handlers.clear()
        
        # 파일 핸들러
        log_file = self.config.log_dir / f"pipeline_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        
        # 콘솔 핸들러
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # 포매터 설정
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
    
    def _validate_environment(self) -> None:
        """환경 검증"""
        self.logger.info("환경 검증 시작...")
        
        # 필수 디렉토리 생성
        directories = [
            self.config.test_img_dir,
            self.config.detection_results_dir / "images",
            self.config.detection_results_dir / "results"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"디렉토리 생성/확인: {directory}")
        
        # YOLO 모델 파일 확인
        yolo_model = self.config.model_dir / self.config.yolo_model_path
        if not yolo_model.exists():
            raise FileNotFoundError(f"YOLO 모델 파일을 찾을 수 없습니다: {yolo_model}")
        
        # OpenAI API 키 확인
        if not os.getenv('OPENAI_API_KEY'):
            self.logger.warning("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
        
        self.logger.info("환경 검증 완료")
    
    def _validate_image_file(self, image_path: Path) -> bool:
        """이미지 파일 검증
        
        Args:
            image_path: 이미지 파일 경로
            
        Returns:
            bool: 유효한 이미지 파일인지 여부
        """
        if not image_path.exists():
            self.logger.error(f"이미지 파일이 존재하지 않습니다: {image_path}")
            return False
        
        if image_path.suffix.lower() not in self.config.supported_image_formats:
            self.logger.error(f"지원하지 않는 이미지 형식: {image_path.suffix}")
            return False
        
        # 파일 크기 확인 (최대 10MB)
        if image_path.stat().st_size > 10 * 1024 * 1024:
            self.logger.error(f"이미지 파일이 너무 큽니다 (>10MB): {image_path}")
            return False
        
        return True
    
    def _execute_stage_1(self, image_path: Path, result: PipelineResult) -> bool:
        """1단계: YOLO 객체 탐지 및 크롭핑
        
        Args:
            image_path: 입력 이미지 경로
            result: 결과 저장 객체
            
        Returns:
            bool: 성공 여부
        """
        try:
            self.logger.info("[1/3] YOLO 객체 탐지 및 크롭핑 시작...")
            
            # 객체 탐지 실행
            detection_result = crop_objects_by_labels(str(image_path))
            
            # 결과 이미지 파일 확인
            detection_image_path = (
                self.config.detection_results_dir / "images" / 
                f"detection_result_{result.image_base}.jpg"
            )
            
            if detection_image_path.exists():
                result.detection_success = True
                result.detected_objects = {"detection_image": str(detection_image_path)}
                self.logger.info(f"객체 탐지 완료: {detection_image_path}")
                return True
            else:
                self.logger.error("객체 탐지 결과 이미지가 생성되지 않았습니다.")
                return False
                
        except Exception as e:
            self.logger.error(f"객체 탐지 단계 오류: {str(e)}")
            result.error_stage = "detection"
            result.error_message = str(e)
            return False
    
    def _execute_stage_2(self, result: PipelineResult) -> bool:
        """2단계: GPT-4 Vision 심리 분석
        
        Args:
            result: 결과 저장 객체
            
        Returns:
            bool: 성공 여부
        """
        try:
            self.logger.info("[2/3] GPT-4 Vision 심리 분석 시작...")
            
            # GPT 분석 실행
            analysis_result = analyze_image_gpt(result.image_base)
            
            # 결과 파일 확인
            analysis_file_path = (
                self.config.detection_results_dir / "results" / 
                f"result_{result.image_base}.json"
            )
            
            if analysis_file_path.exists():
                # 분석 결과 로드
                with open(analysis_file_path, 'r', encoding='utf-8') as f:
                    analysis_data = json.load(f)
                
                result.analysis_success = True
                result.psychological_analysis = analysis_data
                self.logger.info(f"심리 분석 완료: {analysis_file_path}")
                
                # GPT 응답 검증
                if self._validate_gpt_response(analysis_data):
                    return True
                else:
                    self.logger.warning("GPT 응답이 불완전합니다.")
                    return False
            else:
                self.logger.error("심리 분석 결과 파일이 생성되지 않았습니다.")
                return False
                
        except Exception as e:
            self.logger.error(f"심리 분석 단계 오류: {str(e)}")
            result.error_stage = "analysis"
            result.error_message = str(e)
            return False
    
    def _validate_gpt_response(self, analysis_data: Dict) -> bool:
        """GPT 응답 검증
        
        Args:
            analysis_data: GPT 분석 결과
            
        Returns:
            bool: 유효한 응답인지 여부
        """
        # 기본 필드 확인
        required_fields = ['raw_text', 'result_text', 'items']
        for field in required_fields:
            if field not in analysis_data:
                self.logger.error(f"GPT 응답에 필수 필드가 없습니다: {field}")
                return False
        
        # 오류 응답 패턴 확인
        error_patterns = [
            "I'm sorry. I can't help with this request",
            "사람객체를 찾을 수 없다",
            "분석할 수 없습니다",
            "죄송합니다"
        ]
        
        raw_text = analysis_data.get('raw_text', '').lower()
        for pattern in error_patterns:
            if pattern.lower() in raw_text:
                self.logger.warning(f"GPT 오류 패턴 감지: {pattern}")
                return False
        
        return True
    
    def _execute_stage_3(self, result: PipelineResult) -> bool:
        """3단계: 키워드 기반 성격 유형 분류 (best_keyword_classifier.pth 사용)
        
        Args:
            result: 결과 저장 객체
            
        Returns:
            bool: 성공 여부
        """
        try:
            self.logger.info("[3/3] 키워드 기반 성격 유형 분류 시작...")
            
            # 키워드 분류기 실행
            try:
                # 키워드 기반 성격 유형 예측 실행
                prediction_result = run_keyword_prediction_from_result(result.image_base, quiet=False)
                
                if prediction_result and prediction_result.get('personality_type'):
                    result.classification_success = True
                    result.personality_type = prediction_result.get('personality_type')
                    result.confidence_score = prediction_result.get('confidence', 0.0)
                    
                    self.logger.info(
                        f"키워드 기반 성격 유형 분류 완료: {result.personality_type} "
                        f"(신뢰도: {result.confidence_score:.3f})"
                    )
                    return True
                else:
                    self.logger.error("키워드 분류 결과를 받지 못했습니다.")
                    return False
                    
            except ImportError as e:
                self.logger.error(f"키워드 분류기 import 실패: {e}")
                return False
                
        except Exception as e:
            self.logger.error(f"성격 유형 분류 단계 오류: {str(e)}")
            result.error_stage = "classification"
            result.error_message = str(e)
            return False
    

    
    def analyze_image(self, image_input: str) -> PipelineResult:
        """이미지 분석 전체 파이프라인 실행
        
        Args:
            image_input: 이미지 파일명 또는 경로
            
        Returns:
            PipelineResult: 분석 결과
        """
        # 이미지 파일명 정규화
        image_base = Path(image_input).stem
        if not image_base:
            image_base = str(image_input)
        
        # 결과 객체 초기화
        result = PipelineResult(
            status=PipelineStatus.RUNNING,
            image_base=image_base,
            timestamp=datetime.now()
        )
        
        self.logger.info(f"이미지 분석 시작: {image_base}")
        
        try:
            # 이미지 파일 경로 구성
            image_path = self.config.test_img_dir / f"{image_base}.jpg"
            
            # 이미지 파일 검증
            if not self._validate_image_file(image_path):
                result.status = PipelineStatus.FAILED
                result.error_message = "유효하지 않은 이미지 파일"
                return result
            
            # 1단계: 객체 탐지
            if not self._execute_stage_1(image_path, result):
                result.status = PipelineStatus.ERROR
                return result
            
            # 2단계: 심리 분석
            if not self._execute_stage_2(result):
                result.status = PipelineStatus.ERROR
                return result
            
            # 3단계: 성격 분류
            if not self._execute_stage_3(result):
                result.status = PipelineStatus.ERROR
                return result
            
            # 모든 단계 성공
            result.status = PipelineStatus.SUCCESS
            self.logger.info(f"이미지 분석 완료: {image_base} -> {result.personality_type}")
            
        except Exception as e:
            self.logger.error(f"파이프라인 실행 중 예상치 못한 오류: {str(e)}")
            result.status = PipelineStatus.ERROR
            result.error_message = str(e)
            result.traceback = traceback.format_exc()
        
        return result
    
    def get_analysis_status(self, image_base: str) -> Dict[str, Any]:
        """분석 상태 조회
        
        Args:
            image_base: 이미지 기본명
            
        Returns:
            Dict: 분석 상태 정보
        """
        status = {
            "image_base": image_base,
            "detection_completed": False,
            "analysis_completed": False,
            "classification_completed": False,
            "final_result": None
        }
        
        # 각 단계별 결과 파일 확인
        detection_path = (
            self.config.detection_results_dir / "images" / 
            f"detection_result_{image_base}.jpg"
        )
        analysis_path = (
            self.config.detection_results_dir / "results" / 
            f"result_{image_base}.json"
        )
        
        # KoBERT 결과 파일 확인 (result.json의 personality_analysis 존재 여부)
        kobert_completed = False
        if analysis_path.exists():
            try:
                with open(analysis_path, 'r', encoding='utf-8') as f:
                    result_data = json.load(f)
                    kobert_completed = 'personality_analysis' in result_data
            except:
                kobert_completed = False
        
        status["detection_completed"] = detection_path.exists()
        status["analysis_completed"] = analysis_path.exists()
        status["classification_completed"] = kobert_completed
        
        self.logger.info(f"상태 확인 - 탐지: {status['detection_completed']}, 분석: {status['analysis_completed']}, 분류: {status['classification_completed']}")
        self.logger.info(f"파일 경로 확인:")
        self.logger.info(f"  탐지: {detection_path} (존재: {detection_path.exists()})")
        self.logger.info(f"  분석: {analysis_path} (존재: {analysis_path.exists()})")
        self.logger.info(f"  분류: {kobert_path} (존재: {kobert_path.exists()})")
        
        if analysis_path.exists():
            try:
                with open(analysis_path, 'r', encoding='utf-8') as f:
                    analysis_data = json.load(f)
                status["final_result"] = analysis_data
            except Exception as e:
                self.logger.error(f"분석 결과 파일 읽기 오류: {e}")
        
        return status


def _display_detailed_keyword_results(image_base: str, pipeline: HTPAnalysisPipeline):
    """키워드 분석 결과를 상세하게 출력"""
    try:
        # 결과 파일 경로
        result_file_path = pipeline.config.detection_results_dir / "results" / f"result_{image_base}.json"
        
        if not result_file_path.exists():
            print(f"\n⚠️  키워드 분석 결과 파일을 찾을 수 없습니다: {result_file_path}")
            return
        
        # 결과 파일 로드
        with open(result_file_path, 'r', encoding='utf-8') as f:
            result_data = json.load(f)
        
        # 키워드 분석 결과 추출
        keyword_analysis = result_data.get('keyword_personality_analysis', {})
        
        if not keyword_analysis:
            print(f"\n⚠️  키워드 분석 결과가 없습니다")
            return
        
        print(f"\n🔍 키워드 기반 성격 분류 상세 결과")
        print("="*50)
        
        # 예측된 성격 유형
        predicted_personality = keyword_analysis.get('predicted_personality', 'N/A')
        confidence = keyword_analysis.get('confidence', 0.0)
        print(f"🎯 예측된 성격 유형: {predicted_personality}")
        print(f"📊 신뢰도: {confidence:.3f} ({confidence*100:.1f}%)")
        
        # 사용된 키워드들
        current_keywords = keyword_analysis.get('current_image_keywords', [])
        previous_keywords = keyword_analysis.get('previous_stage_keywords', [])
        total_keywords = keyword_analysis.get('total_keywords_used', 0)
        
        print(f"\n🔤 사용된 키워드 ({total_keywords}개):")
        if current_keywords:
            print(f"  📷 현재 이미지 키워드 ({len(current_keywords)}개):")
            print(f"     {', '.join(current_keywords[:10])}")
            if len(current_keywords) > 10:
                print(f"     ... 외 {len(current_keywords)-10}개")
        
        if previous_keywords:
            print(f"  📚 이전 단계 키워드 ({len(previous_keywords)}개):")
            print(f"     {', '.join(previous_keywords[:10])}")
            if len(previous_keywords) > 10:
                print(f"     ... 외 {len(previous_keywords)-10}개")
        
        # 각 유형별 확률
        probabilities = keyword_analysis.get('probabilities', {})
        if probabilities:
            print(f"\n📈 성격 유형별 확률:")
            sorted_probs = sorted(probabilities.items(), key=lambda x: -x[1])
            for i, (persona_type, prob) in enumerate(sorted_probs):
                marker = "🏆" if persona_type == predicted_personality else "  "
                bar_length = int(prob / 5)  # 100% = 20칸
                bar = "█" * bar_length + "░" * (20 - bar_length)
                print(f"     {marker} {persona_type:6s}: {prob:5.1f}% [{bar}]")
        
        # 모델 정보
        model_used = keyword_analysis.get('model_used', 'N/A')
        timestamp = keyword_analysis.get('analysis_timestamp', 'N/A')
        print(f"\n🤖 사용된 모델: {model_used}")
        print(f"⏰ 분석 시간: {timestamp}")
        
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ 키워드 분석 결과 출력 중 오류: {str(e)}")


def main():
    """메인 함수 - CLI 인터페이스"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="거북이상담소 HTP 심리검사 이미지 분석 파이프라인",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python main.py --image test5.jpg
  python main.py --image test5 --verbose
  python main.py --image /path/to/image.png --config config.json
        """
    )
    
    parser.add_argument(
        '--image', 
        type=str, 
        required=True,
        help='분석할 이미지 파일명 (예: test5.jpg, test5)'
    )
    parser.add_argument(
        '--verbose', 
        action='store_true',
        help='상세 로그 출력'
    )
    parser.add_argument(
        '--config',
        type=str,
        help='설정 파일 경로 (JSON 형식)'
    )
    
    args = parser.parse_args()
    
    # 파이프라인 초기화
    try:
        pipeline = HTPAnalysisPipeline()
        
        if args.verbose:
            pipeline.logger.setLevel(logging.DEBUG)
        
        # 분석 실행
        result = pipeline.analyze_image(args.image)
        
        # 결과 출력
        print("\n" + "="*60)
        print("HTP 심리검사 분석 결과")
        print("="*60)
        print(f"이미지: {result.image_base}")
        print(f"상태: {result.status.value}")
        print(f"시간: {result.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if result.status == PipelineStatus.SUCCESS:
            print(f"\n🎯 성격 유형: {result.personality_type}")
            print(f"🔍 신뢰도: {result.confidence_score:.1%}")
            
            # 키워드 분석 결과 상세 출력
            _display_detailed_keyword_results(result.image_base, pipeline)
            
            if result.psychological_analysis:
                print(f"\n📋 심리 분석 요약:")
                print(result.psychological_analysis.get('result_text', 'N/A')[:200] + "...")
        
        elif result.status in [PipelineStatus.ERROR, PipelineStatus.FAILED]:
            print(f"\n❌ 오류: {result.error_message}")
            if result.error_stage:
                print(f"오류 단계: {result.error_stage}")
        
        print("="*60)
        
        # 상태별 종료 코드
        exit_codes = {
            PipelineStatus.SUCCESS: 0,
            PipelineStatus.ERROR: 1,
            PipelineStatus.FAILED: 2
        }
        
        sys.exit(exit_codes.get(result.status, 1))
        
    except Exception as e:
        print(f"\n❌ 파이프라인 초기화 오류: {e}")
        sys.exit(3)


if __name__ == "__main__":
    main()