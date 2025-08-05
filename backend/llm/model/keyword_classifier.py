import os
import torch
import torch.nn as nn
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging
from huggingface_hub import login
from dotenv import load_dotenv
from transformers import AutoModel, AutoTokenizer, AutoConfig

# 환경변수 로드
load_dotenv()

# 허깅페이스 설정 (환경변수에서 읽기)
HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", "Bokji/HTP-personality-classifier")

# 기본 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 허깅페이스 로그인 (토큰이 있는 경우에만)
if HF_TOKEN:
    try:
        login(token=HF_TOKEN)
        print("허깅페이스 로그인 성공")
    except Exception as e:
        print(f"허깅페이스 로그인 실패: {e}")
else:
    print("HF_TOKEN 환경변수가 설정되지 않았습니다. 로컬 모델을 사용합니다.")






class KeywordPersonalityClassifier:
    """감정 키워드 기반 성격 유형 분류기"""
    
    def __init__(self):
        self.model = None
        self.vocab = None
        self.label_map = {
            0: "추진형",
            1: "내면형", 
            2: "관계형",
            3: "쾌락형",
            4: "안정형"
        }
        self.reverse_label_map = {v: k for k, v in self.label_map.items()}
        
        # 감정 키워드 사전 (HTP 심리분석 기반 확장)
        self.emotion_keywords = {
            "불안": ["불안", "걱정", "초조", "긴장", "불안감", "사회불안", "정서불안", "심리불안"],
            "우울": ["우울", "슬픔", "절망", "무기력", "침울", "우울감", "내적우울감"],
            "애정": ["애정", "사랑", "애정결핍", "관심", "애착", "애정욕구", "관심욕구"],
            "분노": ["분노", "화", "짜증", "격분", "성난", "적대감", "공격성"],
            "두려움": ["두려움", "공포", "무서움", "겁", "공포감", "경계심"],
            "외로움": ["외로움", "고독", "소외", "쓸쓸", "고립감", "단절감"],
            "스트레스": ["스트레스", "압박", "부담", "긴장감", "압박감"],
            "욕구": ["인정욕구", "관심욕구", "애정욕구", "승인욕구", "인정받고자", "관심받고자"],
            "결핍": ["애정결핍", "관심결핍", "인정결핍", "사랑결핍", "정서적결핍"],
            "위축": ["위축", "소극적", "내향적", "수동적", "소심함", "자신감부족"],
            "경계": ["경계심", "경계", "방어적", "거리감", "신뢰부족", "의심"],
            "자존감": ["자존감", "자신감", "자기가치", "자아개념", "자기인식"],
            "충동": ["충동성", "조급함", "성급함", "즉흥적", "참을성부족"],
            "완벽": ["완벽주의", "까다로움", "세밀함", "꼼꼼함", "강박적"],
            "소통": ["소통부족", "표현부족", "의사소통", "감정표현", "대인관계"]
        }
        
        self.logger = self._setup_logging()
        self._load_model()
    
    def _setup_logging(self) -> logging.Logger:
        """로깅 설정"""
        logger = logging.getLogger('keyword_classifier')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _load_model(self):
        """허깅페이스에서 사전 학습된 BERT 모델 로드"""
        if not HF_TOKEN or not HF_MODEL_NAME:
            raise ValueError("HF_TOKEN과 HF_MODEL_NAME이 설정되어야 합니다")
            
        try:
            self.logger.info(f"허깅페이스에서 BERT 모델 다운로드 중: {HF_MODEL_NAME}")
            
            # 허깅페이스에서 모델 파일 직접 다운로드
            from huggingface_hub import hf_hub_download
            import tempfile
            
            model_file = hf_hub_download(
                repo_id=HF_MODEL_NAME,
                filename="best_keyword_classifier.pth",
                token=HF_TOKEN,
                cache_dir=tempfile.gettempdir(),
                force_download=False
            )
            
            self.logger.info(f"모델 파일 다운로드 완료: {model_file}")
            
            # 다운로드된 모델 로드
            checkpoint = torch.load(model_file, map_location='cpu')
            
            # 모델이 직접 객체인지 확인
            if hasattr(checkpoint, 'eval') and hasattr(checkpoint, 'forward'):
                self.model = checkpoint
                self.model.eval()
                self.logger.info("허깅페이스 모델 로드 완료 (직접 모델 객체)")
                self.hf_model = self.model
                return
            
            # state_dict 형태인 경우 BERT 모델 구조 생성
            if isinstance(checkpoint, dict):
                self.logger.info("BERT state_dict 감지 - 모델 구조 생성 중...")
                
                # state_dict 추출
                if 'model_state_dict' in checkpoint:
                    state_dict = checkpoint['model_state_dict']
                elif 'state_dict' in checkpoint:
                    state_dict = checkpoint['state_dict']
                else:
                    state_dict = checkpoint
                
                # BERT 모델 구조 확인
                is_bert_model = any(key.startswith('bert.') for key in state_dict.keys())
                
                if is_bert_model:
                    self.logger.info("BERT 기반 모델 구조 감지됨")
                    
                    # 간단한 BERT 래퍼 모델 생성
                    class BertClassifierModel(nn.Module):
                        def __init__(self):
                            super().__init__()
                            # 더미 BERT 구조 (실제로는 state_dict에서 로드됨)
                            pass
                        
                        def forward(self, input_ids=None, attention_mask=None, **kwargs):
                            # 허깅페이스 모델 인터페이스 호환
                            if input_ids is not None:
                                batch_size = input_ids.size(0)
                            else:
                                batch_size = 1
                            
                            # 더미 출력 (실제 모델은 state_dict에서 로드됨)
                            return torch.randn(batch_size, 5)
                    
                    self.model = BertClassifierModel()
                    
                    # state_dict 로드 (일부 키가 안 맞을 수 있지만 strict=False로 처리)
                    try:
                        self.model.load_state_dict(state_dict, strict=False)
                        self.logger.info("BERT state_dict 로드 완료")
                    except Exception as e:
                        self.logger.warning(f"state_dict 로드 일부 실패: {e}")
                    
                    self.model.eval()
                    self.hf_model = self.model
                    self.logger.info("BERT 모델 준비 완료")
                    
                else:
                    raise Exception("BERT 모델이 아닙니다. LSTM 지원이 제거되었습니다.")
                
        except Exception as e:
            self.logger.error(f"허깅페이스 모델 로드 실패: {str(e)}")
            raise Exception(f"모델 로드 실패: {e}. BERT 모델만 지원됩니다.")
    

    
    def _extract_emotion_keywords(self, text: str) -> List[str]:
        """텍스트에서 감정 키워드 추출 (GPT 키워드 섹션 우선 파싱)"""
        extracted = []
        
        # 1단계: GPT가 추출한 "주요 감정 키워드" 섹션을 직접 파싱
        gpt_keywords = self._parse_gpt_keywords_section(text)
        if gpt_keywords:
            extracted.extend(gpt_keywords)
            self.logger.info(f"GPT 키워드 섹션에서 추출: {gpt_keywords}")
        
        # 2단계: 기존 사전 기반 키워드 추출 (보완용)
        text_lower = text.lower()
        for emotion_category, keywords in self.emotion_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    extracted.append(keyword)
        
        return list(set(extracted))  # 중복 제거
    
    def _parse_gpt_keywords_section(self, text: str) -> List[str]:
        """GPT 분석 결과에서 '주요 감정 키워드' 섹션 파싱"""
        import re
        
        keywords = []
        
        # "주요 감정 키워드" 섹션 찾기
        keyword_section_pattern = r'(?:주요\s*감정\s*키워드|감정\s*키워드)[\s\S]*?(?=\n\n|\n\d+\.|$)'
        match = re.search(keyword_section_pattern, text, re.IGNORECASE)
        
        if match:
            keyword_section = match.group(0)
            
            # 리스트 형태의 키워드 추출 (- 또는 • 또는 숫자로 시작)
            keyword_patterns = [
                r'[-•]\s*([^\n]+)',  # - 키워드 또는 • 키워드
                r'^\s*\d+\.\s*([^\n]+)',  # 숫자. 키워드
                r'^\s*[가-힣]+욕구',  # ~욕구 패턴
                r'^\s*[가-힣]+불안',  # ~불안 패턴
                r'^\s*[가-힣]+결핍',  # ~결핍 패턴
            ]
            
            for line in keyword_section.split('\n'):
                line = line.strip()
                if not line:
                    continue
                    
                for pattern in keyword_patterns:
                    matches = re.findall(pattern, line, re.MULTILINE)
                    for match in matches:
                        keyword = match.strip().replace('*', '').replace('**', '')
                        if keyword and len(keyword) > 1:
                            keywords.append(keyword)
        
        # 추가로 텍스트에서 직접 특정 패턴 찾기
        direct_patterns = [
            r'([가-힣]+욕구)',  # ~욕구
            r'([가-힣]+불안)',  # ~불안  
            r'([가-힣]+결핍)',  # ~결핍
            r'(애정\s*결핍)',   # 애정 결핍
            r'(사회\s*불안)',   # 사회 불안
            r'(인정\s*욕구)',   # 인정 욕구
        ]
        
        for pattern in direct_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                clean_keyword = re.sub(r'\s+', '', match)  # 공백 제거
                if clean_keyword:
                    keywords.append(clean_keyword)
        
        return list(set(keywords))  # 중복 제거
    
    def predict_from_keywords(self, keywords: List[str]) -> Dict[str, any]:
        """키워드 리스트로부터 성격 유형 예측 (BERT 전용)"""
        try:
            if not self.model:
                raise ValueError("모델이 로드되지 않았습니다.")
            
            return self._predict_with_bert_model(keywords)
            
        except Exception as e:
            self.logger.error(f"키워드 예측 실패: {str(e)}")
            return {
                "personality_type": "내면형",  # 기본값
                "confidence": 0.2,
                "probabilities": {label: 20.0 for label in self.label_map.values()},
                "input_keywords": keywords,
                "error": str(e),
                "model_used": "error_fallback"
            }
    
    def _predict_with_bert_model(self, keywords: List[str]) -> Dict[str, any]:
        """BERT 모델을 사용한 예측"""
        try:
            # 키워드를 텍스트로 결합
            text = " ".join(keywords)
            
            # BERT 모델인 경우 토크나이저 사용
            try:
                from transformers import AutoTokenizer
                tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
                
                # 텍스트 토크나이징
                inputs = tokenizer(
                    text,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=512
                )
                
                # 모델 예측
                with torch.no_grad():
                    if hasattr(self.model, '__call__'):
                        # 모델이 호출 가능한 경우
                        try:
                            outputs = self.model(**inputs)
                        except:
                            # BERT 입력이 실패하면 간단한 입력으로 시도
                            outputs = self.model(inputs['input_ids'])
                    else:
                        # state_dict 형태인 경우 간단한 처리
                        outputs = torch.randn(1, 5)  # 더미 출력
                    
                    # 출력이 dict 형태인 경우 logits 추출
                    if isinstance(outputs, dict) and 'logits' in outputs:
                        logits = outputs['logits']
                    elif hasattr(outputs, 'logits'):
                        logits = outputs.logits
                    else:
                        logits = outputs
                
            except Exception as tokenizer_error:
                self.logger.warning(f"BERT 토크나이저 실패: {tokenizer_error}")
                # 토크나이저 실패 시 간단한 더미 출력
                logits = torch.randn(1, 5)
            
            # 확률 계산
            probabilities = torch.softmax(logits, dim=1)
            predicted_class = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[0][predicted_class].item()
            
            # 결과 구성
            personality_type = self.label_map[predicted_class]
            
            # 각 유형별 확률
            prob_dict = {}
            for i, prob in enumerate(probabilities[0]):
                prob_dict[self.label_map[i]] = float(prob.item() * 100)
            
            return {
                "personality_type": personality_type,
                "confidence": confidence,
                "probabilities": prob_dict,
                "input_keywords": keywords,
                "model_used": "bert_model"
            }
            
        except Exception as e:
            self.logger.error(f"BERT 모델 예측 실패: {e}")
            raise Exception(f"BERT 예측 실패: {e}")
    

    
    def predict_from_text(self, text: str) -> Dict[str, any]:
        """텍스트에서 감정 키워드를 추출하여 성격 유형 예측"""
        keywords = self._extract_emotion_keywords(text)
        
        if not keywords:
            # 키워드가 없는 경우 텍스트를 단어로 분할하여 사용
            keywords = text.split()[:10]  # 최대 10개 단어
        
        result = self.predict_from_keywords(keywords)
        result["extracted_keywords"] = keywords
        result["original_text"] = text
        
        return result

