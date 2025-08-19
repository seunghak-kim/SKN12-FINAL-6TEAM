# OpenSearch Modular System

모듈화된 OpenSearch 임베딩 시스템으로 RAG 파이프라인과 요약 생성 기능을 포함합니다.

## 🏗️ 아키텍처

```
├── opensearch_modules/           # 모듈화된 컴포넌트들
│   ├── __init__.py              # 모듈 진입점
│   ├── opensearch_config.py     # 설정 관리
│   ├── opensearch_client.py     # OpenSearch 연결 관리
│   ├── embedding_manager.py     # 임베딩 및 리랭킹 관리
│   ├── search_engine.py         # 검색 엔진 및 인덱스 관리
│   ├── rag_processor.py         # RAG 데이터 처리
│   └── summary_generator.py     # 요약 생성
├── opensearch.py                # 메인 클라이언트 (하위 호환성)
├── example_usage.py             # 사용 예제
├── config_example.json          # 설정 예제
├── .env.example                 # 환경변수 예제
└── README_modular.md            # 사용 가이드
```

## 🚀 주요 기능

### 1. 모듈화된 구조
- **설정 관리**: 환경변수 및 JSON 설정 지원
- **연결 관리**: OpenSearch 연결 추상화
- **임베딩 관리**: KURE-v1 및 리랭킹 모델 관리
- **검색 엔진**: 벡터, 하이브리드, 고급 검색
- **RAG 처리**: 파이프라인 통합 및 컨텍스트 준비
- **요약 생성**: 다양한 요약 전략

### 2. RAG 파이프라인 지원
- 원시 문서 처리 및 청킹
- 컨텍스트 준비 및 최적화
- 지식 기반 요약 생성

### 3. 고급 검색 기능
- 벡터 유사도 검색
- 하이브리드 검색 (벡터 + 텍스트)
- Reciprocal Rank Fusion
- 리랭킹 (BGE reranker)

## 📦 설치

```bash
pip install opensearch-py sentence-transformers scikit-learn tqdm
```

## ⚙️ 설정

### 환경변수 설정
```bash
export OPENSEARCH_HOST=localhost
export OPENSEARCH_PORT=9200
export OPENSEARCH_USERNAME=admin
export OPENSEARCH_PASSWORD=MyStrongPassword123!
export EMBEDDING_MODEL=nlpai-lab/KURE-v1
export RERANKER_MODEL=BAAI/bge-reranker-v2-m3
```

### JSON 설정 파일
```python
from opensearch_config import ConfigManager

# config_example.json 파일 사용
with open('config_example.json', 'r') as f:
    config_dict = json.load(f)

config = ConfigManager.from_dict(config_dict)
```

## 🎯 사용 예제

### 기본 사용법
```python
from opensearch import OpenSearchEmbeddingClient

# 기본 설정으로 초기화
client = OpenSearchEmbeddingClient()

# 인덱스 생성
client.create_embedding_index("my_index")

# 데이터 인덱싱
client.index_embedding_data("my_index", "./embeddings")

# 검색
results = client.vector_search("my_index", "검색 쿼리", k=5)

# 연결 종료
client.close()
```

### 커스텀 설정
```python
from opensearch_modules import ConfigManager
from opensearch import OpenSearchEmbeddingClient

# 커스텀 설정
config = ConfigManager()
config.opensearch.host = "my_host"
config.rag.top_k_docs = 20

client = OpenSearchEmbeddingClient(config=config)
```

### RAG 파이프라인
```python
# 포괄적 요약 생성
summary = client.generate_comprehensive_summary("my_index")

# RAG 최적화 요약
rag_summary = client.generate_rag_optimized_summary(
    "my_index", 
    query_context="불안과 스트레스"
)

# RAG 컨텍스트 준비
context = client.prepare_rag_context(
    "그림에서 눈의 의미는?", 
    "my_index"
)
```

### 고급 검색
```python
# 다양한 검색 전략
results = client.advanced_search(
    index_name="my_index",
    query_text="자존감 관련",
    strategy="comprehensive",  # "auto", "fast", "comprehensive"
    k=10
)

# 특정 요소 검색
eye_results = client.search_by_element("my_index", "눈", k=5)

# 하이브리드 검색
hybrid_results = client.hybrid_search(
    "my_index", 
    "검색어",
    boost_vector=1.0,
    boost_text=0.5
)
```

### 문서 처리
```python
# 원시 마크다운 문서 처리
processed_data = client.process_raw_documents(
    "./data/md/rag_doc_person.md", 
    "person"
)

# 처리된 데이터 저장
client.rag_processor.save_processed_data(
    processed_data, 
    "./output/processed_person.json"
)
```

## 🔧 모듈별 세부 사용

