import cv2
import os
from ultralytics import YOLO
from pathlib import Path
import sys

sys.path.append(os.path.dirname(__file__))

MODEL_DIR = os.path.dirname(__file__)
RESULT_DIR = os.path.join(os.path.dirname(__file__), '../detection_results/images')

def crop_objects_by_labels(image_path, model_path=None, output_dir="cropped_objects", result_dir="detection_results"):
    """
    YOLO 모델을 사용하여 이미지에서 객체를 감지하고 라벨별로 크롭하여 저장하는 함수
    
    Args:
        image_path (str): 분석할 이미지 파일 경로
        model_path (str): YOLO 모델 파일 경로 (.pt) (기본값: best.pt)
        output_dir (str): 크롭된 이미지들을 저장할 디렉토리
        result_dir (str): 결과 이미지를 저장할 디렉토리
    """
    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), "best.pt")

    
    # YOLO 모델 로드
    try:
        model = YOLO(model_path)
        print(f"모델 로드 성공: {model_path}")
    except Exception as e:
        print(f"모델 로드 실패: {e}")
        return
    
    # 원본 이미지 로드
    original_image = cv2.imread(image_path)
    if original_image is None:
        print(f"이미지 로드 실패: {image_path}")
        return
    
    print(f"이미지 로드 성공: {image_path}")
    print(f"이미지 크기: {original_image.shape[1]}x{original_image.shape[0]}")
    
    # YOLO 추론 실행
    results = model(original_image)
    
    # 라벨별 카운터 초기화
    label_counters = {}
    
    print("\n객체 감지 및 크롭 시작...")
    
    for r in results:
        boxes = r.boxes
        if boxes is None or len(boxes) == 0:
            print("감지된 객체가 없습니다.")
            return
        
        print(f"총 {len(boxes)}개의 객체가 감지되었습니다.")
        
        for i, box in enumerate(boxes):
            # 바운딩 박스 좌표 추출
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # 클래스 ID와 라벨 추출
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            
            # 신뢰도 추출
            confidence = float(box.conf[0])
            
            # 라벨별 카운터 업데이트
            if label not in label_counters:
                label_counters[label] = 0
            label_counters[label] += 1
            
            # 객체 크롭
            cropped_image = original_image[y1:y2, x1:x2]
            
            if cropped_image.size == 0:
                print(f"객체 {i+1} ({label}): 크롭 실패 - 빈 이미지")
                continue
            
            print(f"객체 {i+1}: {label} (신뢰도: {confidence:.2f})")
            print(f"크기: {cropped_image.shape[1]}x{cropped_image.shape[0]}")
    
    # 결과 요약 출력
    print(f"\n크롭 결과 요약:")
    
    if label_counters:
        for label, count in label_counters.items():
            print(f"   • {label}: {count}개")
    else:
        print("   • 크롭된 객체가 없습니다.")
    
    # 결과 이미지 저장 (바운딩 박스가 그려진 이미지)
    # 입력 이미지 파일명에서 확장자 제거
    image_base = os.path.splitext(os.path.basename(image_path))[0]
    result_image_path = os.path.join(RESULT_DIR, f"detection_result_{image_base}.jpg")
    results[0].save(filename=result_image_path)
    print(f"🎯 탐지 결과 이미지: {result_image_path}")

def main():
    """메인 함수 - 커맨드 라인 인자 처리"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="YOLO 모델을 사용하여 이미지에서 객체를 감지하고 라벨별로 크롭하는 도구",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        
    )
    
    parser.add_argument(
        '--model', 
        type=str, 
        default='best.pt',
        help='YOLO 모델 파일 경로 (.pt) (기본값: best.pt)'
    )
    
    parser.add_argument(
        '--image', 
        type=str, 
        required=True,
        help='분석할 이미지 파일 경로'
    )
    
    parser.add_argument(
        '--output', 
        type=str, 
        default='cropped_objects',
        help='크롭된 이미지들을 저장할 디렉토리 (기본값: cropped_objects)'
    )
    
    parser.add_argument(
        '--result',
        type=str,
        default='detection_results',
        help='탐지 결과 이미지를 저장할 디렉토리 (기본값: detection_results)'
    )
    
    args = parser.parse_args()
    
    # 모델 파일 경로 설정 (best.pt 지정)
    model_path = 'best.pt'
    
    # 파일 존재 여부 확인
    if not os.path.exists(model_path):
        print(f"모델 파일을 찾을 수 없습니다: {model_path}")
        return
    
    if not os.path.exists(args.image):
        print(f"이미지 파일을 찾을 수 없습니다: {args.image}")
        return
    
    print("YOLO 객체 크롭 도구 시작")
    print("=" * 50)
    
    # 크롭 실행 (항상 best.pt 모델 사용)
    crop_objects_by_labels(args.image, model_path, args.output, args.result)
    
    print("=" * 50)
    print("작업이 완료되었습니다.")

if __name__ == '__main__':
    main() 