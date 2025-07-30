"""
OpenSearch Configuration Management Module
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class OpenSearchConfig:
    """OpenSearch connection configuration"""
    host: str = 'localhost'
    port: int = 9200
    username: str = 'admin'
    password: str = 'MyStrongPassword123!'
    use_ssl: bool = True
    verify_certs: bool = False
    ssl_assert_hostname: bool = False
    ssl_show_warn: bool = False
    timeout: int = 30
    
    @classmethod
    def from_env(cls) -> 'OpenSearchConfig':
        """Create configuration from environment variables"""
        return cls(
            host=os.getenv('OPENSEARCH_HOST', 'localhost'),
            port=int(os.getenv('OPENSEARCH_PORT', '9200')),
            username=os.getenv('OPENSEARCH_USERNAME', 'admin'),
            password=os.getenv('OPENSEARCH_PASSWORD', 'MyStrongPassword123!'),
            use_ssl=os.getenv('OPENSEARCH_USE_SSL', 'true').lower() == 'true',
            verify_certs=os.getenv('OPENSEARCH_VERIFY_CERTS', 'false').lower() == 'true',
            ssl_assert_hostname=os.getenv('OPENSEARCH_SSL_ASSERT_HOSTNAME', 'false').lower() == 'true',
            ssl_show_warn=os.getenv('OPENSEARCH_SSL_SHOW_WARN', 'false').lower() == 'true',
            timeout=int(os.getenv('OPENSEARCH_TIMEOUT', '30'))
        )


@dataclass
class EmbeddingConfig:
    """Embedding model configuration"""
    model_name: str = 'nlpai-lab/KURE-v1'
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    max_seq_length: int = 8192
    embedding_dimension: int = 1024
    
    @classmethod
    def from_env(cls) -> 'EmbeddingConfig':
        """Create configuration from environment variables"""
        return cls(
            model_name=os.getenv('EMBEDDING_MODEL', 'nlpai-lab/KURE-v1'),
            reranker_model=os.getenv('RERANKER_MODEL', "BAAI/bge-reranker-v2-m3"),
            max_seq_length=int(os.getenv('MAX_SEQ_LENGTH', '8192')),
            embedding_dimension=int(os.getenv('EMBEDDING_DIMENSION', '1024'))
        )


@dataclass
class IndexConfig:
    """Index configuration"""
    default_index_name: str = "psychology_analysis"
    embeddings_dir: str = './embeddings'
    chunk_size: int = 100
    ef_construction: int = 128
    m_parameter: int = 24
    ef_search: int = 100
    
    @classmethod
    def from_env(cls) -> 'IndexConfig':
        """Create configuration from environment variables"""
        return cls(
            default_index_name=os.getenv('DEFAULT_INDEX_NAME', 'psychology_analysis'),
            embeddings_dir=os.getenv('EMBEDDINGS_DIR', './embeddings'),
            chunk_size=int(os.getenv('CHUNK_SIZE', '100')),
            ef_construction=int(os.getenv('EF_CONSTRUCTION', '128')),
            m_parameter=int(os.getenv('M_PARAMETER', '24')),
            ef_search=int(os.getenv('EF_SEARCH', '100'))
        )


@dataclass
class RAGConfig:
    """RAG pipeline configuration"""
    summary_max_length: int = 512
    summary_min_length: int = 100
    top_k_docs: int = 10
    rerank_top_k: int = 5
    similarity_threshold: float = 0.7
    fusion_weights: list = None
    
    def __post_init__(self):
        if self.fusion_weights is None:
            self.fusion_weights = [0.6, 0.4]
    
    @classmethod
    def from_env(cls) -> 'RAGConfig':
        """Create configuration from environment variables"""
        return cls(
            summary_max_length=int(os.getenv('SUMMARY_MAX_LENGTH', '512')),
            summary_min_length=int(os.getenv('SUMMARY_MIN_LENGTH', '100')),
            top_k_docs=int(os.getenv('TOP_K_DOCS', '10')),
            rerank_top_k=int(os.getenv('RERANK_TOP_K', '5')),
            similarity_threshold=float(os.getenv('SIMILARITY_THRESHOLD', '0.7')),
            fusion_weights=[float(x) for x in os.getenv('FUSION_WEIGHTS', '0.6,0.4').split(',')]
        )


class ConfigManager:
    """Centralized configuration manager"""
    
    def __init__(self):
        self.opensearch = OpenSearchConfig.from_env()
        self.embedding = EmbeddingConfig.from_env()
        self.index = IndexConfig.from_env()
        self.rag = RAGConfig.from_env()
    
    @classmethod
    def from_dict(cls, config_dict: dict) -> 'ConfigManager':
        """Create configuration from dictionary"""
        instance = cls()
        
        if 'opensearch' in config_dict:
            for key, value in config_dict['opensearch'].items():
                if hasattr(instance.opensearch, key):
                    setattr(instance.opensearch, key, value)
        
        if 'embedding' in config_dict:
            for key, value in config_dict['embedding'].items():
                if hasattr(instance.embedding, key):
                    setattr(instance.embedding, key, value)
        
        if 'index' in config_dict:
            for key, value in config_dict['index'].items():
                if hasattr(instance.index, key):
                    setattr(instance.index, key, value)
                    
        if 'rag' in config_dict:
            for key, value in config_dict['rag'].items():
                if hasattr(instance.rag, key):
                    setattr(instance.rag, key, value)
        
        return instance