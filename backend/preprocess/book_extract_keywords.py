import re
import json
import os
import PyPDF2
from collections import defaultdict

type_to_label = {
    "1": "추진형", "2": "관계형", "3": "추진형",
    "4": "내면형", "5": "내면형", "6": "안정형",
    "7": "쾌락형", "8": "추진형", "9": "안정형",
}

def extract_keywords_from_pdf(
    pdf_path: str = os.path.join(os.path.dirname(__file__), "data/성격유형별_선호도서_추천을_위한_서평_키워드_유효성_연구.pdf"),
    json_path: str = "./data/personality_keywords_labeled.json",
    delete_temp: bool = True,
    debug: bool = True
):
    """PDF에서 키워드 추출 후 JSON 저장"""
    # 1. 47~48페이지 텍스트 추출
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        text47 = reader.pages[58].extract_text()
        text48 = reader.pages[59].extract_text()

    final_text_block = ""
    if "<표 8>" in text47:
        final_text_block += text47.split("<표 8>")[-1].strip()

    if "- 49 -" in text48:
        text48 = text48.split("- 49 -")[0]
    if "- 48 -" in text48 and "6번" in text48:
        start_pos = text48.find("6번")
        text48 = text48[start_pos:].strip()

    final_text_block += "\n" + text48.strip()

    # 저장: 추출 원문
    with open("extract_keywords.txt", "w", encoding="utf-8") as f:
        f.write(final_text_block)

    # 2. 텍스트 정제 및 키워드 추출
    clean_text = re.sub(r"\n\s*", "", final_text_block)
    label_keywords = defaultdict(list)
    matches = list(re.finditer(r"(\d)번", clean_text))

    for i, match in enumerate(matches):
        type_num = match.group(1)
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(clean_text)
        section = clean_text[start:end].strip()
        tokens = re.split(r"[\s·]+", section)

        idx = 0
        while idx < len(tokens):
            token = tokens[idx].strip(".,;:!?“”‘’\"\'()[]")

            if not token:
                idx += 1
                continue

            if token == "다" and idx > 0:
                prev = label_keywords[type_num].pop() if label_keywords[type_num] else ""
                label_keywords[type_num].append(prev + "다")
                idx += 1
                continue

            if token == "다" and idx + 1 < len(tokens):
                next_token = tokens[idx + 1].strip(".,;:!?“”‘’\"\'()[]")
                merged = token + next_token
                if len(merged) >= 2 and re.fullmatch(r"[가-힣]+", merged) and merged.endswith("다"):
                    label_keywords[type_num].append(merged)
                    idx += 2
                    continue

            if len(token) >= 2 and re.fullmatch(r"[가-힣]+", token) and token.endswith("다"):
                label_keywords[type_num].append(token)

            idx += 1

    # 3. 저장: 사람이 보기 위한 텍스트
    with open("extract_keywords1.txt", "w", encoding="utf-8") as f:
        for type_num in map(str, range(1, 10)):
            label = type_to_label.get(type_num)
            kws = label_keywords.get(type_num, [])
            f.write(f"{type_num}번 ({label}, {len(kws)}개): {' '.join(kws)}\n")

    # 4. 중복 제거 후 JSON 저장 + 로그 출력
    results = []
    dup_total = 0

    for type_num in map(str, range(1, 10)):
        label = type_to_label[type_num]
        all_kws = label_keywords.get(type_num, [])
        seen = set()
        for kw in all_kws:
            if kw not in seen:
                results.append({"label": label, "keyword": kw})
                seen.add(kw)

        duplicates = len(all_kws) - len(seen)
        dup_total += duplicates
        if debug:
            print(f"{type_num}번 ({label}, {len(all_kws)}개): {duplicates}개 중복됨 (중복 제거 후 {len(seen)}개)")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    if debug:
        print(f"\n총 {len(results)}개의 키워드 저장됨 → {json_path}")
        print(f"전체 중복 제거된 키워드 수: {dup_total}개")

    # 5. 임시 파일 삭제
    if delete_temp:
        for file in ["extract_keywords.txt", "extract_keywords1.txt"]:
            try:
                os.remove(file)
            except FileNotFoundError:
                if debug:
                    print(f"{file} 없음 (이미 삭제되었거나 생성되지 않음)")

if __name__ == "__main__":
    extract_keywords_from_pdf()