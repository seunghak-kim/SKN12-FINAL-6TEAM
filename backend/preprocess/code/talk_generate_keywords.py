import json
import openai
import os
import asyncio
import re
from tqdm.asyncio import tqdm_asyncio
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# -- 설정 (필요시 수정) --
# OpenAI API 키 설정 (환경 변수 사용을 권장합니다)
API_KEY = os.getenv("OPENAI_API_KEY")

# 동시에 처리할 최대 작업 수 (API 속도 제한에 맞춰 조절)
MAX_CONCURRENT_TASKS = 2

# API 호출 실패 시 자동 재시도 횟수
MAX_RETRIES = 5

# 파일 경로
INPUT_FILE = './backend/preprocess/result/talk_data.json'
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'result/talk_data_keywords.json')

# LLM 모델
LLM_MODEL = "gpt-4o"

async def extract_keyword(client, semaphore, text, pbar):
    """
    LLM을 사용하여 텍스트의 핵심 감정 키워드를 추출합니다.
    Semaphore로 동시 요청 수를 제어합니다.
    """
    # 키워드 추출에 최적화된 프롬프트
    prompt = f"""다음 문장에서 가장 핵심적인 감정을 나타내는 키워드 하나를 명사 형태로 추출해줘.
예: '불안', '우울', '기쁨', '분노', '상실감', '성취감'
다른 설명이나 문장은 절대 추가하지 말고, 키워드 하나만 응답해줘.

문장: "{text}"
키워드: """
    
    messages = [{"role": "user", "content": prompt}]

    # Semaphore를 사용하여 동시 실행 수를 제어
    async with semaphore:
        try:
            response = await client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                max_tokens=10,  # 키워드 길이를 고려해 토큰 수 조정
                temperature=0.1,
                n=1
            )
            content = response.choices[0].message.content.strip()
            
            if content:
                # 불필요한 따옴표나 특수문자 제거
                return re.sub(r'["\'.]', '', content)

        except openai.RateLimitError as e:
            print(f"API 속도 제한에 도달하여 재시도에 실패했습니다: {e}")
            return "키워드추출실패_속도제한"
        except Exception as e:
            print(f"API 호출 중 예측하지 못한 오류가 발생했습니다: {e}")
            return "키워드추출실패_오류"
        finally:
            pbar.update(1)  # 작업 완료 시 진행바 업데이트

    return "키워드추출실패_무효답변"


def extract_data():
    """
    JSON 파일을 읽어 각 항목에 키워드를 추가하고 새 파일로 저장합니다.
    """
    import re
    return asyncio.run(main_async())

async def main_async():
    """
    JSON 파일을 읽어 각 항목에 키워드를 추가하고 새 파일로 저장합니다.
    """
    if not API_KEY:
        print("error : OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
        return False

    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f" '{INPUT_FILE}' 파일 로드 완료.")
    except FileNotFoundError:
        print(f"error : '{INPUT_FILE}'을 찾을 수 없습니다.")
        return False

    # 클라이언트 초기화 시 자동 재시도 옵션 설정
    client = openai.AsyncOpenAI(api_key=API_KEY, max_retries=MAX_RETRIES)
    
    # 동시 작업 수를 제어하기 위한 Semaphore 생성
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_TASKS)
    
    # 'keyword' 필드가 없는 항목만 처리 대상으로 선정
    items_to_process = [item for item in data if 'keyword' not in item]
    
    if not items_to_process:
        print(" 모든 항목에 키워드가 이미 존재합니다.")
        return True

    print(f" 총 {len(items_to_process)}개의 항목에 키워드 추가를 시작합니다...")
    print(f"(동시 처리 작업 수: {MAX_CONCURRENT_TASKS}, 자동 재시도: {MAX_RETRIES}회)")

    with tqdm_asyncio(total=len(items_to_process), desc="키워드 추출 진행", unit="개") as pbar:
        # 수정된 extract_keyword 함수 호출
        tasks = [extract_keyword(client, semaphore, item['text'], pbar) for item in items_to_process]
        keywords = await asyncio.gather(*tasks)

    # 결과 데이터에 키워드 추가
    for item, keyword in zip(items_to_process, keywords):
        if keyword and not keyword.startswith("키워드추출실패"):
            item['keyword'] = keyword
        else:
            item['keyword'] = "키워드추출실패"  # 명확한 실패 표시
            
    try:
        # 출력 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f" 결과가 '{OUTPUT_FILE}' 파일에 성공적으로 저장되었습니다.")
        return True
    except IOError as e:
        print(f"error : 파일 저장 중 오류 발생 - {e}")
        return False

if __name__ == "__main__":
    extract_data()