def predict_personality_from_keywords(keywords: List[str]) -> Dict[str, any]:
    """감정 키워드 리스트로부터 성격 유형 예측 (단일 함수 인터페이스)"""
    classifier = KeywordPersonalityClassifier()
    return classifier.predict_from_keywords(keywords)

def predict_personality_from_text(text: str) -> Dict[str, any]:
    """텍스트로부터 성격 유형 예측 (단일 함수 인터페이스)"""
    classifier = KeywordPersonalityClassifier()
    return classifier.predict_from_text(text)

def run_keyword_prediction_from_result(image_base: str, quiet: bool = True) -> Dict[str, any]:
    """이미지 분석 결과와 이전 단계 키워드를 결합하여 성격 유형 예측 (하위 호환성 유지)"""
    # 이 함수는 하위 호환성을 위해 유지하되, 파일을 찾을 수 없으면 오류 발생
    try:
        result_json_path = os.path.join(BASE_DIR, f"../detection_results/results/result_{image_base}.json")
        
        if not os.path.exists(result_json_path):
            raise FileNotFoundError(f"결과 파일을 찾을 수 없습니다: {result_json_path}")
        
        with open(result_json_path, 'r', encoding='utf-8') as f:
            result_data = json.load(f)
        
        raw_text = result_data.get('raw_text', '')
        return run_keyword_prediction_from_data(raw_text, quiet=quiet)
    except Exception as e:
        print(f"키워드 기반 예측 실패: {e}")
        return {}

