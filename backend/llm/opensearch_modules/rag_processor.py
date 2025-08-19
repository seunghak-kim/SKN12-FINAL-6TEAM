"""
RAG Data Processor for Pipeline Integration
"""

import os
import json
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime

from opensearch_config import RAGConfig
from embedding_manager import EmbeddingManager
from search_engine import SearchEngine, IndexManager
from opensearch_client import OpenSearchConnection

logger = logging.getLogger(__name__)


class RAGDataProcessor:
    """RAG data processor for pipeline integration and summary generation"""
    
    def __init__(self, connection: OpenSearchConnection, embedding_manager: EmbeddingManager, 
                 search_engine: SearchEngine, index_manager: IndexManager, config: RAGConfig):
        self.connection = connection
        self.embedding_manager = embedding_manager
        self.search_engine = search_engine
        self.index_manager = index_manager
        self.config = config
    
    def process_raw_documents(self, document_path: str, doc_type: str) -> Dict[str, Any]:
        """
        Process raw markdown documents into structured data for RAG
        
        Args:
            document_path: Path to the markdown document
            doc_type: Type of document (person, house, tree)
            
        Returns:
            Processed document data with embeddings
        """
        try:
            if not os.path.exists(document_path):
                logger.error(f"Document not found: {document_path}")
                return {}
            
            with open(document_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse the document structure
            sections = self._parse_markdown_sections(content)
            
            # Create embeddings for each section
            processed_data = {}
            
            for section_name, section_content in sections.items():
                if not section_content.strip():
                    continue
                
                # Split content into chunks if needed
                chunks = self._chunk_text(section_content, max_length=500)
                
                section_data = []
                for i, chunk in enumerate(chunks):
                    try:
                        embedding = self.embedding_manager.encode_text(chunk)
                        
                        # Extract metadata from chunk
                        metadata = self._extract_metadata(chunk, doc_type, section_name)
                        
                        item = {
                            'text': chunk,
                            'embedding': embedding,
                            'metadata': metadata,
                            'chunk_id': i,
                            'section': section_name,
                            'document_type': doc_type,
                            'processed_at': datetime.now().isoformat()
                        }
                        
                        section_data.append(item)
                        
                    except Exception as e:
                        logger.error(f"Failed to process chunk in {section_name}: {e}")
                        continue
                
                if section_data:
                    processed_data[section_name] = section_data
            
            logger.info(f"Processed document {doc_type} with {len(processed_data)} sections")
            return processed_data
            
        except Exception as e:
            logger.error(f"Failed to process document {document_path}: {e}")
            return {}
    
    def _parse_markdown_sections(self, content: str) -> Dict[str, str]:
        """Parse markdown content into sections"""
        sections = {}
        current_section = None
        current_content = []
        
        lines = content.split('\n')
        
        for line in lines:
            if line.startswith('##') and not line.startswith('###'):
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                
                # Start new section
                current_section = line.replace('##', '').strip()
                current_content = []
            
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def _chunk_text(self, text: str, max_length: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= max_length:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + max_length
            
            if end >= len(text):
                chunks.append(text[start:])
                break
            
            # Try to break at sentence boundary
            chunk = text[start:end]
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            
            break_point = max(last_period, last_newline)
            
            if break_point > start + max_length // 2:
                end = start + break_point + 1
            
            chunks.append(text[start:end])
            start = end - overlap
        
        return chunks
    
    def _extract_metadata(self, text: str, doc_type: str, section_name: str) -> Dict[str, Any]:
        """Extract metadata from text chunk"""
        metadata = {
            'document_type': doc_type,
            'section': section_name,
            'length': len(text),
            'keywords': self._extract_keywords(text),
            'conditions': self._extract_conditions(text),
            'explanations': self._extract_explanations(text)
        }
        
        return metadata
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract emotional and psychological keywords"""
        # Psychology-related keywords
        psych_keywords = [
            '불안', '우울', '스트레스', '분노', '기쁨', '슬픔', '두려움', '걱정',
            '자신감', '자존감', '인정욕구', '소외감', '외로움', '행복', '만족',
            '부정적', '긍정적', '심리적', '정서적', '감정적', '내향적', '외향적',
            '성격', '기질', '특성', '경향', '성향', '태도', '인식', '인지'
        ]
        
        found_keywords = []
        text_lower = text.lower()
        
        for keyword in psych_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _extract_conditions(self, text: str) -> List[str]:
        """Extract psychological conditions or states"""
        condition_patterns = [
            '경우', '상황', '때', '시', '상태', '조건', '환경', '맥락'
        ]
        
        conditions = []
        sentences = text.split('.')
        
        for sentence in sentences:
            sentence = sentence.strip()
            if any(pattern in sentence for pattern in condition_patterns):
                conditions.append(sentence)
        
        return conditions
    
    def _extract_explanations(self, text: str) -> List[str]:
        """Extract explanatory content"""
        explanation_patterns = [
            '의미', '해석', '분석', '설명', '이유', '원인', '결과', '영향'
        ]
        
        explanations = []
        sentences = text.split('.')
        
        for sentence in sentences:
            sentence = sentence.strip()
            if any(pattern in sentence for pattern in explanation_patterns):
                explanations.append(sentence)
        
        return explanations
    
    def generate_document_summary(self, index_name: str, doc_type: str = None, 
                                 element: str = None, max_items: int = 100) -> Dict[str, Any]:
        """
        Generate summary of document content for RAG usage
        
        Args:
            index_name: OpenSearch index name
            doc_type: Optional document type filter
            element: Optional element filter
            max_items: Maximum items to include in summary
            
        Returns:
            Summary data optimized for RAG pipeline
        """
        try:
            # Search for relevant documents
            search_body = {
                "size": max_items,
                "query": {"match_all": {}},
                "_source": ["id", "document", "element", "text", "metadata"]
            }
            
            # Add filters
            if doc_type or element:
                filters = []
                if doc_type:
                    filters.append({"term": {"document": doc_type}})
                if element:
                    filters.append({"term": {"element": element}})
                
                search_body["query"] = {
                    "bool": {
                        "must": [{"match_all": {}}],
                        "filter": filters
                    }
                }
            
            response = self.connection.client.search(index=index_name, body=search_body)
            
            # Process results
            documents = []
            element_summary = {}
            keyword_frequency = {}
            
            for hit in response['hits']['hits']:
                source = hit['_source']
                documents.append(source)
                
                # Aggregate by element
                element_name = source['element']
                if element_name not in element_summary:
                    element_summary[element_name] = {
                        'count': 0,
                        'sample_texts': [],
                        'keywords': set()
                    }
                
                element_summary[element_name]['count'] += 1
                
                # Add sample text
                if len(element_summary[element_name]['sample_texts']) < 3:
                    element_summary[element_name]['sample_texts'].append(source['text'][:200])
                
                # Collect keywords
                keywords = source['metadata'].get('keywords', [])
                for keyword in keywords:
                    element_summary[element_name]['keywords'].add(keyword)
                    keyword_frequency[keyword] = keyword_frequency.get(keyword, 0) + 1
            
            # Convert sets to lists for JSON serialization
            for element_data in element_summary.values():
                element_data['keywords'] = list(element_data['keywords'])
            
            # Generate summary text
            summary_text = self._generate_summary_text(element_summary, keyword_frequency)
            
            summary = {
                'total_documents': len(documents),
                'document_type': doc_type,
                'element_filter': element,
                'element_summary': element_summary,
                'top_keywords': sorted(keyword_frequency.items(), key=lambda x: x[1], reverse=True)[:20],
                'summary_text': summary_text,
                'generated_at': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return {}
    
    def _generate_summary_text(self, element_summary: Dict, keyword_frequency: Dict) -> str:
        """Generate human-readable summary text"""
        summary_parts = []
        
        # Overview
        total_elements = len(element_summary)
        total_docs = sum(data['count'] for data in element_summary.values())
        
        summary_parts.append(f"총 {total_elements}개 요소에서 {total_docs}개의 문서가 분석되었습니다.")
        
        # Top elements
        top_elements = sorted(element_summary.items(), key=lambda x: x[1]['count'], reverse=True)[:5]
        
        summary_parts.append("\n주요 분석 요소:")
        for element, data in top_elements:
            summary_parts.append(f"- {element}: {data['count']}개 문서")
        
        # Top keywords
        top_keywords = sorted(keyword_frequency.items(), key=lambda x: x[1], reverse=True)[:10]
        
        if top_keywords:
            summary_parts.append(f"\n주요 심리적 키워드: {', '.join([kw for kw, _ in top_keywords])}")
        
        return '\n'.join(summary_parts)
    
    def prepare_rag_context(self, query: str, index_name: str, 
                           max_context_length: int = 2000) -> Dict[str, Any]:
        """
        Prepare context for RAG model input
        
        Args:
            query: User query
            index_name: Search index name
            max_context_length: Maximum context length
            
        Returns:
            RAG context with relevant documents and metadata
        """
        try:
            # Search for relevant documents
            search_results = self.search_engine.advanced_search(
                index_name=index_name,
                query_text=query,
                strategy="auto",
                k=self.config.top_k_docs
            )
            
            relevant_docs = search_results.get('final_recommendation', [])
            
            # Build context
            context_parts = []
            current_length = 0
            used_docs = []
            
            for doc in relevant_docs:
                doc_text = doc['text']
                doc_length = len(doc_text)
                
                if current_length + doc_length > max_context_length:
                    if current_length == 0:  # At least include one document
                        doc_text = doc_text[:max_context_length]
                        context_parts.append(doc_text)
                        used_docs.append(doc)
                    break
                
                context_parts.append(doc_text)
                used_docs.append(doc)
                current_length += doc_length
            
            context_text = '\n\n---\n\n'.join(context_parts)
            
            # Prepare metadata
            context_metadata = {
                'total_relevant_docs': len(relevant_docs),
                'used_docs': len(used_docs),
                'context_length': len(context_text),
                'document_sources': [
                    {
                        'id': doc['id'],
                        'document': doc['document'],
                        'element': doc['element'],
                        'score': doc.get('score', 0),
                        'rerank_score': doc.get('rerank_score', 0)
                    }
                    for doc in used_docs
                ],
                'query': query,
                'prepared_at': datetime.now().isoformat()
            }
            
            return {
                'context_text': context_text,
                'metadata': context_metadata,
                'query': query
            }
            
        except Exception as e:
            logger.error(f"Failed to prepare RAG context: {e}")
            return {
                'context_text': '',
                'metadata': {'error': str(e)},
                'query': query
            }
    
    def save_processed_data(self, data: Dict[str, Any], output_path: str):
        """Save processed data to file"""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Processed data saved to: {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to save processed data: {e}")
    
    def load_processed_data(self, input_path: str) -> Dict[str, Any]:
        """Load processed data from file"""
        try:
            if not os.path.exists(input_path):
                logger.error(f"File not found: {input_path}")
                return {}
            
            with open(input_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"Processed data loaded from: {input_path}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to load processed data: {e}")
            return {}