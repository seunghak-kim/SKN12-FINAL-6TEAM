import os
from typing import Dict, Optional
from langchain_core.prompts import PromptTemplate
import logging

logger = logging.getLogger(__name__)

class PersonaPromptManager:
    """페르소나별 프롬프트 관리 클래스"""
    
    def __init__(self):
        # 현재 파일 기준으로 prompts 폴더 경로 설정 (상대 경로)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.prompts_dir = os.path.join(current_dir, "..", "..", "prompts")
        
        # 페르소나 타입과 파일명 매핑
        self.persona_files = {
            "내면형": "nemyeon.md",
            "추진형": "chujin.md", 
            "관계형": "gwangye.md",
            "안정형": "anjeong.md",
            "쾌락형": "querock.md"
        }
        
        # 프롬프트 템플릿 캐시
        self._template_cache: Dict[str, PromptTemplate] = {}
        
        # 초기화 시 모든 템플릿 로드
        self._load_all_templates()
    
    def _load_all_templates(self):
        """모든 페르소나 템플릿을 미리 로드하여 캐싱"""
        for persona_type, filename in self.persona_files.items():
            try:
                self._load_template(persona_type, filename)
                logger.info(f"프롬프트 템플릿 로드 성공: {persona_type}")
            except Exception as e:
                logger.warning(f"프롬프트 템플릿 로드 실패: {persona_type}, 오류: {e}")
                # 기본 템플릿으로 대체
                self._template_cache[persona_type] = self._create_default_template(persona_type)
    
    def _load_template(self, persona_type: str, filename: str):
        """개별 프롬프트 템플릿 로드"""
        file_path = os.path.join(self.prompts_dir, filename)
        
        with open(file_path, "r", encoding="utf-8") as f:
            template_content = f.read()
        
        # LangChain PromptTemplate으로 변환
        self._template_cache[persona_type] = PromptTemplate.from_template(template_content)
    
    def _create_default_template(self, persona_type: str) -> PromptTemplate:
        """기본 프롬프트 템플릿 생성"""
        persona_names = {
            "내면형": "내면이",
            "추진형": "추진이", 
            "관계형": "관계이",
            "안정형": "안정이",
            "쾌락형": "쾌락이"
        }
        
        persona_name = persona_names.get(persona_type, "상담사")
        
        default_content = f"""너는 지금부터 "{persona_name}"라는 이름의 전문 심리 상담 챗봇이야.

- 너의 이름: {persona_name}
- 사용자에게 존댓말을 하지마. 친근한 친구처럼 대해줘.
- 답변은 150자 이상으로 해줘.
- {persona_type} 성향에 맞는 상담을 제공해줘.

자, 이제 너는 "{persona_name}"야. 사용자와 따뜻하게 대화해줘."""

        return PromptTemplate.from_template(default_content)
    
    def get_persona_prompt(self, persona_type: str, **kwargs) -> str:
        """페르소나별 프롬프트 생성 (변수 주입 가능)"""
        if persona_type not in self._template_cache:
            logger.error(f"지원하지 않는 페르소나 타입: {persona_type}")
            raise ValueError(f"지원하지 않는 페르소나 타입: {persona_type}")
        
        template = self._template_cache[persona_type]
        
        # 템플릿에 변수가 있으면 주입, 없으면 원본 반환
        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.warning(f"프롬프트 템플릿 변수 누락: {e}, 원본 템플릿 사용")
            # 변수가 없는 템플릿이면 그냥 template 내용 반환
            return template.template
    
    def get_available_personas(self) -> list:
        """사용 가능한 페르소나 타입 목록 반환"""
        return list(self.persona_files.keys())
    
    def reload_template(self, persona_type: str):
        """특정 페르소나 템플릿 재로드 (개발/디버깅용)"""
        if persona_type in self.persona_files:
            filename = self.persona_files[persona_type]
            try:
                self._load_template(persona_type, filename)
                logger.info(f"프롬프트 템플릿 재로드 성공: {persona_type}")
            except Exception as e:
                logger.error(f"프롬프트 템플릿 재로드 실패: {persona_type}, 오류: {e}")
                raise
        else:
            raise ValueError(f"지원하지 않는 페르소나 타입: {persona_type}")