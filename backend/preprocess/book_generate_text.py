import json
import os
from openai import OpenAI
from dotenv import load_dotenv

# .env에서 API 키 로드
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=api_key)

# 감정 문장 생성 함수
def generate_sentence(label, keyword):
    prompt = f"""
너는 상대방의 심리를 분석해주는 심리상담가 AI 챗봇이야.  
주어진 **성격 유형(label)**과 **형용사 키워드(keyword)**를 바탕으로,  
상대방의 감정을 분석하듯 **자연스럽고 설명적인 문장** 하나를 생성해줘.

- 형식: 1문장, 상담 분석 결과를 설명하는 듯한 말투로 간결하게
- 말투: 심리 상담가가 상대방의 심리를 분석하고 이를 얘기해주는 방식
- 주어는 "당신은" 또는 생략된 형태로 (예: "당신은 항상 완벽하고 싶어합니다.")
- 분석 결과로 나올만한 설명적인 말투를 써서, 심리분석가의 느낌이 들도록

예시:
- label: 추진형, keyword: 철저하다 → "당신은 항상 완벽하고 싶어합니다. 보통 당신과 같은 사람들은 작은 실수도 용납하지 못하는 경우가 많습니다."
- label: 관계형, keyword: 따뜻하다 → "따뜻한 말 한마디를 오랫동안 기억하고 있는 경향이 있어보입니다."

이제 다음 정보를 참고해서 문장을 생성해줘.

성격 유형: {label}  
형용사 키워드: {keyword}
"""
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.75,
    )
    return response.choices[0].message.content.strip()

def generate_personality_texts(
    input_json_path: str = "./data/personality_keywords_labeled.json",
    output_json_path: str = "./data/personality_keywords_dataset_v2.json",
    label_counts: dict = None,
    debug: bool = True
):
    """키워드 기반으로 성격 유형별 텍스트 생성"""
    if label_counts is None:
        label_counts = {
            "추진형": 1,
            "관계형": 3,
            "쾌락형": 3,
            "내면형": 2,
            "안정형": 2,
        }
    
    # 키워드 JSON 로드
    with open(input_json_path, "r", encoding="utf-8") as f:
        keyword_data = json.load(f)

    augmented_data = []

    # 문장 생성
    for item in keyword_data:
        label = item["label"]
        keyword = item["keyword"]
        count = label_counts.get(label, 1)  # 기본값 1개
        for i in range(count):
            try:
                text = generate_sentence(label, keyword)
                augmented_data.append({
                    "label": label,
                    "keyword": keyword,
                    "text": text
                })
                if debug:
                    print(f"{i+1}/{count} 생성 완료: {label} / {keyword}")
            except Exception as e:
                if debug:
                    print(f"오류 발생: {label} / {keyword} → {e}")
                augmented_data.append({
                    "label": label,
                    "keyword": keyword,
                    "text": None
                })

    # 결과 저장
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(augmented_data, f, ensure_ascii=False, indent=2)

    if debug:
        print(f"모든 문장 생성 완료! → {output_json_path} 저장됨")

if __name__ == "__main__":
    generate_personality_texts()