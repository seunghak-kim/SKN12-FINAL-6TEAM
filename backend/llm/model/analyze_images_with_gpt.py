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
sys.path.append(os.path.join(os.path.dirname(__file__), '../opensearch_modules'))

from opensearch_client import OpenSearchEmbeddingClient

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

IMAGE_DIR = os.path.join(os.path.dirname(__file__), '../detection_results/images')
RESULT_DIR = os.path.join(os.path.dirname(__file__), '../detection_results/results')

# OpenSearch RAG 시스템 초기화
try:
    # 작업 디렉토리를 opensearch_modules로 변경하여 임베딩 파일 접근
    original_cwd = os.getcwd()
    opensearch_modules_dir = os.path.join(os.path.dirname(__file__), '../opensearch_modules')
    os.chdir(opensearch_modules_dir)
    
    opensearch_client = OpenSearchEmbeddingClient()
    RAG_INDEX_NAME = "psychology_analysis"
    
    # 작업 디렉토리 복구
    os.chdir(original_cwd)
    print("OpenSearch RAG 시스템 초기화 완료")
except Exception as e:
    print(f"OpenSearch 초기화 실패: {e}")
    opensearch_client = None
    # 작업 디렉토리 복구 (에러 발생 시에도)
    try:
        os.chdir(original_cwd)
    except:
        pass
def extract_psychological_elements(analysis_text):
    """
    GPT 분석 결과에서 심리 분석 요소들을 추출
    """
    elements = []
    
    # 다양한 형식의 1단계 섹션 패턴 시도
    patterns = [
        r'## 1\. 심리 분석 요소 식별(.*?)(?=## 2\.|$)',  # ## 형식
        r'1\. \*\*심리 분석 요소 식별\*\*(.*?)(?=2\.|$)',  # ** 형식  
        r'### 1\. \*\*심리 분석 요소 식별\*\*(.*?)(?=### 2\.|$)',  # ### 형식
        r'1\. 심리 분석 요소 식별(.*?)(?=2\.|$)'  # 단순 형식
    ]
    
    element_section = None
    for pattern in patterns:
        element_section = re.search(pattern, analysis_text, re.DOTALL)
        if element_section:
            break
    
    if element_section:
        element_text = element_section.group(1).strip()
        print(f"요소 섹션 추출 성공: {element_text[:100]}...")
        
        # 각 요소를 개별적으로 추출
        lines = element_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and len(line) > 5:
                # 불필요한 문자 제거 후 요소 추가
                clean_element = re.sub(r'^[-•*]\s*', '', line)
                if clean_element:
                    elements.append(clean_element)
    else:
        print("요소 섹션을 찾을 수 없습니다. 전체 텍스트에서 키워드 추출 시도...")
        # 대안: 집, 나무, 사람 관련 키워드 직접 추출
        if '집' in analysis_text:
            elements.append('집')
        if '나무' in analysis_text:
            elements.append('나무')  
        if '사람' in analysis_text:
            elements.append('사람')
    
    return elements

def search_rag_documents(query_elements):
    """
    OpenSearch를 사용하여 관련 RAG 문서 검색
    """
    if not opensearch_client or not query_elements:
        return []
    
    try:
        # 모든 요소를 하나의 쿼리로 합침
        combined_query = ' '.join(query_elements)
        
        # 하이브리드 검색 수행
        search_results = opensearch_client.hybrid_search(
            index_name=RAG_INDEX_NAME,
            query_text=combined_query,
            k=10,
            use_reranker=True
        )
        
        # Reranker 기준 1번째 결과 반환
        if search_results:
            top_result = search_results[0]
            return {
                'text': top_result['text'],
                'metadata': top_result.get('metadata', {}),
                'document': top_result.get('document', ''),
                'element': top_result.get('element', ''),
                'score': top_result.get('rerank_score', top_result.get('score', 0))
            }  
    except Exception as e:
        print(f"RAG 검색 실패: {e}")
    
    return None

