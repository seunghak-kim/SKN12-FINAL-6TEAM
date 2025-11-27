import os
from opensearchpy import OpenSearch

# OpenSearch 설정
host = 'localhost'
port = 9200
auth = ('admin', 'MyStrongPassword123!')
index_name = 'psychology_analysis'

# 클라이언트 생성
client = OpenSearch(
    hosts=[{'host': host, 'port': port}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=False,
    ssl_assert_hostname=False,
    ssl_show_warn=False
)

def test_search():
    try:
        # 1. 인덱스 존재 확인
        if not client.indices.exists(index=index_name):
            print(f"인덱스 '{index_name}'가 존재하지 않습니다.")
            return

        # 2. 문서 개수 확인
        count = client.count(index=index_name)
        print(f"인덱스 '{index_name}' 문서 개수: {count['count']}개")

        if count['count'] == 0:
            print("문서가 0개입니다. 데이터 초기화가 아직 안 끝났거나 실패했을 수 있습니다.")
            return

        # 3. 간단한 검색 테스트
        query = {
            "size": 1,
            "query": {
                "match_all": {}
            }
        }
        response = client.search(index=index_name, body=query)
        print("\n✅ 검색 테스트 성공! (첫 번째 문서 샘플):")
        print(response['hits']['hits'][0]['_source'])

    except Exception as e:
        print(f"검색 테스트 실패: {e}")

if __name__ == "__main__":
    test_search()
