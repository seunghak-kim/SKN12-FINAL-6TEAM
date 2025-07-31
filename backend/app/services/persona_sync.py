"""
프롬프트 파일과 DB friends 테이블 동기화 서비스
"""
import os
import re
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from ..models.persona import Persona
import logging

logger = logging.getLogger(__name__)

class PersonaSyncService:
    """프롬프트 파일과 DB 동기화 서비스"""
    
    def __init__(self):
        # 프롬프트 파일 경로 설정
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.prompts_dir = os.path.join(current_dir, "prompts")
        
        # 체이닝 시스템용 페르소나 파일 매핑
        self.prompt_files = {
            "추진형": "chujin_persona.md",
            "내면형": "nemyeon_persona.md", 
            "관계형": "gwangye_persona.md",
            "쾌락형": "querock_persona.md",
            "안정형": "anjeong_persona.md"
        }
        
        # 체이닝 시스템용 페르소나 키 매핑
        self.persona_keys = {
            "추진형": "chujin",
            "내면형": "nemyeon", 
            "관계형": "gwangye",
            "쾌락형": "querock",
            "안정형": "anjeong"
        }
        
    def extract_persona_info(self, file_path: str) -> Dict[str, str]:
        """프롬프트 파일에서 페르소나 정보 추출"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 파일명으로 페르소나 유형 결정
            filename = os.path.basename(file_path)
            persona_type = None
            for ptype, fname in self.prompt_files.items():
                if fname == filename:
                    persona_type = ptype
                    break
            
            # 체이닝 시스템용 페르소나 파일별 정보 추출
            if filename == "chujin_persona.md":
                # 추진형: "목표 설정과 달성을 강력히 압박하는 전략가이자 감독관..."
                description = "목표 설정과 달성을 강력히 압박하는 전략가이자 감독관. 모호함을 제거하고 즉각적인 실행과 성과를 이끌어내며, 절대적 기준으로 최고 수준을 추구합니다. (체이닝 시스템 적용)"
                    
            elif filename == "nemyeon_persona.md":
                # 내면형: "감정과 사고의 깊은 바다를 탐험하며..."
                description = "감정과 사고의 깊은 바다를 탐험하며 복잡한 내면을 이해하도록 돕는 차분하고 통찰력 있는 조력자. 자아정체성과 감정의 깊이를 탐구하여 내적 성장을 이끕니다. (체이닝 시스템 적용)"
                
            elif filename == "gwangye_persona.md":
                # 관계형: "지친 마음에 쉼터가 되어주며..."
                description = "지친 마음에 쉼터가 되어주며 스스로를 사랑으로 채울 수 있도록 돕는 다정한 친구. 타인을 위해 애쓰는 마음을 인정하고 건강한 자기 돌봄을 안내합니다. (체이닝 시스템 적용)"
                
            elif filename == "querock_persona.md":
                # 쾌락형: "끊임없이 새로운 자극을 추구하는 이들이..."
                description = "끊임없이 새로운 자극을 추구하는 이들이 내면의 공허함과 마주할 수 있도록 유도하는 현실적인 조언자. 도피성 쾌락이 아닌 진정한 만족을 찾도록 안내합니다. (체이닝 시스템 적용)"
                
            elif filename == "anjeong_persona.md":
                # 안정형: "언제나 중립과 조화를 지향하며..."
                description = "언제나 중립과 조화를 지향하며 여러 가능성을 제시하는 안전한 대화 파트너. 불안과 갈등을 회피하려는 마음을 이해하고 현실적인 균형을 찾도록 돕습니다. (체이닝 시스템 적용)"
                
            else:
                # 체이닝 시스템 기본값
                description = f"{persona_type} 성향의 전문 심리 상담 챗봇 (체이닝 시스템 적용)"
            
            return {
                "name": persona_type or "알 수 없음",
                "description": description
            }
            
        except Exception as e:
            logger.error(f"프롬프트 파일 파싱 실패 {file_path}: {e}")
            return {"name": "알 수 없음", "description": "전문 심리 상담 챗봇"}
    
    def get_all_persona_data(self) -> List[Dict]:
        """모든 페르소나 데이터 추출"""
        persona_data = []
        
        for persona_type, filename in self.prompt_files.items():
            file_path = os.path.join(self.prompts_dir, filename)
            
            if os.path.exists(file_path):
                info = self.extract_persona_info(file_path)
                persona_data.append({
                    "name": persona_type,
                    "description": info["description"],
                    "is_active": True
                })
                logger.info(f"페르소나 정보 추출 성공: {persona_type}")
            else:
                # 파일이 없으면 특화된 기본값 사용
                # 체이닝 시스템용 기본 설명
                default_descriptions = {
                    "추진형": "강력한 압박과 명령조로 즉각적인 실행을 요구하는 전략가. 목표 달성과 성과 창출을 통해 사용자의 잠재력을 최대한 끌어내는 도전적인 심리 상담 챗봇 (체이닝 시스템 적용)",
                    "내면형": "감정과 사고의 깊은 바다를 탐험하며 내적 성장과 자기이해를 돕는 섬세하고 통찰력 있는 심리 상담 챗봇 (체이닝 시스템 적용)",
                    "관계형": "사람들과의 관계를 중시하고 소통을 즐기며 공감 능력이 뛰어난 따뜻하고 친화적인 심리 상담 챗봇 (체이닝 시스템 적용)",
                    "쾌락형": "즐거움과 재미를 추구하며 활기차고 유쾌한 에너지로 긍정적인 변화를 이끄는 활발한 심리 상담 챗봇 (체이닝 시스템 적용)",
                    "안정형": "안정감과 평온함을 중시하며 차분하고 신중한 조언으로 꾸준한 성장을 돕는 안정적인 심리 상담 챗봇 (체이닝 시스템 적용)"
                }
                
                persona_data.append({
                    "name": persona_type,
                    "description": default_descriptions.get(persona_type, f"{persona_type} 성향의 전문 심리 상담 챗봇 (체이닝 시스템 적용)"),
                    "is_active": True
                })
                logger.warning(f"프롬프트 파일 없음, 특화된 기본값 사용: {filename}")
        
        return persona_data
    
    def sync_friends_table(self, db: Session) -> bool:
        """DB friends 테이블과 프롬프트 파일 동기화"""
        try:
            # 모든 페르소나 데이터 가져오기
            persona_data = self.get_all_persona_data()
            
            for data in persona_data:
                # 기존 personas 레코드 확인
                existing_friend = db.query(Persona).filter(
                    Persona.name == data["name"]
                ).first()
                
                if existing_friend:
                    # 기존 레코드 업데이트
                    existing_friend.description = data["description"]
                    existing_friend.is_active = data["is_active"]
                    logger.info(f"페르소나 업데이트: {data['name']}")
                else:
                    # 새 레코드 생성
                    new_friend = Persona(
                        name=data["name"],
                        description=data["description"],
                        is_active=data["is_active"]
                    )
                    db.add(new_friend)
                    logger.info(f"페르소나 생성: {data['name']}")
            
            db.commit()
            logger.info("페르소나 동기화 완료")
            return True
            
        except Exception as e:
            logger.error(f"페르소나 동기화 실패: {e}")
            db.rollback()
            return False

# 싱글톤 인스턴스
persona_sync_service = PersonaSyncService()