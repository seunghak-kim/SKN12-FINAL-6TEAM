"""
사용자 데이터 정리 서비스
- 1년 지난 INACTIVE 사용자 물리적 삭제
- CASCADE로 모든 관련 데이터 자동 삭제
"""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.user import UserInformation, SocialUser, User
from ..database import get_db

logger = logging.getLogger(__name__)

class CleanupService:
    """사용자 데이터 정리 서비스"""
    
    def __init__(self):
        pass
    
    def cleanup_expired_users(self, db: Session) -> dict:
        """1년 지난 INACTIVE 사용자들을 물리적으로 삭제"""
        try:
            # 1년 전 날짜 계산
            one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
            
            # 1년 지난 INACTIVE 사용자 조회
            expired_users = db.query(UserInformation).filter(
                UserInformation.status == "INACTIVE",
                UserInformation.deleted_at.isnot(None),
                UserInformation.deleted_at <= one_year_ago
            ).all()
            
            if not expired_users:
                logger.info("삭제할 만료된 사용자가 없습니다.")
                return {
                    "success": True,
                    "deleted_count": 0,
                    "message": "삭제할 만료된 사용자가 없습니다."
                }
            
            deleted_users = []
            
            for user_info in expired_users:
                try:
                    user_id = user_info.user_id
                    nickname = user_info.nickname
                    deleted_at = user_info.deleted_at
                    
                    # 소셜 사용자인지 일반 사용자인지 확인 후 삭제
                    if user_info.social_user_id:
                        # 소셜 사용자 삭제 (CASCADE로 user_informations도 삭제됨)
                        social_user = db.query(SocialUser).filter(
                            SocialUser.social_user_id == user_info.social_user_id
                        ).first()
                        if social_user:
                            db.delete(social_user)
                            logger.info(f"소셜 사용자 삭제: user_id={user_id}, social_user_id={social_user.social_user_id}")
                    
                    elif user_info.regular_user_id:
                        # 일반 사용자 삭제 (CASCADE로 user_informations도 삭제됨)
                        regular_user = db.query(User).filter(
                            User.user_id == user_info.regular_user_id
                        ).first()
                        if regular_user:
                            db.delete(regular_user)
                            logger.info(f"일반 사용자 삭제: user_id={user_id}, regular_user_id={regular_user.user_id}")
                    
                    else:
                        # 외래키가 없는 경우 직접 삭제
                        db.delete(user_info)
                        logger.info(f"사용자 정보 직접 삭제: user_id={user_id}")
                    
                    deleted_users.append({
                        "user_id": user_id,
                        "nickname": nickname,
                        "deleted_at": deleted_at.isoformat()
                    })
                    
                except Exception as e:
                    logger.error(f"사용자 삭제 실패 user_id={user_id}: {e}")
                    continue
            
            # 모든 변경사항 커밋
            db.commit()
            
            logger.info(f"만료된 사용자 {len(deleted_users)}명 삭제 완료")
            
            return {
                "success": True,
                "deleted_count": len(deleted_users),
                "deleted_users": deleted_users,
                "message": f"만료된 사용자 {len(deleted_users)}명이 삭제되었습니다."
            }
            
        except Exception as e:
            logger.error(f"사용자 정리 작업 실패: {e}")
            db.rollback()
            return {
                "success": False,
                "deleted_count": 0,
                "error": str(e),
                "message": "사용자 정리 작업이 실패했습니다."
            }
    
    def get_cleanup_stats(self, db: Session) -> dict:
        """정리 대상 사용자 통계 조회"""
        try:
            # 현재 INACTIVE 사용자 수
            inactive_count = db.query(UserInformation).filter(
                UserInformation.status == "INACTIVE"
            ).count()
            
            # 1년 지난 만료 대상 사용자 수
            one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
            expired_count = db.query(UserInformation).filter(
                UserInformation.status == "INACTIVE",
                UserInformation.deleted_at.isnot(None),
                UserInformation.deleted_at <= one_year_ago
            ).count()
            
            # 1년 이내 복구 가능 사용자 수
            recoverable_count = db.query(UserInformation).filter(
                UserInformation.status == "INACTIVE",
                UserInformation.deleted_at.isnot(None),
                UserInformation.deleted_at > one_year_ago
            ).count()
            
            return {
                "inactive_total": inactive_count,
                "expired_deletable": expired_count,
                "recoverable": recoverable_count,
                "cutoff_date": one_year_ago.isoformat()
            }
            
        except Exception as e:
            logger.error(f"통계 조회 실패: {e}")
            return {
                "error": str(e)
            }

# 싱글톤 인스턴스
cleanup_service = CleanupService()