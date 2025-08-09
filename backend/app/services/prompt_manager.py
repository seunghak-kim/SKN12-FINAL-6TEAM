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
        
        # 페르소나 타입과 파일명 매핑 (체이닝 시스템용 _persona.md 파일 사용)
        self.persona_files = {
            "내면형": "nemyeon_persona.md",
            "추진형": "chujin_persona.md", 
            "관계형": "gwangye_persona.md",
            "안정형": "anjeong_persona.md",
            "쾌락형": "querock_persona.md"
        }
        
        # 캐릭터 이름 매핑
        self.persona_names = {
            "내면형": "내면이",
            "추진형": "추진이", 
            "관계형": "관계이",
            "안정형": "안정이",
            "쾌락형": "쾌락이"
        }
        
        # 프롬프트 템플릿 캐시
        self._template_cache: Dict[str, PromptTemplate] = {}
        
        # 캐릭터 지식 베이스 캐시
        self._character_knowledge: Optional[str] = None
        
        # 초기화 시 모든 템플릿 로드
        self._load_all_templates()
        self._load_character_knowledge()
    
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
        """페르소나별 체이닝된 프롬프트 생성 (공통규칙 + 개별페르소나)"""
        # 페르소나 타입을 체이닝 시스템의 키로 변환
        persona_mapping = {
            "내면형": "nemyeon",
            "추진형": "chujin", 
            "관계형": "gwangye",
            "안정형": "anjeong",
            "쾌락형": "querock"
        }
        
        if persona_type not in persona_mapping:
            logger.error(f"지원하지 않는 페르소나 타입: {persona_type}")
            raise ValueError(f"지원하지 않는 페르소나 타입: {persona_type}")
        
        persona_key = persona_mapping[persona_type]
        
        try:
            # 체이닝 시스템을 사용하여 공통규칙 + 개별페르소나 프롬프트 생성
            from prompt_chaining import get_chained_prompt
            chained_prompt = get_chained_prompt(persona_key)
            
            logger.info(f"체이닝된 프롬프트 생성 성공: {persona_type}")
            return chained_prompt
            
        except Exception as e:
            logger.error(f"체이닝된 프롬프트 생성 실패: {persona_type}, 오류: {e}")
            # 실패 시 기존 캐시된 템플릿 사용 (fallback)
            if persona_type in self._template_cache:
                template = self._template_cache[persona_type]
                try:
                    return template.format(**kwargs)
                except KeyError as e:
                    logger.warning(f"프롬프트 템플릿 변수 누락: {e}, 원본 템플릿 사용")
                    return template.template
            else:
                # 최후의 수단으로 기본 템플릿 생성
                default_template = self._create_default_template(persona_type)
                return default_template.template
    
    def _load_character_knowledge(self):
        """캐릭터 지식 베이스 로드"""
        try:
            knowledge_file = os.path.join(self.prompts_dir, "character_knowledge.md")
            with open(knowledge_file, "r", encoding="utf-8") as f:
                self._character_knowledge = f.read()
            logger.info("캐릭터 지식 베이스 로드 성공")
        except Exception as e:
            logger.warning(f"캐릭터 지식 베이스 로드 실패: {e}")
            self._character_knowledge = ""
    
    def get_character_info(self, current_persona: str, target_character: str) -> str:
        """특정 캐릭터에 대한 정보를 현재 페르소나 관점에서 반환"""
        if not self._character_knowledge:
            return ""
        
        # 캐릭터 이름을 페르소나 타입으로 변환
        target_persona_type = None
        for persona_type, name in self.persona_names.items():
            if name == target_character:
                target_persona_type = persona_type
                break
        
        if not target_persona_type:
            return ""
        
        # 현재 페르소나가 해당 캐릭터를 어떻게 보는지 정보 추출
        current_name = self.persona_names.get(current_persona, "")
        if not current_name:
            return ""
        
        try:
            # 캐릭터 기본 정보 추출
            target_info_section = f"## 🌟 {target_character}" if target_character == "쾌락이" else f"## 🌊 {target_character}" if target_character == "내면이" else f"## 🤝 {target_character}" if target_character == "관계이" else f"## 🏔️ {target_character}" if target_character == "안정이" else f"## 🚀 {target_character}"
            
            lines = self._character_knowledge.split('\n')
            target_info = ""
            current_section = ""
            
            for line in lines:
                if line.startswith("## ") and target_character in line:
                    current_section = "target_info"
                    target_info += line + "\n"
                elif line.startswith("## ") and current_section == "target_info":
                    break
                elif current_section == "target_info":
                    target_info += line + "\n"
            
            # 현재 캐릭터가 타겟 캐릭터를 보는 관점 추출
            perspective_section = f"### {current_name} 👀 다른 캐릭터들"
            perspective_info = ""
            current_section = ""
            
            for line in lines:
                if perspective_section in line:
                    current_section = "perspective"
                elif line.startswith("### ") and current_section == "perspective":
                    break
                elif current_section == "perspective" and f"**{target_character}**" in line:
                    perspective_info = line + "\n"
                    break
            
            return f"{target_info.strip()}\n\n### {current_name}의 관점에서:\n{perspective_info.strip()}"
            
        except Exception as e:
            logger.error(f"캐릭터 정보 추출 실패: {e}")
            return ""
    
    def get_all_character_names(self) -> list:
        """모든 캐릭터 이름 목록 반환"""
        return list(self.persona_names.values())
    
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