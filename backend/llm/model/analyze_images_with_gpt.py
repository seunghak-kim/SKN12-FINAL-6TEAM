import base64
import os
import openai
from dotenv import load_dotenv
import sys
import json
import numpy as np
from openai import OpenAI
import re

sys.path.append(os.path.dirname(__file__))

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../rag'))
IMAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../detection_results/images'))
RESULT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../detection_results/results'))

# RAG 문서 불러오기
RAG_FILES = [
    os.path.join(DOCS_DIR, "rag_doc_house.md"),
    os.path.join(DOCS_DIR, "rag_doc_tree.md"),
    os.path.join(DOCS_DIR, "rag_doc_person.md"),
]
def extract_image_paths_from_md(md_content):
    """마크다운 텍스트에서 이미지 경로를 추출"""
    image_paths = []
    # "- 관련 이미지 예시: img/..." 패턴 찾기
    pattern = r'- 관련 이미지 예시:\s*(img/[^\s]+\.png)'
    matches = re.findall(pattern, md_content)
    for match in matches:
        image_paths.append(match)
    return image_paths

def encode_image_to_base64(image_path):
    """이미지 파일을 base64로 인코딩"""
    try:
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except Exception as e:
        print(f"이미지 인코딩 실패: {image_path}, 에러: {e}")
        return None

def load_rag_docs():
    docs = []
    rag_images = []
    
    print(f"RAG 문서 로드 시작. DOCS_DIR: {DOCS_DIR}")
    
    for fname in RAG_FILES:
        print(f"RAG 파일 로드 시도: {fname}")
        if not os.path.exists(fname):
            print(f"RAG 파일이 존재하지 않습니다: {fname}")
            continue
            
        try:
            with open(fname, encoding="utf-8") as f:
                doc_content = f.read()
                docs.append(doc_content)
                print(f"RAG 파일 로드 성공: {fname}")
                
                # 이미지 경로 추출
                image_paths = extract_image_paths_from_md(doc_content)
                for img_path in image_paths:
                    # 상대 경로를 절대 경로로 변환
                    full_img_path = os.path.join(DOCS_DIR, img_path)
                    if os.path.exists(full_img_path):
                        img_base64 = encode_image_to_base64(full_img_path)
                        if img_base64:
                            rag_images.append({
                                "path": img_path,
                                "base64": img_base64
                            })
        except Exception as e:
            print(f"RAG 파일 로드 실패: {fname}, 오류: {e}")
            continue
    
    print(f"RAG 문서 로드 완료. 총 문서: {len(docs)}개, 이미지: {len(rag_images)}개")
    return "\n\n".join(docs), rag_images

# RAG 문서는 필요할 때 로드하도록 변경
RAG_GUIDE = None
RAG_IMAGES = None

def get_rag_data():
    global RAG_GUIDE, RAG_IMAGES
    if RAG_GUIDE is None or RAG_IMAGES is None:
        RAG_GUIDE, RAG_IMAGES = load_rag_docs()
    return RAG_GUIDE, RAG_IMAGES

PROMPT_TEMPLATE = '''
모든 답변은 반드시 한글로 작성해 주세요.
주어진 그림은 실제 장소나 인물이 아닌, 심리 검사를 위해 직접 손으로 그린 그림입니다. 
분석은 전문가처럼 자세하고 상세히 제시해야 하며, 모든 답변은 ~입니다 체로 적습니다.

아래의 세 단계로 분석을 수행해 주세요:

1. **심리 분석 요소 식별**  
   - 그림에서 보이는 시각적 특징들을 가능한 한 많이 구체적으로 식별해 주세요.  
   - 심리적 해석 없이 관찰 가능한 요소만 나열해 주세요.

2. **요소별 심층 분석**  
   - 집, 나무, 사람 순서로 분석합니다.  
   - 각 요소에 대해 그 특징이 시사하는 심리적 해석을 구체적으로 제시해 주세요.
   - 참고용 예시 이미지들과 비교하여 유사한 특징이 있는지 확인해 주세요.

3. **주요 감정 키워드**  
   - 아래와 같이 요소, 조건 없이 감정 키워드만 한 줄씩 나열해 주세요.  
   - 최소 3개 이상의 키워드를 반드시 포함해 주세요.  
   - 예시:
     불안, 안정, 자기표현, 갈등

아래의 해석 기준을 반드시 참고하여 분석을 수행하세요.
또한 함께 제공된 참고용 예시 이미지들을 비교 분석 자료로 활용하여 더 정확한 해석을 제공해 주세요:

{RAG_GUIDE}
'''

openai.api_key = OPENAI_API_KEY

def analyze_image_with_gpt(image_path, prompt, include_rag_images=False):
    with open(image_path, "rb") as img_file:
        img_bytes = img_file.read()
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{img_base64}"

        # 메시지 컨텐츠 구성
        content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": data_url}}
        ]
        
        # RAG 이미지들을 포함하는 경우
        if include_rag_images:
            _, rag_images = get_rag_data()
            if rag_images:
                content.append({"type": "text", "text": "\n\n[참고용 예시 이미지들]"})
                for rag_img in rag_images:
                    rag_data_url = f"data:image/png;base64,{rag_img['base64']}"
                    content.append({
                        "type": "text", 
                        "text": f"예시 이미지 경로: {rag_img['path']}"
                })
                content.append({
                    "type": "image_url", 
                    "image_url": {"url": rag_data_url}
                })

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "당신은 그림 검사 결과를 바탕으로 피검사자의 심리를 예측하는데 전문가입니다."},
                {
                    "role": "user",
                    "content": content
                }
            ],
            max_tokens=2000,
        )
    return response.choices[0].message.content.strip()