PROMPT = '''
        당신은 HTP(House-Tree-Person) 심리검사 분석 전문가입니다. 주어진 그림을 분석해 주세요.
        분석 방법
        1단계: 관찰된 특징들
        그림에서 보이는 구체적인 특징들을 나열해 주세요:

        집: 크기, 창문, 문, 지붕, 굴뚝 등의 특징
        나무: 크기, 줄기, 가지, 잎, 뿌리 등의 특징
        사람: 크기, 자세, 얼굴, 옷차림 등의 특징
        전체: 배치, 선의 굵기, 그림 스타일 등

        2단계: 심리적 해석
        각 요소가 나타내는 심리적 의미를 설명해 주세요:

        집 → 가족관계, 안정감, 소속감
        나무 → 성장욕구, 생명력, 적응력
        사람 → 자아상, 대인관계, 정서상태

        3단계: 핵심 감정 키워드
        분석 결과를 바탕으로 주요 감정 키워드를 3-5개 제시해 주세요.
        형식: 키워드만 한 줄씩 나열 (예: 불안, 안정감, 소외감)
        
        **작성 규칙**

        - 모든 답변은 한글로 '~입니다' 체로 작성
        - 단정적 표현보다는 '~로 보입니다', '~한 경향을 나타냅니다' 등 완화된 표현 사용
        - 부정적 해석과 긍정적 해석을 균형있게 제시
        - 이제 주어진 HTP 그림을 분석해 주세요.
        '''

openai.api_key = OPENAI_API_KEY

def analyze_image_with_gpt(image_path, prompt, rag_context=None):
    try:
        with open(image_path, "rb") as img_file:
            img_bytes = img_file.read()
            print(f"이미지 파일 크기: {len(img_bytes)} bytes")
            
            # 파일 확장자에 따른 MIME 타입 결정
            _, ext = os.path.splitext(image_path.lower())
            if ext in ['.jpg', '.jpeg']:
                mime_type = "image/jpeg"
            elif ext == '.png':
                mime_type = "image/png"
            elif ext == '.gif':
                mime_type = "image/gif"
            elif ext == '.webp':
                mime_type = "image/webp"
            else:
                mime_type = "image/jpeg"  # 기본값
            
            img_base64 = base64.b64encode(img_bytes).decode("utf-8")
            data_url = f"data:{mime_type};base64,{img_base64}"
            print(f"MIME 타입: {mime_type}")
            print(f"Base64 길이: {len(img_base64)}")
            
            # 메시지 컨텐츠 구성
            content = [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]
            
            # RAG 컨텍스트 추가
            if rag_context:
                rag_text = f"\n\n[참고 자료]\n문서: {rag_context['document']} - {rag_context['element']}\n내용: {rag_context['text']}"
                content.append({"type": "text", "text": rag_text})

            print("GPT API 호출 시작...")
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 HTP(House-Tree-Person) 심리검사 전문 분석가입니다. 제공된 그림은 심리검사 목적으로 그려진 그림이며, 실제 인물의 신원 식별이 아닌 심리적 특성 분석을 위한 것입니다. 그림의 시각적 요소들을 통해 심리 상태를 분석해 주세요. 개인의 정체성이나 신원을 파악하려는 것이 아니라, 그림 표현 방식을 통한 심리 분석임을 명심하세요. 이미지가 제대로 보이지 않으면 '이미지를 인식할 수 없습니다'라고 응답하지 말고, 다시 시도해보거나 이미지 파일 문제일 수 있다고 안내해주세요."},
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=2000,
            )
            print("GPT API 호출 완료")
            return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"GPT API 호출 실패: {e}")
        raise


