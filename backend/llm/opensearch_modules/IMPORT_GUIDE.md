# Import Guide for Pipeline Integration

## 새로운 모듈 구조로 변경된 Import 방법

### ❌ 이전 방식 (더 이상 사용 불가)

```python
# 직접 import (작동하지 않음)
from opensearch_config import ConfigManager
from opensearch_client import OpenSearchConnection
from embedding_manager import EmbeddingManager
```

### ✅ 새로운 방식 (권장)

#### 1. 메인 클라이언트 사용 (가장 간단)

```python
from opensearch import OpenSearchEmbeddingClient

# 기본 설정으로 사용
client = OpenSearchEmbeddingClient()

# 또는 커스텀 설정
client = OpenSearchEmbeddingClient(
    host='localhost',
    port=9200,
    model_name='nlpai-lab/KURE-v1'
)
```

#### 2. 모듈별 직접 사용 (고급 사용자)

```python
from opensearch_modules import (
    ConfigManager,
    OpenSearchConnection,
    EmbeddingManager,
    SearchEngine,
    RAGDataProcessor,
    SummaryGenerator
)

# 개별 컴포넌트 사용
config = ConfigManager()
connection = OpenSearchConnection(config.opensearch)
embedding_manager = EmbeddingManager(config.embedding)
```

## Pipeline 파일에서 사용 예제

### main.py나 다른 pipeline 파일에서

```python
import sys
from pathlib import Path

# OpenSearch 모듈 경로 추가
llm_path = Path(__file__).parent.parent / 'llm'
sys.path.insert(0, str(llm_path))

# Import
from opensearch import OpenSearchEmbeddingClient

class HTPAnalysisPipeline:
    def __init__(self):
        # OpenSearch 클라이언트 초기화
        self.opensearch_client = OpenSearchEmbeddingClient()

    def generate_summary(self, query: str, context_data: dict):
        """RAG 요약 생성"""
        # RAG 최적화 요약 생성
        summary = self.opensearch_client.generate_rag_optimized_summary(
            index_name="psychology_analysis",
            query_context=query
        )

        # 컨텍스트 준비
        context = self.opensearch_client.prepare_rag_context(
            query=query,
            index_name="psychology_analysis",
            max_context_length=2000
        )

        return {
            'summary': summary,
            'context': context
        }
```

### API 파일에서 (pipeline.py 등)

```python
# 절대경로로 import
import sys
from pathlib import Path

llm_module_path = Path(__file__).parent.parent.parent / 'llm'
sys.path.insert(0, str(llm_module_path))

try:
    from opensearch import OpenSearchEmbeddingClient
    OPENSEARCH_AVAILABLE = True
except ImportError as e:
    print(f"OpenSearch 모듈 import 실패: {e}")
    OPENSEARCH_AVAILABLE = False

def get_opensearch_client():
    """OpenSearch 클라이언트 가져오기"""
    if not OPENSEARCH_AVAILABLE:
        raise RuntimeError("OpenSearch 모듈을 사용할 수 없습니다")

    return OpenSearchEmbeddingClient()
```

## 환경변수 설정

### .env 파일 또는 환경변수

```bash
# OpenSearch 설정
OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=MyStrongPassword123!

# 임베딩 모델 설정
EMBEDDING_MODEL=nlpai-lab/KURE-v1
RERANKER_MODEL=BAAI/bge-reranker-v2-m3

# RAG 설정
TOP_K_DOCS=10
RERANK_TOP_K=5
```

## 주요 메서드

### 요약 생성 관련

```python
client = OpenSearchEmbeddingClient()

# 1. 포괄적 요약
comprehensive_summary = client.generate_comprehensive_summary("psychology_analysis")

# 2. 특정 요소 요약
element_summary = client.generate_element_summary("psychology_analysis", "눈")

# 3. RAG 최적화 요약 (pipeline에서 주로 사용)
rag_summary = client.generate_rag_optimized_summary(
    "psychology_analysis",
    query_context="불안과 스트레스 관련 심리적 특성"
)

# 4. RAG 컨텍스트 준비
context = client.prepare_rag_context(
    "그림에서 눈의 크기가 큰 경우의 심리적 의미",
    "psychology_analysis"
)
```

### 검색 관련

```python
# 고급 검색
results = client.advanced_search(
    index_name="psychology_analysis",
    query_text="자존감 관련 특성",
    strategy="comprehensive",  # "auto", "fast", "comprehensive"
    k=10
)

# 벡터 검색
vector_results = client.vector_search(
    "psychology_analysis",
    "그림에서 나타나는 불안 증상",
    k=5
)
```

## 에러 처리

```python
try:
    client = OpenSearchEmbeddingClient()
    summary = client.generate_rag_optimized_summary("index", "query")

except ConnectionError:
    print("OpenSearch 서버에 연결할 수 없습니다")
except ImportError:
    print("필요한 라이브러리가 설치되지 않았습니다")
except Exception as e:
    print(f"예상치 못한 오류: {e}")
finally:
    if 'client' in locals():
        client.close()
```

## 디렉토리 구조 참고

```
backend/
├── llm/
│   ├── opensearch_modules/     # 모듈화된 컴포넌트
│   │   ├── __init__.py
│   │   ├── opensearch_config.py
│   │   ├── opensearch_client.py
│   │   ├── embedding_manager.py
│   │   ├── search_engine.py
│   │   ├── rag_processor.py
│   │   └── summary_generator.py
│   ├── opensearch.py           # 메인 클라이언트
│   └── example_usage.py        # 사용 예제
├── app/
│   └── api/
│       └── pipeline.py         # API 파일
└── llm/
    └── model/
        └── main.py             # HTP 파이프라인
```

## 마이그레이션 체크리스트

### 기존 코드 수정 시

1. ✅ `from opensearch_config import` → `from opensearch_modules import`
2. ✅ `from opensearch_client import` → `from opensearch_modules import`
3. ✅ `from embedding_manager import` → `from opensearch_modules import`
4. ✅ `from search_engine import` → `from opensearch_modules import`
5. ✅ `from rag_processor import` → `from opensearch_modules import`
6. ✅ `from summary_generator import` → `from opensearch_modules import`

### 새로운 기능 사용 시

1. ✅ RAG 요약: `client.generate_rag_optimized_summary()`
2. ✅ 컨텍스트 준비: `client.prepare_rag_context()`
3. ✅ 포괄적 요약: `client.generate_comprehensive_summary()`
4. ✅ 고급 검색: `client.advanced_search()`

이 가이드를 참조하여 pipeline 파일들을 업데이트하시면 됩니다!
