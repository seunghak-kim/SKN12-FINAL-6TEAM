-- DB friends 테이블에서 4번과 5번 데이터 교체
-- 4번: 쾌락형, 5번: 안정형으로 수정 (friends_name은 ~형으로 유지)

BEGIN;

-- 임시로 6번 ID 사용해서 충돌 방지
UPDATE friends SET friends_id = 6 WHERE friends_id = 4;

-- 5번을 4번으로 이동 (안정형 -> 임시)
UPDATE friends SET friends_id = 4 WHERE friends_id = 5;

-- 6번(원래 4번)을 5번으로 이동 (쾌락형 -> 5번)
UPDATE friends SET friends_id = 5 WHERE friends_id = 6;

-- 5개 유형 전부 md 파일 기반으로 정확히 설정
UPDATE friends SET 
  friends_name = '추진형',
  friends_description = '목표 설정과 달성을 강력히 압박하는 전략가이자 감독관. 모호함을 제거하고 즉각적인 실행과 성과를 이끌어내며, 절대적 기준으로 최고 수준을 추구합니다.'
WHERE friends_id = 1;

UPDATE friends SET 
  friends_name = '내면형',
  friends_description = '감정과 사고의 깊은 바다를 탐험하며 복잡한 내면을 이해하도록 돕는 차분하고 통찰력 있는 조력자. 자아정체성과 감정의 깊이를 탐구하여 내적 성장을 이끕니다.'
WHERE friends_id = 2;

UPDATE friends SET 
  friends_name = '관계형',
  friends_description = '지친 마음에 쉼터가 되어주며 스스로를 사랑으로 채울 수 있도록 돕는 다정한 친구. 타인을 위해 애쓰는 마음을 인정하고 건강한 자기 돌봄을 안내합니다.'
WHERE friends_id = 3;

UPDATE friends SET 
  friends_name = '쾌락형',
  friends_description = '끊임없이 새로운 자극을 추구하는 이들이 내면의 공허함과 마주할 수 있도록 유도하는 현실적인 조언자. 도피성 쾌락이 아닌 진정한 만족을 찾도록 안내합니다.'
WHERE friends_id = 4;

UPDATE friends SET 
  friends_name = '안정형',
  friends_description = '언제나 중립과 조화를 지향하며 여러 가능성을 제시하는 안전한 대화 파트너. 불안과 갈등을 회피하려는 마음을 이해하고 현실적인 균형을 찾도록 돕습니다.'
WHERE friends_id = 5;

-- 확인용 SELECT
SELECT friends_id, friends_name, friends_description FROM friends ORDER BY friends_id;

COMMIT;