### 설정 관리
```python
from opensearch_modules import ConfigManager, OpenSearchConfig

# 환경변수에서 로드
config = ConfigManager()

# 직접 설정
opensearch_config = OpenSearchConfig(
    host="localhost",
    port=9200,
    username="admin",
    password="password"
)
```

### 연결 관리
```python
from opensearch_modules import OpenSearchConnection, OpenSearchConfig

config = OpenSearchConfig()
with OpenSearchConnection(config) as conn:
    # OpenSearch 클라이언트 사용
    info = conn.client.info()
```

### 임베딩 관리
```python
from opensearch_modules import EmbeddingManager, EmbeddingConfig

config = EmbeddingConfig()
embedding_manager = EmbeddingManager(config)

# 텍스트 인코딩
embedding = embedding_manager.encode_text("텍스트")

# 배치 인코딩
embeddings = embedding_manager.encode_batch(["텍스트1", "텍스트2"])

# 리랭킹
scored_indices = embedding_manager.rerank_results(
    "쿼리", 
    ["문서1", "문서2"], 
    [0.8, 0.6]
)
```

### 검색 엔진
```python
from opensearch_modules import SearchEngine, IndexManager

search_engine = SearchEngine(connection, embedding_manager)

# 벡터 검색
results = search_engine.vector_search("index", "쿼리", k=10)

# 결과 융합
fused = search_engine.reciprocal_rank_fusion(
    [results1, results2], 
    weights=[0.6, 0.4]
)
```

### RAG 처리
```python
from opensearch_modules import RAGDataProcessor

rag_processor = RAGDataProcessor(
    connection, embedding_manager, 
    search_engine, index_manager, config
)

# 문서 처리
processed = rag_processor.process_raw_documents("file.md", "person")

# 컨텍스트 준비
context = rag_processor.prepare_rag_context("쿼리", "index")
```

### 요약 생성
```python
from opensearch_modules import SummaryGenerator

summary_generator = SummaryGenerator(search_engine, config)

# 포괄적 요약
summary = summary_generator.generate_comprehensive_summary("index")

# 요소별 요약
element_summary = summary_generator.generate_element_summary("index", "눈")

# RAG 최적화 요약
rag_summary = summary_generator.generate_rag_optimized_summary(
    "index", 
    "컨텍스트"
)
```

## 📊 성능 및 최적화

### 검색 전략
- **fast**: 벡터 검색 + 리랭킹 (빠름)
- **auto**: 벡터 + 하이브리드 + 융합 + 리랭킹 (균형)
- **comprehensive**: 모든 검색 방법 조합 (정확함)

### 메모리 최적화
- 배치 크기 조정 (`chunk_size`)
- 임베딩 차원 최적화 (`embedding_dimension`)
- 캐시 활용 (모델 로딩)

### 인덱스 최적화
- HNSW 파라미터 튜닝 (`ef_construction`, `m_parameter`)
- 샤드 및 복제본 설정
- 필드 매핑 최적화

## 🔍 디버깅 및 로깅

```python
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 클라이언트 초기화 시 로그 확인
client = OpenSearchEmbeddingClient()  # 로그 출력됨
```

## 🚨 에러 처리

```python
try:
    client = OpenSearchEmbeddingClient()
    results = client.vector_search("index", "query")
except ConnectionError:
    print("OpenSearch 연결 실패")
except ValueError:
    print("잘못된 설정값")
except Exception as e:
    print(f"예상치 못한 오류: {e}")
finally:
    if 'client' in locals():
        client.close()
```

## 📈 모니터링

```python
# 인덱스 통계 확인
stats = client.get_index_stats("index_name")
print(f"문서 수: {stats['total_docs']}")
print(f"인덱스 크기: {stats['index_size']} bytes")

# 검색 성능 측정
import time
start = time.time()
results = client.advanced_search("index", "query")
end = time.time()
print(f"검색 시간: {end - start:.2f}초")
```

## 🔄 마이그레이션

기존 `opensearch.py` 코드는 그대로 작동하며, 새로운 모듈 기능을 점진적으로 적용할 수 있습니다:

```python
# 기존 코드 (계속 작동)
client = OpenSearchEmbeddingClient()

# 새로운 기능 추가
summary = client.generate_comprehensive_summary("index")
rag_context = client.prepare_rag_context("query", "index")
```

## 💡 팁

1. **설정 관리**: 환경변수를 활용하여 배포 환경별 설정 분리
2. **모델 로딩**: 애플리케이션 시작 시 한 번만 로딩하여 성능 향상
3. **배치 처리**: 대량 데이터 처리 시 배치 크기 조정
4. **리소스 관리**: `client.close()`로 연결 정리
5. **에러 핸들링**: try-except 블록으로 안정성 확보

## 📝 라이선스

이 모듈화된 시스템은 기존 OpenSearch 시스템의 확장이며, 동일한 라이선스를 따릅니다.