# RAG 문서 파싱 함수 (요소/조건/감정키워드 추출)
def parse_rag_md(md_path):
    rag_items = []
    with open(md_path, encoding="utf-8") as f:
        block = {}
        for line in f:
            line = line.strip()
            if line.startswith('- 요소:'):
                block['element'] = line.replace('- 요소:', '').strip()
            elif line.startswith('- 조건:'):
                block['condition'] = line.replace('- 조건:', '').strip()
            elif line.startswith('- 감정 키워드:'):
                block['keywords'] = [k.strip() for k in line.replace('- 감정 키워드:', '').split(',') if k.strip()]
            elif line == '' and block:
                rag_items.append(block)
                block = {}
        if block:
            rag_items.append(block)
    return rag_items

def parse_gpt_result_with_rag(raw_text, rag_md_paths):
    # rag_doc_*.md에서 요소/조건/감정키워드 모두 모으기
    rag_items = []
    for md_path in rag_md_paths:
        rag_items.extend(parse_rag_md(md_path))
    
    # raw_text에 등장하는 요소와 조건을 더 정확히 매칭
    result = []
    for item in rag_items:
        element = item.get('element', '')
        condition = item.get('condition', '')
        keywords = item.get('keywords', [])
        
        # 요소가 텍스트에 포함되어 있는지 확인
        if element in raw_text:
            # 조건도 있다면 조건까지 매칭 확인
            if condition and condition in raw_text:
                result.append(item)
            # 조건이 없거나 조건 매칭이 애매한 경우 키워드로 보완 확인
            elif not condition or any(keyword in raw_text for keyword in keywords):
                result.append(item)
    
    return result

def analyze_image_gpt(image_base):
    """GPT를 사용하여 이미지 분석을 수행하는 함수
    
    Args:
        image_base (str): 분석할 이미지의 기본 파일명 (예: test4)
        
    Returns:
        dict: 분석 결과를 포함한 딕셔너리
    """
    if not OPENAI_API_KEY:
        print("OPENAI_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요.")
        return None

    if not os.path.exists(IMAGE_DIR):
        print(f"폴더를 찾을 수 없습니다: {IMAGE_DIR}")
        return None

    target_filename = f"detection_result_{image_base}.jpg"
    image_path = os.path.join(IMAGE_DIR, target_filename)
    if not os.path.exists(image_path):
        print(f"{IMAGE_DIR} 폴더에 {target_filename} 파일이 없습니다.")
        return None

    print(f"\n===== {target_filename} 심리 분석 결과 =====")
    try:
        # RAG 데이터 로드
        rag_guide, rag_images = get_rag_data()
        
        # 프롬프트 생성
        prompt = PROMPT_TEMPLATE.format(RAG_GUIDE=rag_guide)
        
        # 1차 GPT 해석 (RAG 이미지 제외 - 토큰 제한으로 인해)
        result_text_gpt = analyze_image_with_gpt(image_path, prompt, include_rag_images=False)
        print(result_text_gpt)  # 1차 해석 텍스트 바로 출력
        # rag_doc_*.md 경로 리스트
        rag_md_paths = RAG_FILES
        # rag 기반 요소/조건/감정키워드 추출
        gpt_items = parse_gpt_result_with_rag(result_text_gpt, rag_md_paths)
    except Exception as e:
        print(f"분석 실패: {e}")
        return None

    # RAG 기반 추출 결과를 그대로 사용
    enriched = gpt_items

    # 사용자에게 제공할 종합 해석문(result_text) 생성용 프롬프트
    SUMMARY_PROMPT = f"""
아래의 그림 심리 분석 결과(1,2,3단계)를 참고하여,
사용자가 이해하기 쉽도록 전체적인 심리 상태와 특징을 자연스럽게 요약·정리해주는 해석문을 작성해 주세요.
반드시 ~입니다 체로 작성해 주세요.

분석 결과:
{result_text_gpt}
"""
    try:
        result_text = analyze_image_with_gpt(image_path, SUMMARY_PROMPT)
    except Exception as e:
        print(f"요약 해석문 생성 실패: {e}")
        result_text = "(요약 해석문 생성 실패)"

    # 최종 해석본 json 저장 (raw_text, result_text, items)
    result_json_path = os.path.join(RESULT_DIR, f"result_{image_base}.json")
    result = {
        "raw_text": result_text_gpt,
        "result_text": result_text,
        "items": enriched  # 반드시 포함
    }
    with open(result_json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"최종 해석본이 {result_json_path}에 저장되었습니다.")
    
    return result

def main():
    """메인 함수 - 커맨드 라인 인자 처리"""
    import argparse
    
    parser = argparse.ArgumentParser(description="분석할 detection_result_*.jpg 파일명을 지정하세요.")
    parser.add_argument('--image', type=str, required=True, help='분석할 detection_result_*.jpg 파일명 (예: detection_result_test4.jpg)')
    args = parser.parse_args()

    # 사용자가 입력한 파일명에서 확장자 제거 (test4.jpg → test4, test4 → test4)
    image_base = os.path.splitext(args.image)[0]
    
    # 새로운 모듈화된 함수 호출
    result = analyze_image_gpt(image_base)
    
    if result is None:
        print("분석에 실패했습니다.")
        return
    
    print("분석이 완료되었습니다.")

if __name__ == "__main__":
    main() 