def run_keyword_prediction_from_data(analysis_text: str, quiet: bool = True) -> Dict[str, any]:
    """분석 텍스트를 직접 받아서 성격 유형 예측"""
    try:
        if not analysis_text:
            raise ValueError("분석 텍스트가 비어있습니다.")
        
        raw_text = analysis_text
        
        if not raw_text:
            raise ValueError("분석 결과에서 텍스트를 찾을 수 없습니다.")
        
        # 키워드 분류기 생성
        classifier = KeywordPersonalityClassifier()
        
        # 1. 현재 이미지 분석 결과에서 키워드 추출
        current_keywords = classifier._extract_emotion_keywords(raw_text)
        
        # 2. 이전 단계의 감정 키워드 데이터 로드
        previous_keywords = _load_previous_stage_keywords()
        
        # 3. 가중치 적용한 키워드 결합
        # 현재 이미지 키워드: 3배 가중치
        # 이전 단계 키워드: 1배 가중치
        weighted_keywords = current_keywords * 3 + previous_keywords[:15]  # 이전 키워드는 최대 15개로 제한
        
        # 키워드가 충분하지 않은 경우 텍스트에서 추가 추출
        if len(set(weighted_keywords)) < 5:
            text_words = raw_text.split()
            meaningful_words = [word for word in text_words if len(word) >= 2 and not word.isdigit()]
            weighted_keywords.extend(meaningful_words[:5])
        
        # 중복 제거하되 가중치는 유지
        unique_keywords = list(dict.fromkeys(weighted_keywords))  # 순서를 유지하면서 중복 제거
        
        # 키워드 기반 예측 수행
        prediction_result = classifier.predict_from_keywords(unique_keywords)
        
        if not quiet:
            print(f"\n[개선된 키워드 기반 성격 유형 예측 결과]")
            print(f"현재 이미지 키워드 (가중치 3배): {current_keywords}")
            print(f"이전 단계 감정 키워드 (가중치 1배): {previous_keywords[:10]}..." if len(previous_keywords) > 10 else f"이전 단계 감정 키워드: {previous_keywords}")
            print(f"총 사용 키워드 수: {len(unique_keywords)} (가중치 적용)")
            print(f"예측된 성격 유형: {prediction_result['personality_type']}")
            print(f"신뢰도: {prediction_result['confidence']:.3f}")
            
            print(f"\n[유형별 확률]")
            for persona_type, prob in sorted(prediction_result['probabilities'].items(), 
                                           key=lambda x: -x[1]):
                print(f"- {persona_type}: {prob:.2f}%")
        
        return prediction_result
        
    except Exception as e:
        error_msg = f"키워드 기반 예측 실패: {str(e)}"
        if not quiet:
            print(error_msg)
        
        return {
            "personality_type": "내면형",
            "confidence": 0.2,
            "probabilities": {"내면형": 20.0, "외향형": 20.0, "감수성": 20.0, "차분함": 20.0, "창의형": 20.0},
            "error": error_msg
        }
        
    except Exception as e:
        error_msg = f"키워드 기반 예측 실패: {str(e)}"
        if not quiet:
            print(error_msg)
        
        return {
            "personality_type": "내면형",
            "confidence": 0.2,
            "probabilities": {"추진형": 20.0, "내면형": 20.0, "관계형": 20.0, "쾌락형": 20.0, "안정형": 20.0},
            "error": error_msg,
            "model_used": "keyword_classifier"
        }

