"""
OpenSearch Demo and Interactive Search Functions
"""

import os
from opensearch_client import OpenSearchEmbeddingClient


def interactive_opensearch_search():
    """
    대화형 OpenSearch 검색
    """
    print("\n" + "="*60)
    print("대화형 OpenSearch 검색 (종료하려면 'quit' 입력)")
    print("="*60)
    
    client = OpenSearchEmbeddingClient()
    index_name = "psychology_analysis"
    
    while True:
        query = input("\n검색어를 입력하세요: ").strip()
        
        if query.lower() in ['quit', 'exit', '종료']:
            print("검색을 종료합니다.")
            break
        
        if not query:
            continue
        
        try:
            # 하이브리드 검색으로 초기 후보군 확보
            print("\n1. 하이브리드 검색(유사도+키워드)을 실행합니다...")
            hybrid_results = client.hybrid_search(index_name, query, k=10, use_reranker=False)

            print("\n[초기 검색 결과]")
            print("-" * 40)
            if not hybrid_results:
                print("초기 검색 결과가 없습니다.")
                return

            for i, result in enumerate(hybrid_results, 1):
                cosine_sim = (result['score'] * 2) - 1 if result['score'] <= 1.0 else result['score']
                print(f"\n{i}. 문서: {result['document']} | 요소: {result['element']}")
                print(f"   유사도(추정): {cosine_sim:.4f} | 내용: {result['text']}")

            # Reranker로 재정렬
            print("\n\n2. Reranker로 관련도 높은 순으로 재정렬합니다...")
            reranked_results = client.rerank_results(query, hybrid_results, top_k=5)

            print("\n[최종 검색 결과 (Reranked)]")
            print("-" * 40)
            if not reranked_results:
                print("최종 검색 결과가 없습니다.")
                continue

            for i, result in enumerate(reranked_results, 1):
                print(f"\n{i}. 문서: {result['document']}")
                print(f"   요소: {result['element']}")
                if 'rerank_score' in result:
                    print(f"   관련도 점수: {result['rerank_score']:.4f} (초기 점수: {result['score']:.4f})")
                else:
                    cosine_sim = (result['score'] * 2) - 1
                    print(f"   코사인 유사도: {cosine_sim:.4f} (OpenSearch 점수: {result['score']:.4f})")
                print(f"   내용: {result['text']}")

                keywords = result['metadata'].get('keywords', [])
                if keywords:
                    print(f"   감정 키워드: {'; '.join(keywords)}")
        
        except Exception as e:
            print(f"검색 중 오류 발생: {e}")


def demo_opensearch_system():
    """
    OpenSearch 시스템 데모
    """
    print("OpenSearch 임베딩 시스템 데모")
    print("=" * 50)
    
    try:
        # 클라이언트 초기화
        client = OpenSearchEmbeddingClient()
        index_name = "psychology_analysis"
        
        # 인덱스 생성
        print("1. 인덱스 생성 중...")
        client.create_embedding_index(index_name)
        
        # 데이터 인덱싱 (임베딩 파일이 있는 경우에만)
        embeddings_dir = './embeddings'
        if os.path.exists(embeddings_dir):
            print("2. 임베딩 데이터 인덱싱 중...")
            response = client.index_embedding_data(index_name, embeddings_dir)
            print(f"인덱싱 완료: {response}")
        else:
            print("2. 임베딩 디렉토리를 찾을 수 없습니다. 스킵합니다.")
        
        # 인덱스 통계
        print("3. 인덱스 통계 조회 중...")
        stats = client.get_index_stats(index_name)
        if stats:
            print(f"총 문서 수: {stats['total_docs']}")
            print(f"문서별 분포: {stats['documents']}")
        
        print("\n데모 완료!")
        
    except Exception as e:
        print(f"데모 실행 중 오류: {e}")


if __name__ == "__main__":
    # 데모 실행
    demo_opensearch_system()
    
    # 대화형 검색 (선택사항)
    user_input = input("\n대화형 검색을 시작하시겠습니까? (y/n): ").strip().lower()
    if user_input in ['y', 'yes', '예']:
        interactive_opensearch_search()