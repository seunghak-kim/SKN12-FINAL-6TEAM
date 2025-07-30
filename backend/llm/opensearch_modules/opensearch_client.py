"""
OpenSearch Client Connection Manager
"""

import os
import json
import glob
import numpy as np
from opensearchpy import OpenSearch
from opensearchpy.helpers import bulk
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any, Optional, Tuple
import re
from collections import defaultdict
from tqdm import tqdm
import logging

from opensearch_config import OpenSearchConfig

logger = logging.getLogger(__name__)


class OpenSearchConnection:
    """OpenSearch connection manager"""
    
    def __init__(self, config: OpenSearchConfig):
        self.config = config
        self._client: Optional[OpenSearch] = None
    
    @property
    def client(self) -> OpenSearch:
        """Get OpenSearch client, creating connection if needed"""
        if self._client is None:
            self._connect()
        return self._client
    
    def _connect(self):
        """Establish OpenSearch connection"""
        try:
            auth = (self.config.username, self.config.password) if self.config.username and self.config.password else None
            
            self._client = OpenSearch(
                hosts=[{'host': self.config.host, 'port': self.config.port}],
                http_auth=auth,
                use_ssl=self.config.use_ssl,
                verify_certs=self.config.verify_certs,
                ssl_assert_hostname=self.config.ssl_assert_hostname,
                ssl_show_warn=self.config.ssl_show_warn,
                timeout=self.config.timeout
            )
            
            # Test connection
            self._client.info()
            logger.info(f"OpenSearch connection successful: {self.config.host}:{self.config.port}")
            
        except Exception as e:
            logger.error(f"OpenSearch connection failed: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Test OpenSearch connection"""
        try:
            self.client.info()
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
    
    def close(self):
        """Close OpenSearch connection"""
        if self._client:
            self._client.close()
            self._client = None
            logger.info("OpenSearch connection closed")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class OpenSearchEmbeddingClient:
    """Complete OpenSearch embedding client with KURE-v1 and reranker support"""
    
    def __init__(self, host: str = 'localhost', port: int = 9200, 
                 username: str = 'admin', password: str = 'MyStrongPassword123!', 
                 model_name: str = 'nlpai-lab/KURE-v1',
                 reranker_model: str = "BAAI/bge-reranker-v2-m3"):
        """
        OpenSearch 임베딩 클라이언트 초기화 (KURE-v1 기반 + Reranker)
        
        Args:
            host: OpenSearch 호스트
            port: OpenSearch 포트
            username: 인증 사용자명
            password: 인증 비밀번호
            model_name: KURE-v1 임베딩 모델
            reranker_model: 리랭킹 모델 (BGE reranker 또는 다른 CrossEncoder)
        """
        # OpenSearch 연결 설정
        try:
            auth = (username, password) if username and password else None
            self.client = OpenSearch(
                hosts=[{'host': host, 'port': port}],
                http_auth=auth,
                use_ssl=True,
                verify_certs=False,
                ssl_assert_hostname=False,
                ssl_show_warn=False,
                timeout=30
            )
            # 연결 테스트
            self.client.info()
            print(f"OpenSearch 연결 성공: {host}:{port}")
        except Exception as e:
            print(f"OpenSearch 연결 실패: {e}")
            raise
        
        # KURE-v1 모델 로드 
        try:
            self.model = SentenceTransformer(model_name)
            self.model.max_seq_length = 8192
            print(f"임베딩 모델 로드 성공: {model_name}")
        except Exception as e:
            print(f"임베딩 모델 로드 실패: {e}")
            raise
            
        # 리랭킹 모델 로드
        try: 
            self.reranker = CrossEncoder(reranker_model)
            self.reranker_available = True
            print(f"Reranker 모델 로드 성공: {reranker_model}")
        except Exception as e:
            print(f"Reranker 모델 로드 실패: {e}")
            self.reranker = None 
            self.reranker_available = False
    
    def create_embedding_index(self, index_name: str, embedding_dimension: int = None):
        """
        심리 분석용 임베딩 인덱스 생성 (KURE-v1 기반)
        """
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "document": {"type": "keyword"},  # person, house, tree
                    "element": {"type": "keyword"},   # 눈, 크기, 위치 등
                    "text": {"type": "text", "analyzer": "standard"},
                    "metadata": {
                        "properties": {
                            "original_elements": {"type": "text"},
                            "conditions": {"type": "text"},
                            "keywords": {"type": "keyword"},
                            "explanations": {"type": "text"},
                            "images": {"type": "keyword"}
                        }
                    },
                    "embedding": {
                        "type": "knn_vector",
                        "dimension": 1024,  # KURE-v1 차원 (1024)
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "lucene",
                            "parameters": {
                                "ef_construction": 128,
                                "m": 24
                            }
                        }
                    },
                    "timestamp": {"type": "date"}
                }
            },
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": 100
                }
            }
        }
        try:
            if self.client.indices.exists(index=index_name):
                print(f"인덱스 '{index_name}'이 이미 존재합니다.")
                return True
            
            response = self.client.indices.create(index=index_name, body=mapping)
            print(f"인덱스 '{index_name}' 생성 완료: {response}")
            return True
        except Exception as e:
            print(f"인덱스 생성 실패: {e}")
            return False
    
    def load_embedding_files(self, embeddings_dir: str = './embeddings'):
        """
        생성된 임베딩 파일들을 로드 
        """
        embedding_files = [
            'rag_doc_person_embeddings.json',
            'rag_doc_house_embeddings.json', 
            'rag_doc_tree_embeddings.json'
        ]
        all_data = {}
        
        for filename in embedding_files:
            filepath = os.path.join(embeddings_dir, filename)
            
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    doc_name = filename.replace('_embeddings.json', '').replace('rag_doc_', '')
                    all_data[doc_name] = data
                    print(f"임베딩 파일 로드 성공: {filename}")
                except Exception as e:
                    print(f"임베딩 파일 로드 실패 {filename}: {e}")
            else:
                print(f"임베딩 파일 없음: {filepath}")
                
        return all_data
    
    def index_embedding_data(self, index_name: str, embeddings_dir: str = './embeddings'):
        """
        임베딩 데이터를 OpenSearch 인덱스에 인덱싱 
        """
        try:
            all_data = self.load_embedding_files(embeddings_dir)
            
            if not all_data:
                print("로드할 데이터가 없습니다.")
                return None
            
            actions = [] 
            doc_id = 0 
            
            for doc_name, doc_data in all_data.items():
                for element, items in tqdm(doc_data.items(), desc=f"Processing {doc_name}"):
                    for item in items:
                        if not isinstance(item, dict) or 'text' not in item or 'embedding' not in item:
                            print(f"잘못된 데이터 형식 건너뛰기: {doc_name}_{element}_{doc_id}")
                            continue
                            
                        action = {
                            "_index": index_name,
                            "_id": f"{doc_name}_{element}_{doc_id}",
                            "_source": {
                                "id": f"{doc_name}_{element}_{doc_id}",
                                "document": doc_name,
                                "element": element,
                                "text": item['text'],
                                "metadata": item.get('metadata', {}),
                                "embedding": item['embedding'],
                                "timestamp": "2025-07-29T00:00:00Z"
                            }
                        }
                        actions.append(action)
                        doc_id += 1
            
            if not actions:
                print("인덱싱할 데이터가 없습니다.")
                return None
            
            # 벌크 인덱싱 실행 
            print(f"{len(actions)}개 문서 인덱싱 시작...")
            response = bulk(self.client, actions, chunk_size=100)
            print(f"인덱싱 완료: {response}")
            return response
            
        except Exception as e:
            print(f"인덱싱 실패: {e}")
            return None
    
    def vector_search(self, index_name: str, query_text: str, 
                      k: int = 10, document_filter: List[str] = None,
                      element_filter: List[str] = None) -> List[Dict]:
        """
        백터 유사도 기반 검색 (Kure-v1 임베딩 사용)
        """
        try:
            # KURE-v1로 쿼리 임베딩 생성 
            query_embedding = self.model.encode(query_text).tolist()
        except Exception as e:
            print(f"쿼리 임베딩 생성 실패: {e}")
            return []
        
        # 기본 벡터 검색 쿼리 
        search_body = {
            "size": k,
            "query":{
                "bool": {
                    "must":[
                        {
                            "knn" :{
                                "embedding":{
                                    "vector": query_embedding,
                                    "k": k * 2,
                                }
                            }
                        }
                    ]
                }
            },
            "_source": ["id", "document", "element", "text", "metadata"]
        }
        
        # 필터 조건 추가 
        filters = [] 
        if document_filter:
            filters.append({"terms": {"document": document_filter}})
        if element_filter:
            filters.append({"terms": {"element": element_filter}})
        if filters:
            search_body["query"]["bool"]["filter"] = filters
            
        try:
            response = self.client.search(index=index_name, body=search_body)
            
            results = []
            
            for hit in response['hits']['hits']:
                source = hit['_source']
                results.append({
                    'id' : source['id'],
                    'document': source['document'],
                    'element': source['element'],
                    'text' : source['text'],
                    'metadata': source['metadata'],
                    'score': hit['_score']
                })
            
            return results
            
        except Exception as e:
            print(f"벡터 검색 실패: {e}")
            return []

    def rerank_results(self, query: str, results: List[Dict], 
                        top_k: int = None) -> List[Dict]:
        """
        검색 결과를 reranker로 재정렬
        """
        if not self.reranker_available or not results:
            return results[:top_k] if top_k else results
        
        # 쿼리와 문서 쌍 생성
        query_doc_pairs = [[query, result['text']] for result in results]
        
        # Reranker로 점수 계산
        scores = self.reranker.predict(query_doc_pairs)
        
        # 점수와 결과를 함께 정렬
        scored_results = list(zip(scores, results))
        scored_results.sort(key=lambda x: x[0], reverse=True)
        
        # 재정렬된 결과 생성
        reranked_results = []
        for score, result in scored_results:
            result_copy = result.copy()
            result_copy['rerank_score'] = float(score)
            reranked_results.append(result_copy)
        
        return reranked_results[:top_k] if top_k else reranked_results

    def advanced_search(self, index_name: str, query_text: str, 
                    search_strategy: str = "auto", k: int = 10,
                    document_filter: List[str] = None,
                    element_filter: List[str] = None) -> Dict[str, List[Dict]]:
        """
        고급 검색: 여러 전략을 조합하여 최적의 결과 제공
        """
        results = {
            "vector_search": [],
            "hybrid_search": [],
            "reranked_fusion": [],
            "final_recommendation": []
        }
        
        if search_strategy in ["auto", "comprehensive"]:
            # 1. 벡터 검색
            vector_results = self.vector_search(
                index_name, query_text, k=k*2, 
                document_filter=document_filter,
                element_filter=element_filter
            )
            results["vector_search"] = vector_results
            
            # 2. 하이브리드 검색
            hybrid_results = self.hybrid_search(
                index_name, query_text, k=k*2,
                use_reranker=False
            )
            results["hybrid_search"] = hybrid_results
            
            # 3. 결과 융합 (Reciprocal Rank Fusion)
            fused_results = self._reciprocal_rank_fusion(
                [vector_results, hybrid_results], 
                weights=[0.6, 0.4]
            )
            
            # 4. 최종 Reranking
            if self.reranker_available:
                final_results = self.rerank_results(query_text, fused_results, k)
                results["reranked_fusion"] = final_results
            else:
                final_results = fused_results[:k]
            
            results["final_recommendation"] = final_results
            
        elif search_strategy == "fast":
            # 빠른 검색: 벡터 검색 + Reranker
            fast_results = self.vector_search(
                index_name, query_text, k=k,
                document_filter=document_filter,
                element_filter=element_filter
            )
            if self.reranker_available:
                fast_results = self.rerank_results(query_text, fast_results, k)
            results["final_recommendation"] = fast_results
        
        return results
    
    def _reciprocal_rank_fusion(self, result_lists: List[List[Dict]], 
                           weights: List[float] = None, k: int = 60) -> List[Dict]:
        """
        Reciprocal Rank Fusion으로 여러 검색 결과 통합
        """
        if not weights:
            weights = [1.0] * len(result_lists)
        
        # 문서 ID별 점수 집계
        doc_scores = defaultdict(float)
        doc_data = {}
        
        for i, results in enumerate(result_lists):
            weight = weights[i]
            
            for rank, result in enumerate(results):
                doc_id = result['id']
                # RRF 공식: weight / (k + rank + 1)
                rrf_score = weight / (k + rank + 1)
                doc_scores[doc_id] += rrf_score
                
                # 문서 데이터 저장 (첫 번째 것으로)
                if doc_id not in doc_data:
                    doc_data[doc_id] = result.copy()
        
        # 점수 기준으로 정렬
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        # 결과 구성
        fused_results = []
        for doc_id, score in sorted_docs:
            result = doc_data[doc_id].copy()
            result['fusion_score'] = score
            result['search_type'] = 'fused'
            fused_results.append(result)
        
        return fused_results
    
    def hybrid_search(self, index_name: str, query_text: str, 
                     k: int = 10, boost_vector: float = 1.0, 
                     boost_text: float = 0.5, use_reranker: bool = True,
                     rerank_top_k: int = None) -> List[Dict]:
        """
        하이브리드 검색 (벡터 + 텍스트 매칭 + Reranker)
        """
        query_embedding = self.model.encode(query_text).tolist()
        
        # Reranker를 사용할 경우 더 많은 후보 검색
        search_k = k * 3 if use_reranker and self.reranker_available else k
        
        doc_type_keywords = {
            "house": ["집", "주택"],
            "person": ["사람", "인물"],
            "tree": ["나무"]
        }

        # Determine document filter
        document_filter = []
        for doc_type, keywords in doc_type_keywords.items():
            if any(keyword in query_text for keyword in keywords):
                document_filter.append(doc_type)

        # Build the search query
        search_body = {
            "size": search_k,
            "query": {
                "bool": {
                    "should": [
                        {
                            "knn": {
                                "embedding": {
                                    "vector": query_embedding,
                                    "k": search_k,
                                    "boost": boost_vector
                                }
                            }
                        },
                        {
                            "multi_match": {
                                "query": query_text,
                                "fields": [
                                    "text^2",
                                    "metadata.keywords^5",
                                    "metadata.explanations^1.5",
                                    "metadata.conditions"
                                ],
                                "type": "best_fields",
                                "boost": boost_text
                            }
                        }
                    ]
                }
            },
            "_source": ["id", "document", "element", "text", "metadata"]
        }

        if document_filter:
            search_body["query"]["bool"]["filter"] = [
                {
                    "terms": {
                        "document": document_filter
                    }
                }
            ]
        
        try:
            response = self.client.search(index=index_name, body=search_body)
            
            results = []
            for hit in response['hits']['hits']:
                source = hit['_source']
                results.append({
                    'id': source['id'],
                    'document': source['document'],
                    'element': source['element'],
                    'text': source['text'],
                    'metadata': source['metadata'],
                    'score': hit['_score'],
                    'search_type': 'hybrid'
                })
        except Exception as e:
            print(f"하이브리드 검색 실패: {e}")
            return []
        
        # Reranker 적용
        if use_reranker and self.reranker_available and results:
            final_k = rerank_top_k if rerank_top_k else k
            results = self.rerank_results(query_text, results, final_k)
        else:
            results = results[:k]
        
        return results
    
    def search_by_element(self, index_name: str, element_name: str, k: int = 10) -> List[Dict]:
        """
        특정 요소명으로 정확 검색
        """
        search_body = {
            "size": k,
            "query": {
                "term": {
                    "element": element_name
                }
            },
            "_source": ["id", "document", "element", "text", "metadata"]
        }
        
        try:
            response = self.client.search(index=index_name, body=search_body)
            
            results = []
            for hit in response['hits']['hits']:
                source = hit['_source']
                results.append({
                    'id': source['id'],
                    'document': source['document'],
                    'element': source['element'],
                    'text': source['text'],
                    'metadata': source['metadata'],
                    'score': hit['_score']
                })
                
            return results
        except Exception as e:
            print(f"요소별 검색 실패: {e}")
            return []
    
    def get_index_stats(self, index_name: str):
        """
        인덱스 통계 정보 반환
        """
        try:
            stats = self.client.indices.stats(index=index_name)
            count = self.client.count(index=index_name)
            
            # 문서별, 요소별 집계
            agg_body = {
                "size": 0,
                "aggs": {
                    "by_document": {
                        "terms": {"field": "document", "size": 10}
                    },
                    "by_element": {
                        "terms": {"field": "element", "size": 20}
                    }
                }
            }
            
            agg_response = self.client.search(index=index_name, body=agg_body)
            
            return {
                "total_docs": count['count'],
                "index_size": stats['indices'][index_name]['total']['store']['size_in_bytes'],
                "documents": {bucket['key']: bucket['doc_count'] 
                            for bucket in agg_response['aggregations']['by_document']['buckets']},
                "elements": {bucket['key']: bucket['doc_count'] 
                            for bucket in agg_response['aggregations']['by_element']['buckets'][:10]}
            }
        except Exception as e:
            print(f"통계 조회 오류: {e}")
            return None