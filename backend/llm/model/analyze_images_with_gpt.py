import base64
print("DEBUG: analyze_images_with_gpt.py imported")
import os
import openai
from dotenv import load_dotenv
import sys
import json
import numpy as np
from openai import OpenAI
import re
from PIL import Image, ImageOps
import io
from datetime import datetime

load_dotenv()

sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '../opensearch_modules'))

from opensearch_client import OpenSearchEmbeddingClient
opensearch_client = OpenSearchEmbeddingClient(host=os.getenv('OPENSEARCH_HOST', 'opensearch-node'))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

IMAGE_DIR = os.path.join(os.path.dirname(__file__), '../detection_results/images')
RESULT_DIR = os.path.join(os.path.dirname(__file__), '../detection_results/results')

# OpenSearch RAG 시스템 초기화
try:
    # 작업 디렉토리를 opensearch_modules로 변경하여 임베딩 파일 접근
    original_cwd = os.getcwd()
    opensearch_modules_dir = os.path.join(os.path.dirname(__file__), '../opensearch_modules')
    os.chdir(opensearch_modules_dir)
    
    opensearch_client = OpenSearchEmbeddingClient(host=os.getenv('OPENSEARCH_HOST', 'opensearch-node'))
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
        당신은 HTP(House-Tree-Person) 심리검사 분석 전문가입니다. 주어진 그림을 분석하여 다음 JSON 형식으로 출력해 주세요.
        
        {
            "features": {
                "house": ["집의 특징1", "집의 특징2"],
                "tree": ["나무의 특징1", "나무의 특징2"],
                "person": ["사람의 특징1", "사람의 특징2"],
                "overall": ["전체적인 특징1", "전체적인 특징2"]
            },
            "psychological_analysis": {
                "house": "집에 대한 심리적 해석",
                "tree": "나무에 대한 심리적 해석",
                "person": "사람에 대한 심리적 해석"
            },
            "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
            "summary": "현재 심리 상태에 대한 종합적인 요약 문단 구성 (객관적인 그림 관찰 요소와 심리적 연결고리를 포함하여 최소 10~15문장 이상의 상세한 텍스트로 작성)"
        }

        작성 규칙:
        - 모든 값은 한글로 작성
        - 단정적 표현보다는 '~로 보입니다', '~한 경향을 나타냅니다' 등 완화된 표현 사용
        - 부정적 해석과 긍정적 해석을 균형있게 제시
        - JSON 형식을 엄격히 준수할 것
        '''

openai.api_key = OPENAI_API_KEY

def optimize_image_for_gpt(image_path: str, max_size: tuple = (1024, 1024), quality: int = 85) -> tuple:
    """
    GPT Vision API 호출을 위해 이미지를 최적화
    
    Args:
        image_path (str): 원본 이미지 경로
        max_size (tuple): 최대 크기 (width, height)
        quality (int): JPEG 압축 품질 (1-100)
        
    Returns:
        tuple: (optimized_base64_string, compression_info)
    """
    try:
        # 원본 파일 크기 확인
        original_size = os.path.getsize(image_path)
        
        # 이미지 로드
        with Image.open(image_path) as img:
            # EXIF 회전 정보 적용
            img = ImageOps.exif_transpose(img)
            
            # RGB로 변환
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 원본 크기 저장
            original_dimensions = img.size
            
            # 크기 조정 (종횡비 유지)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # 메모리 버퍼에 압축하여 저장
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            
            # Base64 인코딩
            compressed_bytes = buffer.getvalue()
            compressed_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
            
            # 압축 정보
            compression_info = {
                'original_file_size': original_size,
                'compressed_size': len(compressed_bytes),
                'compression_ratio': round((1 - len(compressed_bytes) / original_size) * 100, 1),
                'original_dimensions': original_dimensions,
                'compressed_dimensions': img.size,
                'base64_length': len(compressed_base64),
                'quality': quality
            }
            
            return compressed_base64, compression_info
            
    except Exception as e:
        print(f"이미지 최적화 실패: {e}")
        # 실패 시 원본 방식 사용
        with open(image_path, "rb") as img_file:
            img_bytes = img_file.read()
            return base64.b64encode(img_bytes).decode("utf-8"), {
                'original_file_size': len(img_bytes),
                'compressed_size': len(img_bytes),
                'compression_ratio': 0,
                'error': str(e)
            }

def analyze_image_with_gpt(image_path, prompt, rag_context=None, max_retries=5):
    """
    GPT Vision API를 사용하여 이미지를 분석하는 함수 (거부 방지 로직 포함)
    
    Args:
        image_path (str): 분석할 이미지 파일 경로
        prompt (str): GPT에게 전달할 프롬프트
        rag_context (dict): RAG 검색 결과 (선택사항)
        max_retries (int): 최대 재시도 횟수
        
    Returns:
        str: GPT 분석 결과 텍스트
    """
    # 거부 응답 패턴 정의
    rejection_patterns = [
        "I'm unable to",
        "I can't provide an analysis",
        "I'm sorry",
        "죄송합니다",
        "죄송하지만",
        "분석할 수 없습니다",
        "분석하기 어렵습니다",
        "정확하게 분석하기 어렵습니다",
        "인식을 하기 굉장히 어렵습니다",
        "이미지를 분석하기 어렵습니다",
        "추가 정보나 설명을 제공해 주시면",
        "하지만 일반적인",
        "예를 들어 설명할 수 있습니다",
        "이미지를 인식할 수 없습니다"
    ]
    
    for attempt in range(max_retries):
        try:
            # 재시도 시 프롬프트 강화
            if attempt > 0:
                enhanced_prompt = f"""
{prompt}

[중요] 이전 시도에서 이미지 분석이 거부되었습니다. 
이번에는 반드시 이미지의 시각적 요소들을 관찰하여 HTP 심리검사 분석을 수행해주세요.
이미지가 흐리거나 불분명하더라도 보이는 요소들(선, 모양, 크기, 위치 등)을 바탕으로 분석해주세요.
완전한 거부보다는 관찰 가능한 요소라도 분석해주시기 바랍니다.
"""
            else:
                enhanced_prompt = prompt

            # 🚀 이미지 최적화: 이미 YOLO에서 320x320으로 압축된 이미지인지 확인
            try:
                import os
                from PIL import Image
                
                # 파일 크기와 이미지 크기 확인
                file_size = os.path.getsize(image_path)
                with Image.open(image_path) as img:
                    img_size = img.size
                
                # 이미 작은 이미지(YOLO 처리된)이면 추가 압축 없이 사용
                if img_size[0] <= 320 and img_size[1] <= 320 and file_size < 50000:  # 50KB 미만
                    print(f"📸 이미 최적화된 이미지 감지: {img_size}, {file_size:,} bytes - 추가 압축 생략")
                    with open(image_path, 'rb') as f:
                        img_base64 = base64.b64encode(f.read()).decode('utf-8')
                    compression_info = {
                        'original_file_size': file_size,
                        'compressed_size': file_size,
                        'compression_ratio': 0,
                        'original_dimensions': img_size,
                        'compressed_dimensions': img_size
                    }
                else:
                    print(f"📸 큰 이미지 감지: {img_size}, {file_size:,} bytes - GPT용 압축 적용")
                    img_base64, compression_info = optimize_image_for_gpt(image_path, max_size=(1024, 1024), quality=85)
                    
            except Exception as e:
                print(f"⚠️ 이미지 크기 확인 실패, 기본 압축 적용: {e}")
                img_base64, compression_info = optimize_image_for_gpt(image_path, max_size=(1024, 1024), quality=85)
            
            # 압축 결과 로그
            print(f"이미지 파일 크기: {compression_info['original_file_size']:,} bytes")
            if 'error' not in compression_info:
                print(f"처리 후 크기: {compression_info['compressed_size']:,} bytes")
                print(f"압축률: {compression_info['compression_ratio']}%")
                print(f"원본 크기: {compression_info['original_dimensions']}")
                print(f"처리 후 크기: {compression_info['compressed_dimensions']}")
            
            data_url = f"data:image/jpeg;base64,{img_base64}"
            print(f"MIME 타입: image/jpeg")
            print(f"Base64 길이: {len(img_base64)}")
            
            # 메시지 컨텐츠 구성
            content = [
                {"type": "text", "text": enhanced_prompt},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]
            
            # RAG 컨텍스트 추가
            if rag_context:
                rag_text = f"\n\n[참고 자료]\n문서: {rag_context['document']} - {rag_context['element']}\n내용: {rag_context['text']}"
                content.append({"type": "text", "text": rag_text})

            import time
            gpt_start_time = time.time()
            gpt_start_datetime = datetime.now()
            print(f"🤖 [TIMING] GPT API 호출 시작: {gpt_start_datetime.strftime('%H:%M:%S.%f')[:-3]} (시도 {attempt + 1}/{max_retries})")
            
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 HTP(House-Tree-Person) 심리검사 전문 분석가입니다. JSON 형식으로 응답해 주세요."},
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            gpt_end_time = time.time()
            gpt_duration = gpt_end_time - gpt_start_time
            gpt_end_datetime = datetime.now()
            print(f"✅ [TIMING] GPT API 호출 완료: {gpt_end_datetime.strftime('%H:%M:%S.%f')[:-3]}")
            print(f"⏱️  [TIMING] GPT API 소요시간: {gpt_duration:.2f}초")
            
            result_text = response.choices[0].message.content.strip()
            
            # 거부 응답 패턴 확인
            is_rejection = False
            for pattern in rejection_patterns:
                if pattern.lower() in result_text.lower():
                    is_rejection = True
                    print(f"거부 응답 패턴 감지: '{pattern}' (시도 {attempt + 1}/{max_retries})")
                    break
            
            # 거부 응답이 아니거나 마지막 시도라면 결과 반환
            if not is_rejection or attempt == max_retries - 1:
                if is_rejection and attempt == max_retries - 1:
                    print(f"경고: 모든 재시도가 실패했습니다. 마지막 응답을 반환합니다.")
                return result_text
            
            # 재시도 전 잠시 대기
            print(f"거부 응답으로 인한 재시도 대기 중... (2초)")
            time.sleep(2)
            
        except Exception as e:
            print(f"GPT API 호출 실패 (시도 {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                raise
            # 재시도 전 잠시 대기
            import time
            time.sleep(2)
    
    return "분석을 완료할 수 없습니다."


def analyze_image_gpt(image_base):
    """GPT와 OpenSearch RAG를 사용하여 이미지 분석을 수행하는 함수
    
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
    
    import time
    analysis_start_time = time.time()
    
    try:
        # 1차 GPT 해석 (초기 분석 - JSON)
        print("1단계: 초기 심리 분석 수행 중...")
        initial_analysis_text = analyze_image_with_gpt(image_path, PROMPT)
        
        try:
            initial_analysis = json.loads(initial_analysis_text)
            print("초기 분석 JSON 파싱 성공")
        except json.JSONDecodeError:
            print("초기 분석 JSON 파싱 실패, 텍스트로 처리 시도")
            # 실패 시 기본 구조 생성
            initial_analysis = {
                "features": {"overall": ["분석 실패"]}, 
                "keywords": [], 
                "summary": initial_analysis_text
            }

        # 심리 분석 요소 추출 (JSON에서 키워드 및 특징 추출)
        print("\n2단계: 심리 분석 요소 추출 중...")
        psychological_elements = []
        if "keywords" in initial_analysis:
            psychological_elements.extend(initial_analysis["keywords"])
        
        if "features" in initial_analysis:
            for category, features in initial_analysis["features"].items():
                psychological_elements.extend(features)
                
        print(f"추출된 요소들 (상위 10개): {psychological_elements[:10]}")
        
        # OpenSearch RAG 검색
        print("\n3단계: RAG 시스템을 통한 관련 자료 검색 중...")
        rag_result = search_rag_documents(psychological_elements[:5]) # 상위 5개만 사용
        
        final_analysis = initial_analysis
        
        if rag_result:
            print(f"검색된 관련 자료: {rag_result['document']} - {rag_result['element']}")
            
            # RAG 컨텍스트를 포함한 최종 분석 (JSON 형식 유지)
            print("\n4단계: RAG 컨텍스트를 활용한 최종 분석 수행 중...")
            final_prompt = f"""
            아래는 심리 그림 검사의 초기 분석 결과입니다:
            {json.dumps(initial_analysis, ensure_ascii=False, indent=2)}

            참고 자료:
            문서: {rag_result['document']} - {rag_result['element']}
            내용: {rag_result['text']}

            위 분석 결과와 참고 자료를 바탕으로, 더욱 정확하고 전문적인 최종 심리 분석을 JSON 형식으로 다시 작성해 주세요.
            초기 분석의 구조를 유지하되, 내용을 보강해 주세요.
            """
            
            final_analysis_text = analyze_image_with_gpt(image_path, final_prompt)
            try:
                final_analysis = json.loads(final_analysis_text)
                print("최종 분석 JSON 파싱 성공")
            except json.JSONDecodeError:
                print("최종 분석 JSON 파싱 실패, 초기 분석 결과 사용")

        # 결과 구성
        result_text = final_analysis.get("summary", "")
        if not result_text and "psychological_analysis" in final_analysis:
             # summary가 없으면 해석을 합쳐서 생성
             analysis = final_analysis["psychological_analysis"]
             result_text = f"집: {analysis.get('house', '')}\n나무: {analysis.get('tree', '')}\n사람: {analysis.get('person', '')}"

        # 감정 키워드 추출
        enriched = []
        if rag_result:
            enriched.append({
                'element': rag_result['element'],
                'condition': rag_result['text'][:100] + '...' if len(rag_result['text']) > 100 else rag_result['text'],
                'keywords': rag_result['metadata'].get('keywords', [])
            })

        result = {
            "raw_text": json.dumps(final_analysis, ensure_ascii=False), # 호환성을 위해 JSON 문자열 저장
            "result_text": result_text,
            "items": enriched,
            "rag_context": rag_result,
            "parsed_result": final_analysis # 파싱된 결과도 저장
        }
        
        analysis_end_time = time.time()
        print(f"✅ [TIMING] 심리 분석 전체 완료: {analysis_end_time - analysis_start_time:.2f}초")
        
        return result

    except Exception as e:
        print(f"분석 실패 - 상세 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

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
