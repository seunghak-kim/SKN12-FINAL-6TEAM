"""
Summary Generation Module for RAG Data
"""

from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime
from collections import Counter, defaultdict

from .opensearch_config import RAGConfig
from .search_engine import SearchEngine

logger = logging.getLogger(__name__)


class SummaryGenerator:
    """Generate summaries and insights from RAG data for pipeline usage"""
    
    def __init__(self, search_engine: SearchEngine, config: RAGConfig):
        self.search_engine = search_engine
        self.config = config
    
    def generate_comprehensive_summary(self, index_name: str, 
                                     document_types: List[str] = None) -> Dict[str, Any]:
        """
        Generate comprehensive summary of all data in the index
        
        Args:
            index_name: OpenSearch index name
            document_types: Optional list of document types to include
            
        Returns:
            Comprehensive summary with statistics and insights
        """
        try:
            # Get index statistics
            stats = self.search_engine.connection.client.indices.stats(index=index_name)
            count_response = self.search_engine.connection.client.count(index=index_name)
            
            # Aggregation query for detailed analysis
            agg_body = {
                "size": 0,
                "aggs": {
                    "by_document": {
                        "terms": {"field": "document", "size": 10},
                        "aggs": {
                            "by_element": {
                                "terms": {"field": "element", "size": 50}
                            }
                        }
                    },
                    "total_elements": {
                        "cardinality": {"field": "element"}
                    },
                    "avg_text_length": {
                        "avg": {
                            "script": {
                                "source": "doc['text'].value.length()"
                            }
                        }
                    }
                }
            }
            
            if document_types:
                agg_body["query"] = {
                    "terms": {"document": document_types}
                }
            
            agg_response = self.search_engine.connection.client.search(
                index=index_name, body=agg_body
            )
            
            # Process aggregation results
            doc_analysis = {}
            total_docs = 0
            
            for bucket in agg_response['aggregations']['by_document']['buckets']:
                doc_type = bucket['key']
                doc_count = bucket['doc_count']
                total_docs += doc_count
                
                elements = {}
                for elem_bucket in bucket['by_element']['buckets']:
                    elements[elem_bucket['key']] = elem_bucket['doc_count']
                
                doc_analysis[doc_type] = {
                    'total_items': doc_count,
                    'elements': elements,
                    'unique_elements': len(elements)
                }
            
            # Generate insights
            insights = self._generate_insights(doc_analysis)
            
            # Create summary
            summary = {
                'overview': {
                    'total_documents': total_docs,
                    'total_unique_elements': agg_response['aggregations']['total_elements']['value'],
                    'document_types': len(doc_analysis),
                    'avg_text_length': round(agg_response['aggregations']['avg_text_length']['value'], 2),
                    'index_size_bytes': stats['indices'][index_name]['total']['store']['size_in_bytes']
                },
                'document_analysis': doc_analysis,
                'insights': insights,
                'generated_at': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate comprehensive summary: {e}")
            return {'error': str(e)}
    
    def generate_element_summary(self, index_name: str, element_name: str) -> Dict[str, Any]:
        """
        Generate detailed summary for a specific element
        
        Args:
            index_name: OpenSearch index name
            element_name: Specific element to analyze
            
        Returns:
            Detailed element analysis
        """
        try:
            # Search for all documents with this element
            search_body = {
                "size": 1000,  # Get many examples
                "query": {
                    "term": {"element": element_name}
                },
                "_source": ["document", "text", "metadata"],
                "aggs": {
                    "by_document": {
                        "terms": {"field": "document", "size": 10}
                    }
                }
            }
            
            response = self.search_engine.connection.client.search(
                index=index_name, body=search_body
            )
            
            # Process results
            documents = response['hits']['hits']
            doc_distribution = {
                bucket['key']: bucket['doc_count'] 
                for bucket in response['aggregations']['by_document']['buckets']
            }
            
            # Analyze content
            content_analysis = self._analyze_element_content(documents)
            
            # Generate element-specific insights
            element_insights = self._generate_element_insights(element_name, content_analysis, doc_distribution)
            
            summary = {
                'element_name': element_name,
                'total_occurrences': len(documents),
                'document_distribution': doc_distribution,
                'content_analysis': content_analysis,
                'insights': element_insights,
                'sample_texts': [doc['_source']['text'][:200] for doc in documents[:5]],
                'generated_at': datetime.now().isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate element summary for {element_name}: {e}")
            return {'error': str(e)}
    
    def generate_rag_optimized_summary(self, index_name: str, query_context: str = None) -> Dict[str, Any]:
        """
        Generate summary optimized for RAG pipeline usage
        
        Args:
            index_name: OpenSearch index name
            query_context: Optional context to focus the summary
            
        Returns:
            RAG-optimized summary with key information chunks
        """
        try:
            # If query context is provided, use it to focus the summary
            if query_context:
                search_results = self.search_engine.advanced_search(
                    index_name=index_name,
                    query_text=query_context,
                    strategy="comprehensive",
                    k=20
                )
                relevant_docs = search_results.get('final_recommendation', [])
            else:
                # Get representative sample
                search_body = {
                    "size": 50,
                    "query": {"match_all": {}},
                    "_source": ["document", "element", "text", "metadata"]
                }
                
                response = self.search_engine.connection.client.search(
                    index=index_name, body=search_body
                )
                relevant_docs = [hit['_source'] for hit in response['hits']['hits']]
            
            # Create knowledge chunks
            knowledge_chunks = self._create_knowledge_chunks(relevant_docs)
            
            # Generate contextual summary
            contextual_summary = self._generate_contextual_summary(knowledge_chunks, query_context)
            
            # Create RAG-ready output
            rag_summary = {
                'context_query': query_context,
                'total_source_documents': len(relevant_docs),
                'knowledge_chunks': knowledge_chunks,
                'contextual_summary': contextual_summary,
                'key_concepts': self._extract_key_concepts(relevant_docs),
                'usage_instructions': {
                    'for_question_answering': '각 knowledge_chunk를 참조하여 구체적인 답변 제공',
                    'for_context_building': 'contextual_summary를 기반으로 배경 지식 구성',
                    'for_concept_explanation': 'key_concepts의 정의와 설명 활용'
                },
                'generated_at': datetime.now().isoformat()
            }
            
            return rag_summary
            
        except Exception as e:
            logger.error(f"Failed to generate RAG-optimized summary: {e}")
            return {'error': str(e)}
    
    def _generate_insights(self, doc_analysis: Dict[str, Any]) -> List[str]:
        """Generate insights from document analysis"""
        insights = []
        
        # Document distribution insights
        doc_types = list(doc_analysis.keys())
        if len(doc_types) > 1:
            doc_counts = [data['total_items'] for data in doc_analysis.values()]
            max_count_idx = doc_counts.index(max(doc_counts))
            dominant_doc = doc_types[max_count_idx]
            insights.append(f"'{dominant_doc}' 문서가 가장 많은 데이터를 포함하고 있습니다 ({max(doc_counts)}개 항목)")
        
        # Element diversity insights
        for doc_type, data in doc_analysis.items():
            unique_elements = data['unique_elements']
            total_items = data['total_items']
            diversity_ratio = unique_elements / total_items if total_items > 0 else 0
            
            if diversity_ratio > 0.8:
                insights.append(f"'{doc_type}' 문서는 높은 요소 다양성을 보입니다 (다양성 지수: {diversity_ratio:.2f})")
            elif diversity_ratio < 0.3:
                insights.append(f"'{doc_type}' 문서는 특정 요소에 집중되어 있습니다 (다양성 지수: {diversity_ratio:.2f})")
        
        # Most common elements across documents
        all_elements = Counter()
        for data in doc_analysis.values():
            all_elements.update(data['elements'])
        
        if all_elements:
            top_element = all_elements.most_common(1)[0]
            insights.append(f"전체 데이터에서 '{top_element[0]}' 요소가 가장 빈번합니다 ({top_element[1]}회)")
        
        return insights
    
    def _analyze_element_content(self, documents: List[Dict]) -> Dict[str, Any]:
        """Analyze content patterns for a specific element"""
        texts = [doc['_source']['text'] for doc in documents]
        metadatas = [doc['_source'].get('metadata', {}) for doc in documents]
        
        # Text length analysis
        text_lengths = [len(text) for text in texts]
        
        # Keyword analysis
        all_keywords = []
        for metadata in metadatas:
            all_keywords.extend(metadata.get('keywords', []))
        
        keyword_freq = Counter(all_keywords)
        
        # Content themes
        themes = self._identify_content_themes(texts)
        
        return {
            'text_statistics': {
                'avg_length': sum(text_lengths) / len(text_lengths) if text_lengths else 0,
                'min_length': min(text_lengths) if text_lengths else 0,
                'max_length': max(text_lengths) if text_lengths else 0
            },
            'top_keywords': keyword_freq.most_common(10),
            'content_themes': themes,
            'sample_count': len(documents)
        }
    
    def _identify_content_themes(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Identify common themes in content"""
        # Simple theme identification based on common words/phrases
        theme_keywords = {
            '감정_표현': ['기쁨', '슬픔', '분노', '불안', '우울', '행복', '만족'],
            '심리_상태': ['스트레스', '긴장', '안정', '평온', '혼란', '명확'],
            '성격_특성': ['내향적', '외향적', '개방적', '신경질적', '성실한'],
            '관계_패턴': ['사회적', '고립', '친밀감', '소외감', '협력적'],
            '인지_패턴': ['인식', '판단', '해석', '이해', '오해', '착각']
        }
        
        theme_scores = defaultdict(int)
        theme_examples = defaultdict(list)
        
        for text in texts:
            text_lower = text.lower()
            for theme, keywords in theme_keywords.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        theme_scores[theme] += 1
                        if len(theme_examples[theme]) < 3:
                            theme_examples[theme].append(text[:100] + "...")
        
        themes = []
        for theme, score in sorted(theme_scores.items(), key=lambda x: x[1], reverse=True):
            if score > 0:
                themes.append({
                    'theme': theme,
                    'frequency': score,
                    'examples': theme_examples[theme]
                })
        
        return themes[:5]  # Top 5 themes
    
    def _generate_element_insights(self, element_name: str, content_analysis: Dict, 
                                  doc_distribution: Dict) -> List[str]:
        """Generate specific insights for an element"""
        insights = []
        
        # Distribution insight
        if len(doc_distribution) > 1:
            dominant_doc = max(doc_distribution.items(), key=lambda x: x[1])
            insights.append(f"'{element_name}' 요소는 '{dominant_doc[0]}' 문서에서 가장 많이 나타납니다 ({dominant_doc[1]}회)")
        
        # Content length insight
        avg_length = content_analysis['text_statistics']['avg_length']
        if avg_length > 300:
            insights.append(f"'{element_name}' 관련 설명은 평균적으로 상세합니다 (평균 {avg_length:.0f}자)")
        elif avg_length < 100:
            insights.append(f"'{element_name}' 관련 설명은 평균적으로 간결합니다 (평균 {avg_length:.0f}자)")
        
        # Keyword insight
        top_keywords = content_analysis.get('top_keywords', [])
        if top_keywords:
            top_keyword = top_keywords[0]
            insights.append(f"'{element_name}' 요소에서 '{top_keyword[0]}' 키워드가 가장 빈번합니다 ({top_keyword[1]}회)")
        
        # Theme insight
        themes = content_analysis.get('content_themes', [])
        if themes:
            primary_theme = themes[0]
            insights.append(f"'{element_name}' 요소는 주로 '{primary_theme['theme']}' 주제와 관련됩니다")
        
        return insights
    
    def _create_knowledge_chunks(self, documents: List[Dict]) -> List[Dict[str, Any]]:
        """Create structured knowledge chunks for RAG"""
        chunks = []
        
        # Group by document type and element
        grouped = defaultdict(lambda: defaultdict(list))
        
        for doc in documents:
            doc_type = doc.get('document', 'unknown')
            element = doc.get('element', 'unknown')
            grouped[doc_type][element].append(doc)
        
        chunk_id = 0
        for doc_type, elements in grouped.items():
            for element, docs in elements.items():
                if len(docs) >= 2:  # Only create chunks with multiple sources
                    # Combine texts
                    combined_text = ' '.join([doc['text'] for doc in docs[:3]])  # Limit to 3 sources
                    
                    # Extract common keywords
                    all_keywords = []
                    for doc in docs:
                        all_keywords.extend(doc.get('metadata', {}).get('keywords', []))
                    
                    common_keywords = [kw for kw, count in Counter(all_keywords).items() if count >= 2]
                    
                    chunk = {
                        'chunk_id': chunk_id,
                        'document_type': doc_type,
                        'element': element,
                        'content': combined_text[:500],  # Limit length
                        'source_count': len(docs),
                        'keywords': common_keywords,
                        'relevance_score': len(docs) * len(common_keywords)  # Simple relevance metric
                    }
                    
                    chunks.append(chunk)
                    chunk_id += 1
        
        # Sort by relevance
        chunks.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return chunks[:20]  # Return top 20 chunks
    
    def _generate_contextual_summary(self, knowledge_chunks: List[Dict], 
                                   query_context: str = None) -> str:
        """Generate contextual summary from knowledge chunks"""
        if not knowledge_chunks:
            return "데이터가 충분하지 않아 요약을 생성할 수 없습니다."
        
        # Group chunks by document type
        doc_summaries = defaultdict(list)
        
        for chunk in knowledge_chunks[:10]:  # Top 10 chunks
            doc_type = chunk['document_type']
            element = chunk['element']
            keywords = ', '.join(chunk['keywords'][:3])  # Top 3 keywords
            
            summary_line = f"{element}: {keywords}" if keywords else element
            doc_summaries[doc_type].append(summary_line)
        
        # Build contextual summary
        summary_parts = []
        
        if query_context:
            summary_parts.append(f"'{query_context}' 관련 분석 결과:")
        else:
            summary_parts.append("심리 분석 데이터 요약:")
        
        for doc_type, summaries in doc_summaries.items():
            summary_parts.append(f"\n{doc_type.upper()} 관련:")
            for summary in summaries[:5]:  # Top 5 per document type
                summary_parts.append(f"  - {summary}")
        
        # Add overall insight
        total_elements = len(set(chunk['element'] for chunk in knowledge_chunks))
        summary_parts.append(f"\n총 {total_elements}개 요소가 분석되었으며, 각 요소별 심리적 특성과 해석을 포함합니다.")
        
        return '\n'.join(summary_parts)
    
    def _extract_key_concepts(self, documents: List[Dict]) -> Dict[str, str]:
        """Extract key psychological concepts and their definitions"""
        concepts = {}
        
        # Common psychological concepts
        concept_keywords = {
            '자존감': '자신에 대한 전반적인 평가와 가치감',
            '불안': '미래의 위협이나 불확실한 상황에 대한 걱정과 두려움',
            '우울': '지속적인 슬픔, 절망감, 무기력감을 특징으로 하는 정서 상태',
            '스트레스': '환경적 요구와 개인의 대처 능력 간의 불균형으로 인한 긴장 상태',
            '성격': '개인의 독특하고 일관된 행동, 사고, 감정 패턴',
            '인지': '정보를 처리하고 이해하는 정신적 과정',
            '정서': '특정 상황이나 자극에 대한 주관적 감정 반응',
            '적응': '환경 변화에 효과적으로 대응하는 능력'
        }
        
        # Find concepts mentioned in documents
        for doc in documents:
            text = doc.get('text', '').lower()
            for concept, definition in concept_keywords.items():
                if concept in text:
                    concepts[concept] = definition
        
        return concepts