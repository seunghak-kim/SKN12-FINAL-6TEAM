import os
import torch
import torch.nn as nn
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import logging

# 기본 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_keyword_classifier.pth")

class KeywordClassifier(nn.Module):
    """키워드 기반 성격 유형 분류 모델"""
    
    def __init__(self, vocab_size: int = 1000, embedding_dim: int = 128, hidden_dim: int = 64, num_classes: int = 5):
        super(KeywordClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(hidden_dim * 2, num_classes)  # bidirectional이므로 *2
        
    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, (hidden, _) = self.lstm(embedded)
        # 마지막 타임스텝의 hidden state 사용
        output = torch.cat((hidden[-2,:,:], hidden[-1,:,:]), dim=1)
        output = self.dropout(output)
        output = self.classifier(output)
        return output

class KeywordPersonalityClassifier:
    """감정 키워드 기반 성격 유형 분류기"""
    
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
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
        """사전 학습된 모델 로드"""
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {self.model_path}")
            
            checkpoint = torch.load(self.model_path, map_location='cpu')
            
            # 체크포인트 구조에 따라 모델 로드 방식 조정
            if isinstance(checkpoint, dict):
                # 일반적인 체크포인트 구조
                if 'model_state_dict' in checkpoint:
                    model_state = checkpoint['model_state_dict']
                    vocab = checkpoint.get('vocab', None)
                elif 'state_dict' in checkpoint:
                    model_state = checkpoint['state_dict']
                    vocab = checkpoint.get('vocab', None)
                else:
                    model_state = checkpoint
                    vocab = None
            else:
                # 모델 자체가 저장된 경우
                self.model = checkpoint
                self.logger.info("모델 직접 로드 완료")
                return
            
            # 모델 구조 추정 및 생성
            vocab_size = vocab.get('vocab_size', 1000) if vocab else 1000
            self.model = KeywordClassifier(vocab_size=vocab_size)
            self.model.load_state_dict(model_state)
            self.vocab = vocab
            
            self.model.eval()
            self.logger.info(f"키워드 분류 모델 로드 완료: {self.model_path}")
            
        except Exception as e:
            self.logger.error(f"모델 로드 실패: {str(e)}")
            # 기본 모델 생성
            self.model = KeywordClassifier()
            self.logger.warning("기본 모델로 초기화됨")
    
    def _preprocess_keywords(self, keywords: List[str]) -> torch.Tensor:
        """키워드 전처리 및 텐서 변환"""
        if not keywords:
            # 빈 키워드의 경우 기본값 반환
            return torch.zeros(1, 10, dtype=torch.long)
        
        # 단어를 인덱스로 변환 (간단한 해시 기반)
        indices = []
        for keyword in keywords[:10]:  # 최대 10개 키워드만 사용
            # 간단한 해시 기반 인덱스 생성 (실제로는 vocab 사용해야 함)
            idx = hash(keyword.lower()) % 1000
            indices.append(abs(idx))
        
        # 패딩
        while len(indices) < 10:
            indices.append(0)
        
        return torch.tensor([indices], dtype=torch.long)
    
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
        """키워드 리스트로부터 성격 유형 예측"""
        try:
            if not self.model:
                raise ValueError("모델이 로드되지 않았습니다.")
            
            # 키워드 전처리
            input_tensor = self._preprocess_keywords(keywords)
            
            # 예측 수행
            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = torch.softmax(outputs, dim=1)
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
                "model_used": "keyword_classifier"
            }
            
        except Exception as e:
            self.logger.error(f"키워드 예측 실패: {str(e)}")
            return {
                "personality_type": "내면형",  # 기본값
                "confidence": 0.2,
                "probabilities": {label: 20.0 for label in self.label_map.values()},
                "input_keywords": keywords,
                "error": str(e),
                "model_used": "keyword_classifier"
            }
    
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
    """이미지 분석 결과와 이전 단계 키워드를 결합하여 성격 유형 예측"""
    try:
        # 결과 파일 경로
        result_json_path = os.path.join(BASE_DIR, f"../detection_results/results/result_{image_base}.json")
        
        if not os.path.exists(result_json_path):
            raise FileNotFoundError(f"결과 파일을 찾을 수 없습니다: {result_json_path}")
        
        # 결과 파일 로드
        with open(result_json_path, 'r', encoding='utf-8') as f:
            result_data = json.load(f)
        
        # 텍스트 추출
        raw_text = result_data.get('raw_text', '')
        
        if not raw_text:
            raise ValueError("분석 결과에서 텍스트를 찾을 수 없습니다.")
        
        # 키워드 분류기 생성
        classifier = KeywordPersonalityClassifier()
        
        # 1. 현재 이미지 분석 결과에서 키워드 추출
        current_keywords = classifier._extract_emotion_keywords(raw_text)
        
        # 2. 이전 단계의 키워드 데이터 로드
        previous_keywords = _load_previous_stage_keywords()
        
        # 3. 모든 키워드 결합 (현재 + 이전 단계)
        all_keywords = list(set(current_keywords + previous_keywords))
        
        # 키워드가 충분하지 않은 경우 텍스트에서 추가 추출
        if len(all_keywords) < 5:
            text_words = raw_text.split()
            meaningful_words = [word for word in text_words if len(word) >= 2 and not word.isdigit()]
            all_keywords.extend(meaningful_words[:10])
            all_keywords = list(set(all_keywords))
        
        # 키워드 기반 예측 수행
        prediction_result = classifier.predict_from_keywords(all_keywords)
        
        if not quiet:
            print(f"\n[키워드 기반 성격 유형 예측 결과]")
            print(f"현재 이미지 키워드: {current_keywords}")
            print(f"이전 단계 키워드: {previous_keywords[:10]}..." if len(previous_keywords) > 10 else f"이전 단계 키워드: {previous_keywords}")
            print(f"총 사용 키워드 수: {len(all_keywords)}")
            print(f"예측된 성격 유형: {prediction_result['personality_type']}")
            print(f"신뢰도: {prediction_result['confidence']:.3f}")
            
            print(f"\n[유형별 확률]")
            for persona_type, prob in sorted(prediction_result['probabilities'].items(), 
                                           key=lambda x: -x[1]):
                print(f"- {persona_type}: {prob:.2f}%")
        
        # 기존 결과 파일에 키워드 분석 결과 추가
        result_data['keyword_personality_analysis'] = {
            "predicted_personality": prediction_result['personality_type'],
            "confidence": prediction_result['confidence'],
            "probabilities": prediction_result['probabilities'],
            "current_image_keywords": current_keywords,
            "previous_stage_keywords": previous_keywords[:20],  # 상위 20개만 저장
            "total_keywords_used": len(all_keywords),
            "analysis_timestamp": datetime.now().isoformat(),
            "model_used": "keyword_classifier_enhanced"
        }
        
        # 업데이트된 내용을 다시 저장
        with open(result_json_path, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        
        if not quiet:
            print(f"키워드 분석 결과가 저장되었습니다: {result_json_path}")
        
        return prediction_result
        
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
    """이전 단계에서 추출된 키워드들을 로드"""
    keywords = []
    
    try:
        # 전처리 결과 디렉토리 경로
        preprocess_result_dir = os.path.join(BASE_DIR, "../../preprocess/result")
        
        # 도서 키워드 로드
        book_keywords_path = os.path.join(preprocess_result_dir, "book_keywords.json")
        if os.path.exists(book_keywords_path):
            with open(book_keywords_path, 'r', encoding='utf-8') as f:
                book_data = json.load(f)
                book_keywords = [item["keyword"] for item in book_data if item.get("keyword")]
                keywords.extend(book_keywords)
        
        # 채팅 키워드 로드
        chat_keywords_path = os.path.join(preprocess_result_dir, "chat_data_keywords.json")
        if os.path.exists(chat_keywords_path):
            with open(chat_keywords_path, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
                chat_keywords = [item["keyword"] for item in chat_data 
                               if item.get("keyword") and item["keyword"] != "분석 실패"]
                keywords.extend(chat_keywords)
        
        # 기타 키워드 텍스트 파일 로드
        book_keywords_text_path = os.path.join(preprocess_result_dir, "book_keywords_text.json")
        if os.path.exists(book_keywords_text_path):
            with open(book_keywords_text_path, 'r', encoding='utf-8') as f:
                book_text_data = json.load(f)
                if isinstance(book_text_data, list):
                    for item in book_text_data:
                        if isinstance(item, dict) and "text" in item:
                            # 텍스트를 단어로 분할하여 키워드로 활용
                            words = item["text"].split()
                            keywords.extend(words[:3])  # 처음 3개 단어만
        
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
        
        return unique_keywords[:50]  # 최대 50개까지만 반환
        
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