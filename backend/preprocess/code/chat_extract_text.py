import PyPDF2
import re
import json
import asyncio
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
load_dotenv()  # .env 파일에서 환경 변수 로드

# =================================================================================
# 2부: 'crawled_text.txt'에서 예문을 추출하고 텍스트 정제 (LLM 처리 준비)
# =================================================================================
def run_part2_sentence_extraction(input_filename=None):
    """
    'crawled_text.txt' 파일을 읽고, 정제된 예문 목록을 반환합니다.
    """
    if input_filename is None:
        input_filename = os.path.join(os.path.dirname(__file__), "result/crawled_text.txt")
    print(f"\n2단계: '{input_filename}'에서 예문 목록을 추출하고 텍스트를 정제합니다...")
    
    sentences = []
    # 예문 추출 패턴 (예: "ㄱ.저는 하루하루가 행복하네요." 또는 "(9)ㄱ. ...")
    sentence_pattern = re.compile(r'^[ \t]*\(?\d*\)?[ㄱ-ㅎ]\.\s*(.+)')

    try:
        with open(input_filename, "r", encoding="utf-8") as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue

            sentence_match = sentence_pattern.search(line)
            if sentence_match:
                text = sentence_match.group(1).strip()
                
                # --- 텍스트 정제 로직 ---
                # 1. '[' 와 ']' 사이의 내용과 대괄호 자체를 제거
                text = re.sub(r'\[.*?\]', '', text)
                # 2. '(' 문자 제거
                text = text.replace('(', '')
                # 3. ')' 문자를 공백으로 대체
                text = text.replace(')', ' ')
                # 4. 여러 공백을 하나로 줄이고, 양 끝 공백 제거
                text = ' '.join(text.split())
                
                if text:
                    sentences.append(text)

        print(f"성공: {len(sentences)}개의 예문을 추출했습니다.")
        return sentences

    except FileNotFoundError:
        print(f"오류: '{input_filename}' 파일을 찾을 수 없습니다.")
        return []
    except Exception as e:
        print(f"2단계 실행 중 오류가 발생했습니다: {e}")
        return []


# =================================================================================
# 3부: OpenAI LLM을 사용하여 키워드 추출 및 에니어그램 유형 분류 (안정성 강화)
# =================================================================================

async def get_keyword_and_label_with_llm(client: AsyncOpenAI, text: str, retries=3) -> dict:
    """
    LLM(GPT-4o)을 호출하여 주어진 문장에서 키워드와 라벨을 동시에 추출합니다.
    실패 시 자동으로 재시도하며, 최종 실패 시 안전한 기본값을 반환합니다.
    """
    system_prompt = """
    당신은 텍스트에서 핵심 감정을 분석하는 전문가입니다. 주어진 문장을 읽고 다음 두 가지 작업을 수행한 후, 결과를 반드시 JSON 형식으로 반환해야 합니다.

    1.  **키워드 추출**: 문장의 핵심적인 감정을 가장 잘 나타내는 단일 키워드(예: '기쁨', '슬픔')를 추출합니다.
    2.  **감정 분류**: 추출된 감정을 아래 5가지 유형 중 가장 적합한 하나로 분류합니다.

    # 감정 유형 정의:
    - 추진형: 분노, 짜증, 화와 같이 목표 지향적이고 주도적인 감정.
    - 관계형: 기쁨, 사랑, 만족, 감사, 행복과 같이 타인과의 긍정적 관계에서 비롯되는 감정.
    - 안정형: 불안, 두려움, 평온, 걱정과 같이 안정과 평화를 추구하는 감정.
    - 쾌락형: 신남, 즐거움, 흥분과 같이 즉각적인 즐거움과 쾌락을 추구하는 감정.
    - 내면형: 슬픔, 우울, 부끄러움, 상처, 외로움과 같이 내면의 성찰과 관련된 깊은 감정.

    # 출력 형식 (반드시 JSON 형식이어야 함):
    {"keyword": "추출된 키워드", "label": "분류된 유형"}
    """
    
    for attempt in range(retries):
        try:
            completion = await client.chat.completions.create(
                model="gpt-4o",
                response_format={"type": "json_object"}, # JSON 출력 모드 활성화
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"분석할 문장: \"{text}\""}
                ],
                temperature=0,
            )
            
            response_data = json.loads(completion.choices[0].message.content)
            keyword = response_data.get("keyword", "키워드 없음")
            label = response_data.get("label", "내면형")

            valid_labels = ["추진형", "관계형", "안정형", "쾌락형", "내면형"]
            if label not in valid_labels:
                print(f"경고: 문장 '{text[:20]}...'에 대해 예기치 않은 라벨 '{label}'이 반환되었습니다. '내면형'으로 기본 설정합니다.")
                label = "내면형"

            return {"keyword": keyword, "label": label}

        except Exception as e:
            print(f"오류 발생 (시도 {attempt + 1}/{retries}): 문장 '{text[:20]}...' 분석 중 오류 - {e}")
            if attempt < retries - 1:
                await asyncio.sleep(1)  # 재시도 전 잠시 대기
            else:
                print("최종 분석 실패. 문맥에 기반한 안전한 기본값(안정형)을 사용합니다.")
                # 최종 실패 시, 키워드 없이 라벨만이라도 안전하게 부여
                return {"keyword": "분석 실패", "label": "안정형"}

