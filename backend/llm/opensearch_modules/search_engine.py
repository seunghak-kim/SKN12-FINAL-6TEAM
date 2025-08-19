"""
OpenSearch Search Engine Module
"""

from opensearchpy.helpers import bulk
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import logging
from tqdm import tqdm

from opensearch_client import OpenSearchConnection
from embedding_manager import EmbeddingManager
from opensearch_config import IndexConfig

logger = logging.getLogger(__name__)


class IndexManager:
    """Manages OpenSearch index operations"""
    
    def __init__(self, connection: OpenSearchConnection, config: IndexConfig):
        self.connection = connection
        self.config = config
    
    def create_embedding_index(self, index_name: str, embedding_dimension: int = None) -> bool:
        """Create embedding index with proper mapping"""
        if embedding_dimension is None:
            embedding_dimension = 1024  # KURE-v1 dimension
        
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "document": {"type": "keyword"},
                    "element": {"type": "keyword"},
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
                        "dimension": embedding_dimension,
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "lucene",
                            "parameters": {
                                "ef_construction": self.config.ef_construction,
                                "m": self.config.m_parameter
                            }
                        }
                    },
                    "timestamp": {"type": "date"}
                }
            },
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": self.config.ef_search
                }
            }
        }
        
        try:
            if self.connection.client.indices.exists(index=index_name):
                logger.info(f"Index '{index_name}' already exists")
                return True
            
            response = self.connection.client.indices.create(index=index_name, body=mapping)
            logger.info(f"Index '{index_name}' created successfully: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create index: {e}")
            return False
    
    def index_embedding_data(self, index_name: str, embedding_data: Dict[str, Any]) -> Optional[Dict]:
        """Index embedding data to OpenSearch"""
        try:
            if not embedding_data:
                logger.warning("No data to index")
                return None
            
            actions = []
            doc_id = 0
            
            for doc_name, doc_data in embedding_data.items():
                for element, items in tqdm(doc_data.items(), desc=f"Processing {doc_name}"):
                    for item in items:
                        if not isinstance(item, dict) or 'text' not in item or 'embedding' not in item:
                            logger.warning(f"Skipping invalid data: {doc_name}_{element}_{doc_id}")
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
                logger.warning("No valid documents to index")
                return None
            
            logger.info(f"Starting indexing of {len(actions)} documents...")
            response = bulk(self.connection.client, actions, chunk_size=self.config.chunk_size)
            logger.info(f"Indexing completed: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            return None
    
    def get_index_stats(self, index_name: str) -> Optional[Dict[str, Any]]:
        """Get index statistics"""
        try:
            stats = self.connection.client.indices.stats(index=index_name)
            count = self.connection.client.count(index=index_name)
            
            # Document and element aggregations
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
            
            agg_response = self.connection.client.search(index=index_name, body=agg_body)
            
            return {
                "total_docs": count['count'],
                "index_size": stats['indices'][index_name]['total']['store']['size_in_bytes'],
                "documents": {bucket['key']: bucket['doc_count'] 
                            for bucket in agg_response['aggregations']['by_document']['buckets']},
                "elements": {bucket['key']: bucket['doc_count'] 
                            for bucket in agg_response['aggregations']['by_element']['buckets'][:10]}
            }
            
        except Exception as e:
            logger.error(f"Failed to get index stats: {e}")
            return None


class SearchEngine:
    """Advanced search engine with multiple search strategies"""
    
    def __init__(self, connection: OpenSearchConnection, embedding_manager: EmbeddingManager):
        self.connection = connection
        self.embedding_manager = embedding_manager
    
    def vector_search(self, index_name: str, query_text: str, 
                     k: int = 10, document_filter: List[str] = None,
                     element_filter: List[str] = None) -> List[Dict]:
        """Vector similarity search"""
        try:
            query_embedding = self.embedding_manager.encode_text(query_text)
        except Exception as e:
            logger.error(f"Failed to create query embedding: {e}")
            return []
        
        search_body = {
            "size": k,
            "query": {
                "bool": {
                    "must": [
                        {
                            "knn": {
                                "embedding": {
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
        
        # Add filters
        filters = []
        if document_filter:
            filters.append({"terms": {"document": document_filter}})
        if element_filter:
            filters.append({"terms": {"element": element_filter}})
        if filters:
            search_body["query"]["bool"]["filter"] = filters
        
        try:
            response = self.connection.client.search(index=index_name, body=search_body)
            
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
                    'search_type': 'vector'
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    def hybrid_search(self, index_name: str, query_text: str, 
                     k: int = 10, boost_vector: float = 1.0, 
                     boost_text: float = 0.5) -> List[Dict]:
        """Hybrid search combining vector and text matching"""
        query_embedding = self.embedding_manager.encode_text(query_text)
        
        search_body = {
            "size": k,
            "query": {
                "bool": {
                    "should": [
                        {
                            "knn": {
                                "embedding": {
                                    "vector": query_embedding,
                                    "k": k,
                                    "boost": boost_vector
                                }
                            }
                        },
                        {
                            "multi_match": {
                                "query": query_text,
                                "fields": [
                                    "text^2",
                                    "metadata.keywords^3",
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
        
        try:
            response = self.connection.client.search(index=index_name, body=search_body)
            
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
            
            return results
            
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []
    
    def search_by_element(self, index_name: str, element_name: str, k: int = 10) -> List[Dict]:
        """Search by specific element name"""
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
            response = self.connection.client.search(index=index_name, body=search_body)
            
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
                    'search_type': 'element'
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Element search failed: {e}")
            return []
    
    def reciprocal_rank_fusion(self, result_lists: List[List[Dict]], 
                              weights: List[float] = None, k: int = 60) -> List[Dict]:
        """Combine multiple search results using Reciprocal Rank Fusion"""
        if not weights:
            weights = [1.0] * len(result_lists)
        
        doc_scores = defaultdict(float)
        doc_data = {}
        
        for i, results in enumerate(result_lists):
            weight = weights[i]
            
            for rank, result in enumerate(results):
                doc_id = result['id']
                rrf_score = weight / (k + rank + 1)
                doc_scores[doc_id] += rrf_score
                
                if doc_id not in doc_data:
                    doc_data[doc_id] = result.copy()
        
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        
        fused_results = []
        for doc_id, score in sorted_docs:
            result = doc_data[doc_id].copy()
            result['fusion_score'] = score
            result['search_type'] = 'fused'
            fused_results.append(result)
        
        return fused_results
    
    def advanced_search(self, index_name: str, query_text: str, 
                       strategy: str = "auto", k: int = 10,
                       document_filter: List[str] = None,
                       element_filter: List[str] = None) -> Dict[str, List[Dict]]:
        """Advanced search with multiple strategies"""
        results = {
            "vector_search": [],
            "hybrid_search": [],
            "reranked_fusion": [],
            "final_recommendation": []
        }
        
        if strategy in ["auto", "comprehensive"]:
            # Vector search
            vector_results = self.vector_search(
                index_name, query_text, k=k*2, 
                document_filter=document_filter,
                element_filter=element_filter
            )
            results["vector_search"] = vector_results
            
            # Hybrid search
            hybrid_results = self.hybrid_search(
                index_name, query_text, k=k*2
            )
            results["hybrid_search"] = hybrid_results
            
            # Fusion
            fused_results = self.reciprocal_rank_fusion(
                [vector_results, hybrid_results], 
                weights=[0.6, 0.4]
            )
            
            # Reranking
            if self.embedding_manager.reranker_available and fused_results:
                texts = [r['text'] for r in fused_results]
                scored_indices = self.embedding_manager.rerank_results(query_text, texts)
                
                final_results = []
                for score, idx in scored_indices[:k]:
                    result = fused_results[idx].copy()
                    result['rerank_score'] = score
                    final_results.append(result)
                
                results["reranked_fusion"] = final_results
                results["final_recommendation"] = final_results
            else:
                results["final_recommendation"] = fused_results[:k]
        
        elif strategy == "fast":
            fast_results = self.vector_search(
                index_name, query_text, k=k,
                document_filter=document_filter,
                element_filter=element_filter
            )
            
            if self.embedding_manager.reranker_available:
                texts = [r['text'] for r in fast_results]
                scored_indices = self.embedding_manager.rerank_results(query_text, texts)
                
                reranked_results = []
                for score, idx in scored_indices:
                    result = fast_results[idx].copy()
                    result['rerank_score'] = score
                    reranked_results.append(result)
                
                results["final_recommendation"] = reranked_results
            else:
                results["final_recommendation"] = fast_results
        
        return results