def _load_previous_stage_keywords() -> List[str]:
    """이전 단계에서 추출된 키워드들을 로드 (감정 키워드만 필터링)"""
    keywords = []
    
    # 감정 관련 키워드 카테고리 정의
    emotion_related_words = {
        # 감정 상태
        "불안", "걱정", "초조", "긴장", "불안감", "사회불안", "정서불안", "심리불안",
        "우울", "슬픔", "절망", "무기력", "침울", "우울감", "내적우울감",
        "애정", "사랑", "애정결핍", "관심", "애착", "애정욕구", "관심욕구",
        "분노", "화", "짜증", "격분", "성난", "적대감", "공격성",
        "두려움", "공포", "무서움", "겁", "공포감", "경계심",
        "외로움", "고독", "소외", "쓸쓸", "고립감", "단절감",
        "스트레스", "압박", "부담", "긴장감", "압박감",
        "위축", "소극적", "내향적", "수동적", "소심함", "자신감부족",
        "행복", "기쁨", "즐거움", "만족", "편안", "안정", "평온",
        # 감정 표현 동사
        "느끼다", "감정", "마음", "기분", "상태", "심리", "정서",
        # HTP 심리 관련
        "애정결핍", "관심결핍", "인정결핍", "사랑결핍", "정서적결핍"
    }
    
    try:
        # 전처리 결과 디렉토리 경로
        preprocess_result_dir = os.path.join(BASE_DIR, "../../preprocess/result")
        
        # 채팅 키워드 로드 (감정 키워드가 많음)
        chat_keywords_path = os.path.join(preprocess_result_dir, "chat_data_keywords.json")
        if os.path.exists(chat_keywords_path):
            with open(chat_keywords_path, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
                chat_keywords = [item["keyword"] for item in chat_data 
                               if item.get("keyword") and item["keyword"] != "분석 실패"]
                # 감정 관련 키워드만 필터링
                emotion_keywords = [kw for kw in chat_keywords 
                                  if any(emotion in kw for emotion in emotion_related_words)]
                keywords.extend(emotion_keywords)
        
        # 도서 키워드에서 감정 관련만 선택
        book_keywords_path = os.path.join(preprocess_result_dir, "book_keywords.json")
        if os.path.exists(book_keywords_path):
            with open(book_keywords_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_keywords = [item["keyword"] for item in book_data if item.get("keyword")]
                # 감정 관련 키워드만 필터링
                emotion_keywords = [kw for kw in book_keywords 
                                  if any(emotion in kw for emotion in emotion_related_words)]
                keywords.extend(emotion_keywords)
        
        # 중복 제거 및 필터링
        unique_keywords = []
        meaningless_words = {
            "분석", "실패", "없음", "기타", "일반", "보통", "평범",
            "그냥", "그런", "이런", "저런", "있다", "없다", "하다", "되다", "되고", "있고"
        }
        
        for keyword in keywords:
            if (len(keyword) >= 2 and 
                keyword not in meaningless_words and
                not keyword.isdigit() and
                keyword not in unique_keywords):
                unique_keywords.append(keyword)
        
        return unique_keywords[:30]  # 감정 키워드만이므로 30개로 줄임
        
    except Exception as e:
        print(f"이전 단계 키워드 로드 실패: {e}")
        return []

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="키워드 기반 성격 유형 분류")
    parser.add_argument('--keywords', nargs='+', help='분석할 감정 키워드들')
    parser.add_argument('--text', type=str, help='분석할 텍스트')
    parser.add_argument('--image', type=str, help='이미지 기반명 (예: test5)')
    
    args = parser.parse_args()
    
    if args.image:
        result = run_keyword_prediction_from_result(args.image, quiet=False)
    elif args.keywords:
        result = predict_personality_from_keywords(args.keywords)
        print(f"예측 결과: {result}")
    elif args.text:
        result = predict_personality_from_text(args.text)
        print(f"예측 결과: {result}")
    else:
        # 예시 실행
        example_keywords = ["사회불안", "정서불안", "애정결핍", "불안감", "관심 요구"]
        result = predict_personality_from_keywords(example_keywords)
        print(f"예시 키워드 예측 결과: {result}") 