async def main():
    """
    전체 분류 프로세스를 실행하는 메인 비동기 함수
    """
    print("\n3단계: OpenAI LLM(gpt-4o)을 사용하여 키워드 추출 및 유형 분류를 시작합니다...")
    
    # 1. 텍스트 파일에서 정제된 문장 목록 가져오기
    sentences = run_part2_sentence_extraction()
    if not sentences:
        print("처리할 문장이 없어 프로그램을 종료합니다.")
        return

    # 2. OpenAI 클라이언트 설정
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("오류: OpenAI API 키가 설정되지 않았습니다.")
        print("시스템 환경 변수에 'OPENAI_API_KEY'를 설정해주세요.")
        return
    client = AsyncOpenAI(api_key=api_key)

    try:
        # 3. 각 문장에서 키워드와 라벨 동시 추출
        print(f"\n{len(sentences)}개 문장에 대한 분석을 시작합니다...")
        tasks = [get_keyword_and_label_with_llm(client, text) for text in sentences]
        results = await asyncio.gather(*tasks)

        # 4. 최종 데이터 조합
        all_data = []
        for i, text in enumerate(sentences):
            result = results[i]
            all_data.append({
                "text": text,
                "label": result["label"],
                "keyword": result["keyword"]
            })
            
        # 5. 한글로 시작하지 않는 데이터 필터링
        print(f"\n데이터 필터링을 시작합니다: 텍스트가 한글로 시작하는 항목만 유지합니다...")
        final_data = []
        korean_pattern = re.compile(r'^[가-힣]')
        for item in all_data:
            if item.get("text") and korean_pattern.match(item["text"]):
                final_data.append(item)
        
        removed_count = len(all_data) - len(final_data)
        if removed_count > 0:
            print(f"{removed_count}개의 항목이 한글로 시작하지 않아 제거되었습니다.")

        # 6. 최종 결과를 'chat_data_keywords.json' 파일에 저장
        json_filename = os.path.join(os.path.dirname(__file__), "result/chat_data_keywords.json")
        os.makedirs(os.path.dirname(json_filename), exist_ok=True)
        with open(json_filename, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)

        print(f"\n성공: '{json_filename}' 파일이 최종 생성되었습니다.")
        print(f"총 {len(final_data)}개의 데이터 처리가 완료되었습니다.")

    except Exception as e:
        print(f"3단계 메인 실행 중 오류가 발생했습니다: {e}")
        
    finally:
        # 7. 임시로 생성된 crawled_text.txt 파일 삭제
        crawl_txt_path = os.path.join(os.path.dirname(__file__), "result/crawled_text.txt")
        print(f"\n임시 파일 '{crawl_txt_path}'를 삭제합니다...")
        try:
            if os.path.exists(crawl_txt_path):
                os.remove(crawl_txt_path)
                print(f"'{crawl_txt_path}' 파일이 성공적으로 삭제되었습니다.")
            else:
                print(f"'{crawl_txt_path}' 파일이 이미 삭제되었거나 존재하지 않습니다.")
        except Exception as e:
            print(f"파일 삭제 중 오류가 발생했습니다: {e}")


