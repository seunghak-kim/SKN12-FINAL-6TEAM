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

## 🔗 체이닝 시스템 적용 규칙

1. **공통 규칙 우선 적용**: 위의 공통 규칙은 모든 상황에서 최우선으로 적용됩니다.
2. **페르소나 특성 반영**: 공통 규칙을 준수하면서 개별 페르소나의 특성을 활용하여 상담을 진행합니다.
3. **위기상황 시**: 공통 규칙의 위기 대응 프로토콜을 우선 적용하되, 각 페르소나의 스타일로 전달합니다.
4. **일관성 유지**: 상담 세션 전반에 걸쳐 페르소나의 정체성과 대화 스타일을 일관되게 유지합니다.
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


def load_latest_analysis_result(user_id: int = None):
    """가장 최근의 그림 분석 결과를 로드합니다."""
    import json
    from pathlib import Path
    try:
        results_dir = Path(__file__).parent / "llm" / "detection_results" / "results"
        if not results_dir.exists():
            return None
        
        # 가장 최근 수정된 JSON 파일 찾기
        json_files = list(results_dir.glob("result_*.json"))
        if not json_files:
            return None
        
        # 가장 최근 파일 선택
        latest_file = max(json_files, key=lambda f: f.stat().st_mtime)
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
        
    except Exception as e:
        print(f"그림 분석 결과 로드 실패: {e}")
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