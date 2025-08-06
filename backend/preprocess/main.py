import os
import sys
from book_extract_keywords import extract_keywords_from_pdf
from book_generate_text import generate_personality_texts

def main():
    """전처리 메인 함수: 키워드 추출 → 텍스트 생성"""
    
    print("=" * 60)
    print("감정 유형 분류 데이터 전처리 시작")
    print("=" * 60)
    
    # 경로 설정
    current_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(current_dir, "data/성격유형별_선호도서_추천을_위한_서평_키워드_유효성_연구.pdf")
    keywords_json = os.path.join(current_dir, "../data/personality_keywords_labeled.json")
    final_dataset = os.path.join(current_dir, "../data/personality_keywords_dataset_v2.json")
    
    # Step 1: PDF에서 키워드 추출
    print("\n[Step 1] PDF에서 키워드 추출 중...")
    try:
        extract_keywords_from_pdf(
            pdf_path=pdf_path,
            json_path=keywords_json,
            delete_temp=True,
            debug=True
        )
        print("✅ 키워드 추출 완료!")
    except Exception as e:
        print(f"❌ 키워드 추출 실패: {e}")
        return False
    
    # Step 2: 키워드 기반 텍스트 생성
    print("\n[Step 2] 키워드 기반 텍스트 생성 중...")
    try:
        generate_personality_texts(
            input_json_path=keywords_json,
            output_json_path=final_dataset,
            label_counts={
                "추진형": 1,
                "관계형": 3,
                "쾌락형": 3,
                "내면형": 2,
                "안정형": 2,
            },
            debug=True
        )
        
        print("✅ 텍스트 생성 완료!")
    except Exception as e:
        print(f"❌ 텍스트 생성 실패: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("전처리 완료! 최종 데이터셋:")
    print(f"📁 {final_dataset}")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)