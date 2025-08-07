import os
import io
import base64
import logging
from typing import Optional, Tuple, Dict, Union, Any
from PIL import Image, ImageOps
import cv2
import numpy as np
from pathlib import Path


class BasicImageProcessor:
    """기본 이미지 처리 클래스"""
    
    def __init__(self):
        self.supported_formats = {'.jpg', '.jpeg', '.png'}
        self.target_size = (640, 640)
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.logger = logging.getLogger(__name__)

    def load_image_pil(self, file_path: str) -> Optional[Image.Image]:
        """PIL을 사용하여 이미지 로드 (EXIF 회전 정보 자동 적용)"""
        try:
            if not os.path.exists(file_path):
                self.logger.error(f"파일이 존재하지 않습니다: {file_path}")
                return None
                
            with Image.open(file_path) as img:
                # EXIF 회전 정보 자동 적용 (스마트폰 사진 회전 문제 해결)
                try:
                    img = ImageOps.exif_transpose(img)
                    self.logger.debug("EXIF 회전 정보 적용 완료")
                except Exception as e:
                    self.logger.debug(f"EXIF 회전 정보 적용 실패 (무시 가능): {e}")
                
                # RGB로 변환
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                return img.copy()
        except Exception as e:
            self.logger.error(f"이미지 로드 실패: {e}")
            return None

    def load_image_cv2(self, file_path: str) -> Optional[np.ndarray]:
        """OpenCV를 사용한 이미지 로드"""
        try:
            if not os.path.exists(file_path):
                self.logger.error(f"파일이 존재하지 않습니다: {file_path}")
                return None
                
            # OpenCV는 BGR 형식으로 로드
            img = cv2.imread(file_path)
            if img is not None:
                # RGB로 변환
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                return img_rgb
            return None
        except Exception as e:
            self.logger.error(f"이미지 로드 실패: {e}")
            return None

    def validate_image_file(self, file_path: str) -> Tuple[bool, str]:
        """이미지 파일 유효성 검사"""
        if not os.path.exists(file_path):
            return False, "파일이 존재하지 않습니다."
            
        file_ext = Path(file_path).suffix.lower()
        if file_ext not in self.supported_formats:
            return False, f"지원하지 않는 파일 형식입니다. 지원 형식: {self.supported_formats}"
        
        # 파일 크기 체크
        file_size = os.path.getsize(file_path)
        if file_size > self.max_file_size:
            return False, f"파일 크기가 너무 큽니다. (최대 {self.max_file_size // (1024*1024)}MB)"
        
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True, "유효한 파일입니다."
        except Exception as e:
            return False, f"손상된 이미지 파일: {e}"

    def get_image_info(self, file_path: str) -> Dict[str, Any]:
        """이미지 정보 추출"""
        try:
            with Image.open(file_path) as img:
                info = {
                    'filename': os.path.basename(file_path),
                    'format': img.format,
                    'mode': img.mode,
                    'size': img.size,
                    'width': img.width,
                    'height': img.height,
                    'file_size': os.path.getsize(file_path)
                }
                return info
        except Exception as e:
            self.logger.error(f"이미지 정보 추출 실패: {e}")
            return {'error': str(e)}

    def resize_to_640x640(self, image_input: Union[str, Image.Image, np.ndarray], 
                         maintain_aspect_ratio: bool = True, 
                         save_path: Optional[str] = None) -> Tuple[Optional[Image.Image], Dict[str, Any]]:
        """이미지를 640x640으로 리사이징
        
        Args:
            image_input: 파일 경로(str) 또는 PIL Image 객체 또는 numpy array
            maintain_aspect_ratio: 종횡비 유지 여부 (True: 패딩 추가, False: 강제 resize)
            save_path: 저장할 경로 (None이면 저장하지 않음)
        
        Returns:
            tuple: (resized_image, resize_info)
        """
        try:
            # 입력 이미지 처리
            if isinstance(image_input, str):
                image = self.load_image_pil(image_input)
                if image is None:
                    return None, {"error": "이미지 로드 실패"}
            
            elif isinstance(image_input, Image.Image):
                # PIL Image 객체인 경우
                image = image_input.copy()
                
            elif isinstance(image_input, np.ndarray):
                # numpy array (OpenCV)
                if len(image_input.shape) == 3:
                    # BGR을 RGB로 변환
                    img_rgb = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
                    image = Image.fromarray(img_rgb)
                else:
                    image = Image.fromarray(image_input)
            else:
                return None, {"error": "지원하지 않는 이미지 형식"}
        
        except Exception as e:
            return None, {"error": f"이미지 처리 중 오류 발생: {str(e)}"}
        
        # 원본 크기 저장
        original_size = image.size
        target_size = self.target_size
        
        if maintain_aspect_ratio:
            # 종횡비 유지하면서 리사이징
            image_copy = image.copy()
            image_copy.thumbnail(target_size, Image.Resampling.LANCZOS)
            
            # 패딩을 위한 새 이미지 생성 (흰색 배경)
            resized_image = Image.new('RGB', target_size, (255, 255, 255))
            
            # 중앙에 이미지 배치
            x_offset = (target_size[0] - image_copy.size[0]) // 2
            y_offset = (target_size[1] - image_copy.size[1]) // 2
            resized_image.paste(image_copy, (x_offset, y_offset))
        else:
            # 강제 리사이징 (종횡비 무시)
            resized_image = image.resize(target_size, Image.Resampling.LANCZOS)
        
        # 리사이징 정보
        resize_info = {
            'original_size': original_size,
            'target_size': target_size,
            'maintain_aspect_ratio': maintain_aspect_ratio,
            'resize_ratio': min(target_size[0] / original_size[0], target_size[1] / original_size[1])
        }
        
        # 저장 옵션
        if save_path:
            try:
                # 저장 디렉토리 생성
                save_dir = os.path.dirname(save_path)
                if save_dir and not os.path.exists(save_dir):
                    os.makedirs(save_dir, exist_ok=True)
                    
                resized_image.save(save_path, quality=95, optimize=True)
                resize_info['saved_path'] = save_path
            except Exception as e:
                self.logger.error(f"이미지 저장 실패: {e}")
                resize_info['save_error'] = str(e)
        
        return resized_image, resize_info

    def process_uploaded_image(self, image_data: Union[str, bytes], 
                            output_path: Optional[str] = None) -> Dict[str, Any]:
        """프론트엔드에서 업로드된 이미지를 처리 (640x640으로 리사이징)
        
        Args:
            image_data: base64 인코딩된 이미지 데이터 또는 파일 경로
            output_path: 저장할 경로 (선택사항)
        
        Returns:
            dict: 처리 결과 정보
        """
        try:
            image = None
            
            if isinstance(image_data, str):
                if image_data.startswith('data:image'):
                    # base64 데이터 처리
                    try:
                        _, encoded = image_data.split(',', 1)
                        image_bytes = base64.b64decode(encoded)
                        # 바이트 크기 체크
                        if len(image_bytes) > self.max_file_size:
                            return {'success': False, 'error': f'이미지 크기가 너무 큽니다. (최대 {self.max_file_size // (1024*1024)}MB)'}
                        image = Image.open(io.BytesIO(image_bytes))
                        
                        # EXIF 회전 정보 자동 적용 (스마트폰 사진 회전 문제 해결)
                        try:
                            image = ImageOps.exif_transpose(image)
                            self.logger.debug("EXIF 회전 정보 적용 완료")
                        except Exception as e:
                            self.logger.debug(f"EXIF 회전 정보 적용 실패 (무시 가능): {e}")
                        
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                    except Exception as e:
                        return {'success': False, 'error': f'base64 디코딩 실패: {str(e)}'}
                else:
                    # 파일 경로로 처리
                    is_valid, message = self.validate_image_file(image_data)
                    if not is_valid:
                        return {'success': False, 'error': message}
                    image = self.load_image_pil(image_data)
            elif isinstance(image_data, bytes):
                # 바이트 데이터 직접 처리
                if len(image_data) > self.max_file_size:
                    return {'success': False, 'error': f'이미지 크기가 너무 큽니다. (최대 {self.max_file_size // (1024*1024)}MB)'}
                image = Image.open(io.BytesIO(image_data))
                
                # EXIF 회전 정보 자동 적용 (스마트폰 사진 회전 문제 해결)
                try:
                    image = ImageOps.exif_transpose(image)
                    self.logger.debug("EXIF 회전 정보 적용 완료")
                except Exception as e:
                    self.logger.debug(f"EXIF 회전 정보 적용 실패 (무시 가능): {e}")
                
                if image.mode != 'RGB':
                    image = image.convert('RGB')
            else:
                return {'success': False, 'error': '지원하지 않는 이미지 데이터 형식'}
            
            if image is None:
                return {'success': False, 'error': '이미지 로드 실패'}
            
            # 640x640으로 리사이징
            resized_image, resize_info = self.resize_to_640x640(image, maintain_aspect_ratio=True, save_path=output_path)
            
            if resized_image is None:
                return {'success': False, 'error': resize_info.get('error', '리사이징 실패')}
            
            # base64로 인코딩 (프론트엔드 전송용)
            buffer = io.BytesIO()
            resized_image.save(buffer, format='JPEG', quality=95, optimize=True)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            result = {
                'success': True,
                'image_base64': f"data:image/jpeg;base64,{img_base64}",
                'resize_info': resize_info,
                'size': resized_image.size,
                'file_size_bytes': len(buffer.getvalue())
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"이미지 처리 중 오류: {e}")
            return {'success': False, 'error': f'이미지 처리 중 오류: {str(e)}'}

    def batch_process_images(self, image_paths: list, output_dir: str) -> Dict[str, Any]:
        """여러 이미지를 일괄 처리
        
        Args:
            image_paths: 처리할 이미지 파일 경로 리스트
            output_dir: 출력 디렉토리
            
        Returns:
            dict: 처리 결과
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            
        results = []
        success_count = 0
        
        for image_path in image_paths:
            filename = os.path.basename(image_path)
            name, _ = os.path.splitext(filename)
            output_path = os.path.join(output_dir, f"{name}_640x640.jpg")
            
            result = self.process_uploaded_image(image_path, output_path)
            result['original_path'] = image_path
            result['output_path'] = output_path if result['success'] else None
            
            results.append(result)
            if result['success']:
                success_count += 1
                
        return {
            'total_processed': len(image_paths),
            'success_count': success_count,
            'failed_count': len(image_paths) - success_count,
            'results': results
        }

    def create_thumbnail(self, image_input: Union[str, Image.Image], 
                        size: Tuple[int, int] = (150, 150)) -> Optional[Image.Image]:
        """썸네일 이미지 생성
        
        Args:
            image_input: 이미지 파일 경로 또는 PIL Image 객체
            size: 썸네일 크기 (기본값: 150x150)
            
        Returns:
            Optional[Image.Image]: 썸네일 이미지 또는 None
        """
        try:
            if isinstance(image_input, str):
                image = self.load_image_pil(image_input)
            else:
                image = image_input.copy()
                
            if image is None:
                return None
                
            image.thumbnail(size, Image.Resampling.LANCZOS)
            return image
            
        except Exception as e:
            self.logger.error(f"썸네일 생성 실패: {e}")
            return None


if __name__ == '__main__':
    
    # 로깅 설정
    logging.basicConfig(level=logging.INFO)
    
    # 이미지 프로세서 초기화
    processor = BasicImageProcessor()
    print("🖼️  BasicImageProcessor 초기화 완료\n")
    
    # 테스트 이미지 경로
    test_image_path = '/Users/macbook/Desktop/SKN12-FINAL-6TEAM/backend/llm/test_images/test5.jpg'
    output_path = '/Users/macbook/Desktop/SKN12-FINAL-6TEAM/backend/llm/model/test5_processed.jpg'
    
    print("=" * 60)
    print("📋 이미지 처리 테스트 시작")
    print("=" * 60)
    
    if os.path.exists(test_image_path):
        # 1. 이미지 정보 확인
        print("\n1️⃣ 원본 이미지 정보")
        print("-" * 30)
        info = processor.get_image_info(test_image_path)
        if 'error' not in info:
            print(f"파일명: {info['filename']}")
            print(f"포맷: {info['format']}")
            print(f"크기: {info['width']} x {info['height']}")
            print(f"파일 크기: {info['file_size']:,} bytes ({info['file_size']/1024:.1f} KB)")
        else:
            print(f"❌ 오류: {info['error']}")
        
        # 2. 파일 유효성 검사
        print("\n2️⃣ 파일 유효성 검사")
        print("-" * 30)
        is_valid, message = processor.validate_image_file(test_image_path)
        print(f"{'✅ 유효함' if is_valid else '❌ 무효함'}: {message}")
        
        # 3. 640x640 리사이징 처리
        print("\n3️⃣ 640x640 리사이징 처리")
        print("-" * 30)
        result = processor.process_uploaded_image(test_image_path, output_path)
        
        if result['success']:
            print("✅ 처리 성공!")
            print(f"변환 크기: {result['size']}")
            print(f"처리된 파일 크기: {result['file_size_bytes']:,} bytes ({result['file_size_bytes']/1024:.1f} KB)")
            print(f"압축률: {(1 - result['file_size_bytes']/info['file_size'])*100:.1f}%")
            
            resize_info = result['resize_info']
            print(f"원본 크기: {resize_info['original_size']}")
            print(f"리사이징 비율: {resize_info['resize_ratio']:.3f}")
            print(f"종횡비 유지: {'예' if resize_info['maintain_aspect_ratio'] else '아니오'}")
            
            if os.path.exists(output_path):
                print(f"✅ 파일 저장 완료: {output_path}")
            else:
                print("❌ 파일 저장 실패")
        else:
            print(f"❌ 처리 실패: {result['error']}")
        
        # 4. 썸네일 생성 테스트
        print("\n4️⃣ 썸네일 생성 테스트")
        print("-" * 30)
        thumbnail = processor.create_thumbnail(test_image_path, (150, 150))
        if thumbnail:
            thumb_path = '/Users/macbook/Desktop/SKN12-FINAL-6TEAM/backend/llm/model/test5_thumbnail.jpg'
            thumbnail.save(thumb_path, quality=85)
            print(f"✅ 썸네일 생성 완료: {thumb_path}")
            print(f"썸네일 크기: {thumbnail.size}")
        else:
            print("❌ 썸네일 생성 실패")
        
        # 5. Base64 변환 테스트
        print("\n5️⃣ Base64 변환 테스트")
        print("-" * 30)
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()
            base64_str = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}"
            
        base64_result = processor.process_uploaded_image(base64_str)
        if base64_result['success']:
            print("✅ Base64 처리 성공!")
            print(f"Base64 문자열 길이: {len(base64_result['image_base64']):,} 문자")
        else:
            print(f"❌ Base64 처리 실패: {base64_result['error']}")
    
    else:
        print(f"❌ 테스트 이미지를 찾을 수 없습니다: {test_image_path}")
        print("\n💡 사용 예시:")
        print("from utils.image_processor import BasicImageProcessor")
        print("processor = BasicImageProcessor()")
        print("result = processor.process_uploaded_image('your_image.jpg')")
    
    print("\n" + "=" * 60)
    print("🎉 테스트 완료!")
    print("=" * 60)