def analyze_image_gpt(image_base):
    """GPT와 OpenSearch RAG를 사용하여 이미지 분석을 수행하는 함수
    
    Args:
        image_base (str): 분석할 이미지의 기본 파일명 (예: test4)
        
    Returns:
        dict: 분석 결과를 포함한 딕셔너리
    """
    if not OPENAI_API_KEY:
        print("OPENAI_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요.")
        print(f"현재 OPENAI_API_KEY 값: {OPENAI_API_KEY[:10] if OPENAI_API_KEY else 'None'}...")
        return None

    print(f"IMAGE_DIR 경로: {IMAGE_DIR}")
    if not os.path.exists(IMAGE_DIR):
        print(f"폴더를 찾을 수 없습니다: {IMAGE_DIR}")
        print(f"현재 작업 디렉토리: {os.getcwd()}")
        return None

    target_filename = f"detection_result_{image_base}.jpg"
    image_path = os.path.join(IMAGE_DIR, target_filename)
    print(f"찾는 이미지 파일: {image_path}")
    if not os.path.exists(image_path):
        print(f"{IMAGE_DIR} 폴더에 {target_filename} 파일이 없습니다.")
        # 폴더 내 파일 목록 출력
        try:
            files = os.listdir(IMAGE_DIR)
            print(f"폴더 내 파일 목록: {files}")
        except Exception as e:
            print(f"폴더 목록 조회 실패: {e}")
        return None

    print(f"\n===== {target_filename} 심리 분석 결과 =====")
    try:
        # 1차 GPT 해석 (초기 분석)
        print("1단계: 초기 심리 분석 수행 중...")
        initial_analysis = analyze_image_with_gpt(image_path, PROMPT)
        print("\n[초기 분석 결과]")
        print(initial_analysis)
        
        # 심리 분석 요소 추출
        print("\n2단계: 심리 분석 요소 추출 중...")
        psychological_elements = extract_psychological_elements(initial_analysis)
        print(f"추출된 요소들: {psychological_elements}")
        
        # OpenSearch RAG 검색
        print("\n3단계: RAG 시스템을 통한 관련 자료 검색 중...")
        rag_result = search_rag_documents(psychological_elements)
        
        if rag_result:
            print(f"검색된 관련 자료: {rag_result['document']} - {rag_result['element']}")
            print(f"관련도 점수: {rag_result['score']:.4f}")
            
            # RAG 컨텍스트를 포함한 최종 분석
            print("\n4단계: RAG 컨텍스트를 활용한 최종 분석 수행 중...")
            final_prompt = f"""
                            아래는 심리 그림 검사의 초기 분석 결과입니다:

                            {initial_analysis}

                            위 분석 결과를 바탕으로, 제공된 참고 자료를 활용하여 더욱 정확하고 전문적인 최종 심리 분석을 제공해 주세요.
                            특히 참고 자료의 전문적 해석을 반영하여 분석의 깊이를 더해주세요.
                            반드시 ~입니다 체로 작성해 주세요.
                            """
            result_text_gpt = analyze_image_with_gpt(image_path, final_prompt, rag_result)
        else:
            print("관련 RAG 자료를 찾을 수 없어 초기 분석 결과를 사용합니다.")
            result_text_gpt = initial_analysis
        
        print("\n[최종 분석 결과]")
        print(result_text_gpt)
        
    except Exception as e:
        print(f"분석 실패 - 상세 오류: {str(e)}")
        print(f"오류 타입: {type(e)}")
        import traceback
        print("전체 오류 추적:")
        traceback.print_exc()
        return None

    # 요약 해석문 생성
    print("\n5단계: 요약 해석문 생성 중...")
    SUMMARY_PROMPT = f"""
        아래의 그림 심리 분석 결과를 참고하여,
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

    # 감정 키워드 추출 (기존 방식 유지)
    enriched = []
    if rag_result:
        enriched.append({
            'element': rag_result['element'],
            'condition': rag_result['text'][:100] + '...' if len(rag_result['text']) > 100 else rag_result['text'],
            'keywords': rag_result['metadata'].get('keywords', [])
        })

    # 결과 딕셔너리 생성 (파일 저장 없이)
    result = {
        "raw_text": result_text_gpt,
        "result_text": result_text,
        "items": enriched,
        "rag_context": rag_result
    }
    
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