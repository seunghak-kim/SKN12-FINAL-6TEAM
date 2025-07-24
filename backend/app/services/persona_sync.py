"""
프롬프트 파일과 DB friends 테이블 동기화 서비스
"""
import os
import re
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from ..models.friend import Friend
import logging

logger = logging.getLogger(__name__)

class PersonaSyncService:
    """프롬프트 파일과 DB 동기화 서비스"""
    
    def __init__(self):
        # 프롬프트 파일 경로 설정
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.prompts_dir = os.path.join(current_dir, "prompts")
        
        # 프롬프트 파일과 페르소나 매핑
        self.prompt_files = {
            "추진형": "chujin.md",
            "내면형": "nemyeon.md", 
            "관계형": "gwangye.md",
            "안정형": "anjeong.md",
            "쾌락형": "querock.md"
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
            
            # 각 파일별 특화된 정보 추출
            if filename == "chujin.md":
                # 추진형 정보 추출
                persona_match = re.search(r'페르소나 정의: (.+)', content)
                identity_match = re.search(r'너의 정체성은 (.+?)\. 너는', content, re.DOTALL)
                
                if persona_match:
                    persona_name = persona_match.group(1).strip()
                else:
                    persona_name = "추진가 (The Driver)"
                
                if identity_match:
                    identity = identity_match.group(1).strip()
                    # 긴 설명을 간략하게 요약
                    description = f"{persona_name}. {identity[:200]}..."
                else:
                    description = "강력한 압박과 명령조로 즉각적인 실행을 요구하는 전략가. 목표 달성과 성과 창출을 통해 사용자의 잠재력을 최대한 끌어내는 도전적인 심리 상담 챗봇"
                    
            elif filename == "nemyeon.md":
                # 내면형 정보 추출
                name_match = re.search(r'- 너의 이름: (.+)', content)
                identity_match = re.search(r'- 너의 정체성: (.+)', content)
                expertise_match = re.search(r'- 전문 분야: (.+)', content)
                
                persona_name = name_match.group(1).strip() if name_match else "내면이"
                identity = identity_match.group(1).strip() if identity_match else ""
                expertise = expertise_match.group(1).strip() if expertise_match else ""
                
                description_parts = []
                if identity:
                    description_parts.append(identity)
                if expertise:
                    description_parts.append(f"전문분야: {expertise}")
                
                description = ". ".join(description_parts) if description_parts else "감정과 사고의 깊은 바다를 탐험하며 내적 성장과 자기이해를 돕는 섬세하고 통찰력 있는 심리 상담 챗봇"
                
            else:
                # 다른 파일들은 기본 패턴으로 처리
                name_patterns = [
                    r'- 너의 이름: (.+?)(?:\n|$)',
                    r'너는 지금부터 "(.+?)"',
                    r'페르소나 정의: (.+?)(?:\n|$)',
                ]
                
                identity_patterns = [
                    r'- 너의 정체성: (.+?)(?:\n|$)',
                    r'너의 정체성은 (.+?)(?:\n|\.)',
                    r'너의 역할은 (.+?)(?:\n|\.)',
                ]
                
                expertise_patterns = [
                    r'- 전문 분야: (.+?)(?:\n|$)',
                    r'전문 분야: (.+?)(?:\n|\.)',
                ]
                
                persona_name = None
                for pattern in name_patterns:
                    match = re.search(pattern, content)
                    if match:
                        persona_name = match.group(1).strip()
                        break
                
                identity = None
                for pattern in identity_patterns:
                    match = re.search(pattern, content)
                    if match:
                        identity = match.group(1).strip()
                        break
                        
                expertise = None
                for pattern in expertise_patterns:
                    match = re.search(pattern, content)
                    if match:
                        expertise = match.group(1).strip()
                        break
                
                # 설명 조합
                description_parts = []
                if identity:
                    description_parts.append(identity)
                if expertise:
                    description_parts.append(f"전문분야: {expertise}")
                
                description = ". ".join(description_parts) if description_parts else f"{persona_type} 성향의 전문 심리 상담 챗봇"
            
            # 설명 길이 제한
            if len(description) > 500:
                description = description[:497] + "..."
            
            return {
                "name": persona_name or persona_type or "알 수 없음",
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
                    "friends_name": persona_type,
                    "friends_description": info["description"],
                    "is_active": True
                })
                logger.info(f"페르소나 정보 추출 성공: {persona_type}")
            else:
                # 파일이 없으면 특화된 기본값 사용
                default_descriptions = {
                    "추진형": "강력한 압박과 명령조로 즉각적인 실행을 요구하는 전략가. 목표 달성과 성과 창출을 통해 사용자의 잠재력을 최대한 끌어내는 도전적인 심리 상담 챗봇",
                    "내면형": "감정과 사고의 깊은 바다를 탐험하며 내적 성장과 자기이해를 돕는 섬세하고 통찰력 있는 심리 상담 챗봇",
                    "관계형": "사람들과의 관계를 중시하고 소통을 즐기며 공감 능력이 뛰어난 따뜻하고 친화적인 심리 상담 챗봇",
                    "쾌락형": "즐거움과 재미를 추구하며 활기차고 유쾌한 에너지로 긍정적인 변화를 이끄는 활발한 심리 상담 챗봇",
                    "안정형": "안정감과 평온함을 중시하며 차분하고 신중한 조언으로 꾸준한 성장을 돕는 안정적인 심리 상담 챗봇"
                }
                
                persona_data.append({
                    "friends_name": persona_type,
                    "friends_description": default_descriptions.get(persona_type, f"{persona_type} 성향의 전문 심리 상담 챗봇"),
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
                # 기존 friends 레코드 확인
                existing_friend = db.query(Friend).filter(
                    Friend.friends_name == data["friends_name"]
                ).first()
                
                if existing_friend:
                    # 기존 레코드 업데이트
                    existing_friend.friends_description = data["friends_description"]
                    existing_friend.is_active = data["is_active"]
                    logger.info(f"페르소나 업데이트: {data['friends_name']}")
                else:
                    # 새 레코드 생성
                    new_friend = Friend(
                        friends_name=data["friends_name"],
                        friends_description=data["friends_description"],
                        is_active=data["is_active"]
                    )
                    db.add(new_friend)
                    logger.info(f"페르소나 생성: {data['friends_name']}")
            
            db.commit()
            logger.info("페르소나 동기화 완료")
            return True
            
        except Exception as e:
            logger.error(f"페르소나 동기화 실패: {e}")
            db.rollback()
            return False

# 싱글톤 인스턴스
persona_sync_service = PersonaSyncService()