def extract_chat_text():
    """
    PDF에서 텍스트를 추출하고 감정 분석을 수행하는 함수
    """
    try:
        # 1단계: PDF 처리
        print("1단계: PDF에서 특정 섹션을 추출합니다...")
        
        def extract_section_from_pdf(pdf_path, section_title, next_section_title):
            #지정된 PDF 파일에서 두 섹션 제목 사이의 텍스트를 추출합니다.
            with open(pdf_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                full_text = ""
                for page in reader.pages:
                    # 일부 PDF에서 텍스트 추출이 실패할 경우를 대비
                    try:
                        full_text += page.extract_text() + "\n"
                    except Exception:
                        print(f"{page.page_number + 1} 페이지에서 텍스트를 추출하는 데 실패했습니다.")
                        continue

            # 정규식을 사용하여 원하는 섹션의 내용을 찾습니다.
            pattern = re.compile(
                rf"{re.escape(section_title)}(.*?)(?={re.escape(next_section_title)}|\Z)",
                re.DOTALL
            )
            match = pattern.search(full_text)
            if match:
                print("원하는 섹션을 찾았습니다.")
                return match.group(1).strip()
            else:
                print("원하는 섹션을 찾지 못했습니다.")
                return "해당 섹션을 찾을 수 없습니다."

        # PDF 파일 경로를 절대 경로로 설정
        pdf_path = os.path.join(os.path.dirname(__file__), "data/멘탈케어_챗봇의_의도분석_학습데이터_구축을_위한_심리상담_대화의_감정표현.pdf")
        section_title = "4.데이터에 기반한 감정 표현 유형 분류"
        next_section_title = "5.챗봇 의도분석 모델을 위한 감정분류 학습데이터 구축"
        
        section_text = extract_section_from_pdf(pdf_path, section_title, next_section_title)

        # 페이지마다 반복되는 헤더/푸터 라인을 제거합니다.
        remove_pattern = re.compile(r"^(멘탈케어 챗봇의 의도분석 학습데이터 구축을 위한 심리상담 대화의 감정표현 분류 연구|박온유․남지순)\d*$")
        
        lines = section_text.splitlines()
        filtered_lines = []
        for line in lines:
            # strip()으로 앞뒤 공백 제거 후 패턴 매칭
            if not remove_pattern.match(line.strip()):
                filtered_lines.append(line)
                
        cleaned_text = "\n".join(filtered_lines)

        # 정제된 텍스트를 'crawled_txt.text'에 저장합니다.
        crawl_txt_path = os.path.join(os.path.dirname(__file__), "result/crawled_text.txt")
        os.makedirs(os.path.dirname(crawl_txt_path), exist_ok=True)
        with open(crawl_txt_path, "w", encoding="utf-8") as f:
            f.write(cleaned_text)
        print(f"'{crawl_txt_path}' 파일이 정제되어 생성되었습니다.")

        # 2단계: 메인 처리 실행
        asyncio.run(main())
        return True

    except FileNotFoundError:
        print(f"PDF 파일을 찾을 수 없습니다. 메인 처리로 바로 진행합니다.")
        try:
            asyncio.run(main())
            return True
        except Exception as e:
            print(f"메인 처리 중 오류 발생: {e}")
            return False
    except Exception as e:
        print(f"처리 중 오류 발생: {e}")
        return False

if __name__ == "__main__":
    # 이 스크립트를 실행하기 전에 필요한 라이브러리를 설치해야 합니다.
    # pip install PyPDF2 openai
    extract_chat_text()
