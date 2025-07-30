"""
Embedding Management Module
"""

import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
from typing import List, Dict, Any, Optional, Tuple
import logging

from opensearch_config import EmbeddingConfig

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """Manages embedding models and operations"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.model: Optional[SentenceTransformer] = None
        self.reranker: Optional[CrossEncoder] = None
        self.reranker_available = False
        self._load_models()
    
    def _load_models(self):
        """Load embedding and reranking models"""
        # Load embedding model
        try:
            self.model = SentenceTransformer(self.config.model_name)
            self.model.max_seq_length = self.config.max_seq_length
            logger.info(f"Embedding model loaded successfully: {self.config.model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
        
        # Load reranking model
        try:
            self.reranker = CrossEncoder(self.config.reranker_model)
            self.reranker_available = True
            logger.info(f"Reranker model loaded successfully: {self.config.reranker_model}")
        except Exception as e:
            logger.warning(f"Failed to load reranker model: {e}")
            self.reranker = None
            self.reranker_available = False
    
    def encode_text(self, text: str) -> List[float]:
        """Encode single text to embedding"""
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            return self.model.encode(text).tolist()
        except Exception as e:
            logger.error(f"Failed to encode text: {e}")
            raise
    
    def encode_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Encode batch of texts to embeddings"""
        if not self.model:
            raise RuntimeError("Embedding model not loaded")
        
        try:
            embeddings = []
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_embeddings = self.model.encode(batch)
                embeddings.extend([emb.tolist() for emb in batch_embeddings])
            return embeddings
        except Exception as e:
            logger.error(f"Failed to encode batch: {e}")
            raise
    
    def rerank_results(self, query: str, texts: List[str], scores: Optional[List[float]] = None) -> List[Tuple[float, int]]:
        """
        Rerank search results using cross-encoder
        
        Args:
            query: Search query
            texts: List of candidate texts
            scores: Optional original scores
            
        Returns:
            List of (rerank_score, original_index) tuples sorted by score
        """
        if not self.reranker_available or not texts:
            # Return original order with scores if available
            if scores:
                return [(score, idx) for idx, score in enumerate(scores)]
            else:
                return [(1.0, idx) for idx in range(len(texts))]
        
        try:
            # Create query-document pairs
            query_doc_pairs = [[query, text] for text in texts]
            
            # Get reranking scores
            rerank_scores = self.reranker.predict(query_doc_pairs)
            
            # Sort by rerank score (descending)
            scored_indices = [(float(score), idx) for idx, score in enumerate(rerank_scores)]
            scored_indices.sort(key=lambda x: x[0], reverse=True)
            
            return scored_indices
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            # Fallback to original scores
            if scores:
                return [(score, idx) for idx, score in enumerate(scores)]
            else:
                return [(1.0, idx) for idx in range(len(texts))]
    
    def load_embedding_files(self, embeddings_dir: str) -> Dict[str, Any]:
        """Load precomputed embedding files"""
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
                    logger.info(f"Embedding file loaded successfully: {filename}")
                except Exception as e:
                    logger.error(f"Failed to load embedding file {filename}: {e}")
            else:
                logger.warning(f"Embedding file not found: {filepath}")
        
        return all_data
    
    def validate_embedding_data(self, data: Dict[str, Any]) -> bool:
        """Validate embedding data structure"""
        try:
            for doc_name, doc_data in data.items():
                if not isinstance(doc_data, dict):
                    logger.error(f"Invalid document data structure for {doc_name}")
                    return False
                
                for element, items in doc_data.items():
                    if not isinstance(items, list):
                        logger.error(f"Invalid element data structure for {doc_name}.{element}")
                        return False
                    
                    for item in items:
                        if not isinstance(item, dict) or 'text' not in item or 'embedding' not in item:
                            logger.error(f"Invalid item structure in {doc_name}.{element}")
                            return False
                        
                        if not isinstance(item['embedding'], list):
                            logger.error(f"Invalid embedding format in {doc_name}.{element}")
                            return False
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False
    
    def create_embeddings_from_texts(self, texts: List[str], metadata: List[Dict] = None) -> List[Dict]:
        """Create embeddings from raw texts with metadata"""
        if metadata is None:
            metadata = [{}] * len(texts)
        
        if len(texts) != len(metadata):
            raise ValueError("texts and metadata must have the same length")
        
        embeddings = self.encode_batch(texts)
        
        result = []
        for text, embedding, meta in zip(texts, embeddings, metadata):
            result.append({
                'text': text,
                'embedding': embedding,
                'metadata': meta
            })
        
        return result