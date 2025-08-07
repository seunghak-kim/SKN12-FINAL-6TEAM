import json
import re
import openai
import os
from tqdm import tqdm
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# --- 설정 ---
# OpenAI API 키 설정 (환경 변수 사용을 권장합니다)
API_KEY = os.getenv("OPENAI_API_KEY")

# 처리할 파일 경로
INPUT_JSON_FILE = os.path.join(os.path.dirname(__file__), "data/감성대화말뭉치(최종데이터)_Training.json")
OUTPUT_JSON_FILE = os.path.join(os.path.dirname(__file__), "result/talk_data.json")

# LLM 모델 및 처리 설정
LLM_MODEL = "gpt-4o"
MAX_CONCURRENT_TASKS = 8  # 동시 처리할 최대 작업 수
MAX_RETRIES = 3           # API 호출 실패 시 자동 재시도 횟수
MAX_SENTENCES = 1000      # 처리할 최대 문장 수 (테스트용)

# --- 에니어그램 분류 정보 ---
enneagram_groups = {
    '추진형': [1, 3, 8],
    '관계형': [2],
    '안정형': [6, 9],
    '쾌락형': [7],
    '내면형': [4, 5]
}

def map_enneagram_to_group(enneagram_num):
    """에니어그램 번호를 지정된 5가지 유형 중 하나로 매핑합니다."""
    if not isinstance(enneagram_num, int):
        return None
    for group, nums in enneagram_groups.items():
        if enneagram_num in nums:
            return group
    return None

def load_and_extract_sentences(path, max_objects):
    """
    대용량 JSON 파일을 스트리밍으로 읽어, 'HS'로 시작하는 문장을 추출합니다.
    """
    print(f"'{path}' 파일에서 문장 추출을 시작합니다...")
    sentences = []
    buffer = ''
    brace_count = 0
    object_count = 0

    with open(path, 'r', encoding='utf-8') as f:
        while True:
            char = f.read(1)
            if not char:
                break

            if char == '{':
                if brace_count == 0:
                    buffer = ''
                brace_count += 1
            
            if brace_count > 0:
                buffer += char
            
            if char == '}':
                brace_count -= 1
                if brace_count == 0 and buffer:
                    try:
                        obj = json.loads(buffer)
                        object_count += 1
                        
                        talk = obj.get('talk', {})
                        content = talk.get('content', {})
                        for key, value in content.items():
                            if key.startswith('HS') and value.strip():
                                sentences.append(value.strip())
                        
                        if object_count >= max_objects:
                            break
                    except json.JSONDecodeError:
                        # 파싱 오류는 무시하고 계속 진행
                        continue
    
    print(f"총 {len(sentences)}개의 문장을 추출했습니다.")
    return sentences

def classify_sentence_with_retry(client, sentence):
    """
    LLM을 사용하여 문장의 에니어그램 유형을 분석하고, 실패 시 재시도합니다.
    """
    prompt = f"""다음 문장의 핵심 감정을 분석하고, 가장 유사한 에니어그램 유형을 1부터 9까지의 숫자 하나로만 답해주세요.
다른 설명이나 부가적인 텍스트는 절대 포함하지 마세요.

문장: "{sentence}"
에니어그램 유형(숫자만): """
    
    messages = [{"role": "user", "content": prompt}]

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                max_tokens=5,
                temperature=0.2,
            )
            content = response.choices[0].message.content.strip()
            
            if content.isdigit() and 1 <= int(content) <= 9:
                return {"text": sentence, "enneagram_num": int(content)}
                
        except openai.RateLimitError:
            if attempt < MAX_RETRIES - 1:
                print(f"API 속도 제한 오류. 5초 후 재시도합니다... (문장: {sentence[:20]}...)")
                import time
                time.sleep(5)
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                print(f"API 호출 오류: {e}. 1초 후 재시도합니다... (문장: {sentence[:20]}...)")
                import time
                time.sleep(1)

    # 모든 재시도 실패 시
    return {"text": sentence, "enneagram_num": None}

def extract_keywords():
    """
    원본 JSON에서 문장을 추출하고, LLM으로 분류하여 최종 데이터를 생성합니다.
    """
    if not API_KEY:
        print("error : OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
        return False

    try:
        sentences = load_and_extract_sentences(INPUT_JSON_FILE, max_objects=MAX_SENTENCES)
    except FileNotFoundError:
        print(f"error : '{INPUT_JSON_FILE}' 파일을 찾을 수 없습니다.")
        return False
        
    if not sentences:
        print("처리할 문장이 없습니다.")
        return False

    client = openai.OpenAI(api_key=API_KEY)

    print(f"총 {len(sentences)}개 문장의 감정 분류를 시작합니다...")

    results_with_num = []
    for sentence in tqdm(sentences, desc="감정 분류 진행"):
        result = classify_sentence_with_retry(client, sentence)
        results_with_num.append(result)

    final_data = []
    success_count = 0
    failure_count = 0
    for res in results_with_num:
        enneagram_num = res.get("enneagram_num")
        if enneagram_num is not None:
            group = map_enneagram_to_group(enneagram_num)
            # 매핑이 성공한 경우에만 최종 데이터에 추가
            if group:
                final_data.append({"text": res["text"], "label": group})
                success_count += 1
            else:
                # 이 경우는 거의 발생하지 않음 (1-9 숫자만 받으므로)
                final_data.append({"text": res["text"], "label": "매핑실패"})
                failure_count += 1
        else:
            # 재시도에도 실패한 경우
            final_data.append({"text": res["text"], "label": "분류실패"})
            failure_count += 1

    print("\n감정 분류 작업 완료!")
    print(f"   - 성공: {success_count}개")
    print(f"   - 실패: {failure_count}개")

    try:
        # 출력 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(OUTPUT_JSON_FILE), exist_ok=True)
        
        with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        print(f"최종 결과가 '{OUTPUT_JSON_FILE}' 파일에 성공적으로 저장되었습니다.")
        return True
    except IOError as e:
        print(f"error : 파일 저장 중 오류 발생 - {e}")
        return False

if __name__ == "__main__":
    extract_keywords()
