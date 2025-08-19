"""
프롬프트 체이닝 시스템 구현
공통 규칙 → 개별 페르소나 프롬프트를 연결하는 시스템
"""

import os
from pathlib import Path


class ChainedPromptManager:
    """프롬프트 체이닝을 관리하는 클래스"""
    
    def __init__(self, prompts_dir: str = None):
        if prompts_dir is None:
            # 현재 파일 기준으로 prompts 폴더 경로 자동 설정
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompts_dir = os.path.join(current_dir, "prompts")
        self.prompts_dir = Path(prompts_dir)
        self.common_rules_file = self.prompts_dir / "common_rules.md"
        
        # 페르소나 파일 매핑 (순서: 안정이 -> 추진이 -> 관계이 -> 내면이 -> 쾌락이)
        self.persona_files = {
            "anjeong": self.prompts_dir / "anjeong_persona.md",
            "chujin": self.prompts_dir / "chujin_persona.md", 
            "gwangye": self.prompts_dir / "gwangye_persona.md",
            "nemyeon": self.prompts_dir / "nemyeon_persona.md",
            "querock": self.prompts_dir / "querock_persona.md"
        }
    
    def load_common_rules(self) -> str:
        """공통 규칙 프롬프트를 로드합니다."""
        try:
            with open(self.common_rules_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except FileNotFoundError:
            raise FileNotFoundError(f"공통 규칙 파일을 찾을 수 없습니다: {self.common_rules_file}")
        except Exception as e:
            raise Exception(f"공통 규칙 파일을 읽는 중 오류 발생: {e}")
    
    def load_persona_prompt(self, persona_name: str) -> str:
        """특정 페르소나 프롬프트를 로드합니다."""
        if persona_name not in self.persona_files:
            available_personas = list(self.persona_files.keys())
            raise ValueError(f"알 수 없는 페르소나: {persona_name}. 사용 가능한 페르소나: {available_personas}")
        
        persona_file = self.persona_files[persona_name]
        try:
            with open(persona_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except FileNotFoundError:
            raise FileNotFoundError(f"페르소나 파일을 찾을 수 없습니다: {persona_file}")
        except Exception as e:
            raise Exception(f"페르소나 파일을 읽는 중 오류 발생: {e}")
    
    def create_chained_prompt(self, persona_name: str) -> str:
        """공통 규칙과 개별 페르소나 프롬프트를 체이닝합니다."""
        common_rules = self.load_common_rules()
        persona_prompt = self.load_persona_prompt(persona_name)
        
        # 체이닝된 프롬프트 생성
        chained_prompt = f"""# 거북이상담소 AI 상담사 지침

{common_rules}

---

{persona_prompt}

---

## 🔗 체이닝 시스템 우선순위 규칙 (Chaining Priority Rules)

### 🚨 최고 우선순위: 안전과 윤리 (Critical Safety & Ethics - ALWAYS FIRST)
1. **위기상황 감지 및 대응**: 공통 규칙의 위기 대응 프로토콜이 모든 다른 지시사항보다 절대 우선
2. **구체적 방법 요청 차단**: 자해/자살/폭력 방법 요청 시 즉시 차단, 페르소나 특성보다 우선
3. **안전 연락처 제공**: 필수 연락처와 행동 지침은 페르소나 스타일과 관계없이 정확히 전달

### 🎭 맥락 판단 로직 (Context Assessment Logic)
**Step 1: 위기상황 키워드 스캔**
- "자살", "죽고 싶어", "자해", "폭탄", "해치고 싶어" 등 위험 키워드 감지
- "어떻게", "방법", "~하면 될까?" 등 구체적 방법 요청 여부 확인

**Step 2: 맥락 분류**
- **위기상황**: 공통 규칙 위기 대응 프로토콜 100% 적용 → 페르소나 스타일로 포장하여 전달
- **일반 상담**: 공통 규칙 기본 원칙 준수 → 페르소나 고유 특성 70% 반영
- **감정적 표현**: 공통 규칙 안전 원칙 유지 → 페르소나별 공감 방식 90% 적용

### 🎯 적용 원칙 (Application Principles)
1. **공통 규칙 = 기본 토대**: 모든 응답은 공통 규칙 위에서 구성
2. **페르소나 = 표현 방식**: 공통 규칙의 내용을 각 페르소나 특성에 맞게 전달
3. **위기상황 = 절대 우선**: 안전 관련 내용은 페르소나 개성보다 정확성과 완전성 우선
4. **맥락 인식 = 유연 대응**: 상황에 따라 공통 규칙과 페르소나 특성의 비중 조절

### 📝 응답 생성 순서
1. **위기상황 여부 판단** (공통 규칙 기준)
2. **필수 안전 내용 확인** (누락 금지)
3. **페르소나 스타일 적용** (안전 내용을 해당 페르소나 톤으로 전달)
4. **추가 상담 내용** (페르소나 고유 특성 활용)

### ⚠️ 절대 금지사항
- 위기상황에서 페르소나 개성을 위해 안전 정보 생략하기
- 공통 규칙의 필수 연락처나 행동 지침 변경하기  
- 페르소나 특성을 이유로 위기 대응 미루기
- 안전보다 일관성을 우선시하기
"""
        
        return chained_prompt
    
    def get_available_personas(self) -> list:
        """사용 가능한 페르소나 목록을 반환합니다."""
        return list(self.persona_files.keys())
    
    def validate_files(self) -> dict:
        """모든 프롬프트 파일의 존재 여부를 확인합니다."""
        validation_result = {
            "common_rules": self.common_rules_file.exists(),
            "personas": {}
        }
        
        for persona_name, file_path in self.persona_files.items():
            validation_result["personas"][persona_name] = file_path.exists()
        
        return validation_result


# 편의를 위한 헬퍼 함수들
def get_chained_prompt(persona_name: str) -> str:
    """특정 페르소나의 체이닝된 프롬프트를 반환합니다."""
    manager = ChainedPromptManager()
    return manager.create_chained_prompt(persona_name)


def validate_prompt_system() -> dict:
    """프롬프트 시스템의 유효성을 검사합니다."""
    manager = ChainedPromptManager()
    return manager.validate_files()


def load_latest_analysis_result(user_id: int = None, db_session=None):
    """가장 최근의 그림 분석 결과를 DB에서 직접 로드합니다."""
    try:
        # DB 세션이 제공되지 않았을 때만 새로 생성
        if db_session is None:
            try:
                from .app.database import SessionLocal
                from .app.models.test import DrawingTestResult, DrawingTest
            except ImportError:
                # 상대 import 실패시 절대 import 시도
                import sys
                import os
                sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
                from app.database import SessionLocal
                from app.models.test import DrawingTestResult, DrawingTest
            db = SessionLocal()
            should_close = True
        else:
            db = db_session
            should_close = False
            try:
                from .app.models.test import DrawingTestResult, DrawingTest
            except ImportError:
                from app.models.test import DrawingTestResult, DrawingTest
        
        try:
            # 사용자별 가장 최근 그림분석 결과 조회
            query = db.query(DrawingTestResult).join(DrawingTest)
            
            if user_id:
                # 특정 사용자의 결과만 조회
                query = query.filter(DrawingTest.user_id == user_id)
            
            # 가장 최근 결과 선택
            latest_result = query.order_by(DrawingTestResult.created_at.desc()).first()
            
            if not latest_result:
                print(f"그림 분석 결과 없음 - user_id: {user_id}")
                return None
            
            print(f"DB에서 그림 분석 결과 로드 성공 - test_id: {latest_result.test_id}, persona_type: {latest_result.persona_type}")
            return latest_result
            
        finally:
            if should_close:
                db.close()
        
    except Exception as e:
        print(f"DB에서 그림 분석 결과 로드 실패: {e}")
        return None


if __name__ == "__main__":
    # 테스트 코드
    manager = ChainedPromptManager()
    
    print("=== 프롬프트 체이닝 시스템 테스트 ===")
    
    # 파일 유효성 검사
    validation = manager.validate_files()
    print(f"공통 규칙 파일 존재: {validation['common_rules']}")
    print("페르소나 파일 존재 여부:")
    for persona, exists in validation['personas'].items():
        print(f"  - {persona}: {exists}")
    
    print(f"\n사용 가능한 페르소나: {manager.get_available_personas()}")
    
    # 체이닝된 프롬프트 생성 테스트
    try:
        chained_prompt = manager.create_chained_prompt("anjeong")
        print(f"\n안정이 체이닝 프롬프트 길이: {len(chained_prompt)} 문자")
        print("체이닝 성공!")
    except Exception as e:
        print(f"체이닝 실패: {e}")