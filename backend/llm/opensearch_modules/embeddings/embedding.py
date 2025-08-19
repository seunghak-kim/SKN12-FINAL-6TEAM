# 임베딩 모델 만들고 테스트 
import os 
import glob 
import json 
import numpy as np
from tqdm import tqdm 
import re 
from collections import defaultdict 

from sentence_transformers import SentenceTransformer
# 1. 모델 로드 (KURE - v1) - 1024차원 벡터
model = SentenceTransformer("nlpai-lab/KURE-v1")
model.max_seq_length = 8192  # 최대 시퀀스 길이 설정


# md 파일 로드  
def load_md_file(md_dir):
    md_files = glob.glob(os.path.join(md_dir, "*.md"))
    docs = []
    for path in md_files:
        with open(path, "r", encoding="utf-8") as f:
            docs.append({
                "filename" : os.path.basename(path),
                "content" : f.read()
            })
    return docs 

# 요소기준으로 앞뒤 청킹 작업  
def chunk_by_elements(data:dict):
    """
    요소 기준으로 데이터를 chunking 하는 함수 
    """
    if isinstance(data, dict):
        text = data.get('content', '')
    else: 
        text = data 
    # 각 항목을 분리 (- 요소: 로 시작하는 부분 기준)
    items = re.split(r'\n(?=- 요소:)', text.strip())
    
    # 요소별로 그룹화할 딕셔너리 
    element_groups = defaultdict(list)
    
    for item in items:
        if not item.strip():
            continue
        # 각 항목에서 정보 추출 
        lines = item.strip().split('\n')
        # 요소 추출 
        element_line = lines[0]
        elements = element_line.replace('- 요소:', '').strip()
        # 개별  요소들로 분리 
        individual_elements = [elem.strip() for elem in elements.split(',')]
        # 나머지 정보 추출 
        item_data = {
            'original_elements': elements,
            'conditions': [],
            'keywords': [],
            'explanations': [],
            'images': []
        }
        
        for line in lines[1:]:
            line = line.strip()
            if line.startswith('- 조건:'):
                item_data['conditions'].append(line.replace('- 조건:', '').strip())
            elif line.startswith('- 감정 키워드:'):
                item_data['keywords'].append(line.replace('- 감정 키워드:', '').strip())
            elif line.startswith('- 해석 설명:'):
                item_data['explanations'].append(line.replace('- 해석 설명:', '').strip())
            elif line.startswith('- 관련 이미지 예시:'):
                item_data['images'].append(line.replace('- 관련 이미지 예시:', '').strip())
                
        # 각 개별 요소에 대해 데이터 추가
        for element in individual_elements:
            element_groups[element].append(item_data)
    
    return element_groups

def fomatted_chunked_data(element_groups):
    """
    chunking된 데이터를 보기 좋게 포맷팅
    """
    result = []
    
    for element, items in element_groups.items():
        result.append(f"\n=== {element} ===")
        
        for i, item in enumerate(items, 1):
            result.append(f"\n[항목 {i}]")
            result.append(f"원본 요소: {item['original_elements']}")
            
            if item['conditions']:
                result.append(f"조건: {'; '.join(item['conditions'])}")
            
            if item['keywords']:
                result.append(f"감정 키워드: {'; '.join(item['keywords'])}")
            
            if item['explanations']:
                result.append(f"해석 설명: {'; '.join(item['explanations'])}")
            
            if item['images']:
                result.append(f"관련 이미지: {'; '.join(item['images'])}")
    
    return '\n'.join(result)

def create_embeddings_for_chunks(element_groups, filename, model):
    """
    각 요소 chunk에 대해 임베딩을 생성하는 함수
    """
    embeddings_data = {}
    
    for element, items in tqdm(element_groups.items(), desc=f"Creating embeddings for {filename}"):
        element_embeddings = []
        
        for item in items:
            # 임베딩할 텍스트 생성 (조건, 키워드, 설명을 모두 포함)
            text_parts = []
            text_parts.append(f"요소: {element}")
            
            if item['conditions']:
                text_parts.append(f"조건: {'; '.join(item['conditions'])}")
            
            if item['keywords']:
                text_parts.append(f"감정 키워드: {'; '.join(item['keywords'])}")
            
            if item['explanations']:
                text_parts.append(f"해석 설명: {'; '.join(item['explanations'])}")
            
            # 전체 텍스트 생성
            full_text = ' '.join(text_parts)
            
            # 임베딩 생성
            embedding = model.encode(full_text)
            
            # 데이터 저장
            element_embeddings.append({
                'text': full_text,
                'embedding': embedding.tolist(),  # numpy array를 list로 변환
                'metadata': {
                    'original_elements': item['original_elements'],
                    'conditions': item['conditions'],
                    'keywords': item['keywords'],
                    'explanations': item['explanations'],
                    'images': item['images']
                }
            })
        
        embeddings_data[element] = element_embeddings
    
    return embeddings_data

def save_embeddings_to_file(embeddings_data, filename, output_dir):
    """
    임베딩 데이터를 파일로 저장하는 함수
    """
    # 파일명에서 확장자 제거
    base_filename = os.path.splitext(filename)[0]
    
    # 임베딩 파일 저장
    embedding_file = os.path.join(output_dir, f"{base_filename}_embeddings.json")
    
    with open(embedding_file, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, ensure_ascii=False, indent=2)
    
    print(f"임베딩 데이터 저장 완료: {embedding_file}")
    
    # 요약 정보 저장
    summary = {}
    for element, items in embeddings_data.items():
        summary[element] = {
            'count': len(items),
            'embedding_dim': len(items[0]['embedding']) if items else 0
        }
    
    summary_file = os.path.join(output_dir, f"{base_filename}_summary.json")
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"요약 정보 저장 완료: {summary_file}")

def process_all_documents(md_dir, output_dir, model):
    """
    모든 문서에 대해 임베딩 처리를 수행하는 함수
    """
    # 출력 디렉토리 생성
    os.makedirs(output_dir, exist_ok=True)
    
    # 모든 md 파일 로드
    docs = load_md_file(md_dir)
    
    for doc in docs:
        print(f"\n처리 중인 문서: {doc['filename']}")
        
        # 청킹 수행
        chunked_data = chunk_by_elements(doc)
        print(f"총 요소 수: {len(chunked_data)}")
        
        # 임베딩 생성
        embeddings_data = create_embeddings_for_chunks(chunked_data, doc['filename'], model)
        
        # 파일로 저장
        save_embeddings_to_file(embeddings_data, doc['filename'], output_dir)


if __name__ == '__main__':
    # 설정
    md_dir = '../../data/md'
    output_dir = '.'
    
    print("=== 문서 임베딩 처리 시작 ===")
    
    # 모든 문서 처리
    process_all_documents(md_dir, output_dir, model)
    
    print("\n=== 모든 문서 임베딩 처리 완료 ===")
    
    # 결과 확인을 위한 예시 출력
    print("\n=== 임베딩 파일 확인 ===")
    if os.path.exists(output_dir):
        embedding_files = glob.glob(os.path.join(output_dir, "*_embeddings.json"))
        summary_files = glob.glob(os.path.join(output_dir, "*_summary.json"))
        
        print(f"생성된 임베딩 파일: {len(embedding_files)}개")
        print(f"생성된 요약 파일: {len(summary_files)}개")
        
        for f in embedding_files:
            print(f"  - {os.path.basename(f)}")
        for f in summary_files:
            print(f"  - {os.path.basename(f)}")
    
    # 간단한 테스트를 위한 예시 데이터 로드
    print("\n=== 임베딩 데이터 예시 ===")
    docs = load_md_file(md_dir)
    if docs:
        test_doc = docs[0]
        print(f"테스트 문서: {test_doc['filename']}")
        chunked_data = chunk_by_elements(test_doc)
        print(f"총 요소 수: {len(chunked_data)}")
        
        # 첫 번째 요소의 첫 번째 항목만 임베딩 테스트
        first_element = list(chunked_data.keys())[0]
        first_item = chunked_data[first_element][0]
        
        text_parts = [f"요소: {first_element}"]
        if first_item['conditions']:
            text_parts.append(f"조건: {'; '.join(first_item['conditions'])}")
        if first_item['keywords']:
            text_parts.append(f"감정 키워드: {'; '.join(first_item['keywords'])}")
        
        test_text = ' '.join(text_parts)
        test_embedding = model.encode(test_text)
        
        print(f"예시 텍스트: {test_text[:100]}...")
        print(f"임베딩 차원: {test_embedding.shape}")
        print(f"임베딩 샘플: {test_embedding[:5]}")