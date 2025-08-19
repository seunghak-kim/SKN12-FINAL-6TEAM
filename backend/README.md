# 거북이상담소 Backend API

심리 상담 챗봇 서비스의 백엔드 API 서버입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [API 엔드포인트](#api-엔드포인트)
- [데이터베이스](#데이터베이스)
- [데이터베이스 쿼리](#데이터베이스-쿼리)
- [AI 서비스](#ai-서비스)
- [보안](#보안)

## 🎯 프로젝트 개요

거북이상담소는 AI 기반 심리 상담 챗봇 서비스로, 사용자가 5가지 성격 유형별 AI 상담사와 대화할 수 있는 플랫폼을 제공합니다.

### 주요 기능

- **🤖 AI 상담 챗봇**: OpenAI GPT-4o를 활용한 개성 있는 AI 상담사들
- **🎨 그림 심리 검사**: 사용자가 그린 그림을 분석하여 성격 유형 진단
- **👥 소셜 로그인**: Google OAuth2를 통한 간편 로그인
- **💬 채팅 세션 관리**: 대화 내용 저장 및 히스토리 관리
- **⭐ 평가 시스템**: 상담 세션에 대한 사용자 피드백
- **📊 관리자 대시보드**: 데이터베이스 상태 모니터링

## 🛠 기술 스택

### 백엔드 프레임워크

- **FastAPI**: 고성능 Python 웹 프레임워크
- **Python 3.8+**: 주 개발 언어
- **Uvicorn**: ASGI 서버

### 데이터베이스

- **PostgreSQL**: 메인 데이터베이스
- **SQLAlchemy**: ORM (Object-Relational Mapping)
- **Psycopg2**: PostgreSQL 드라이버

### AI & 머신러닝

- **OpenAI GPT-4o**: 대화형 AI 모델
- **LangChain**: AI 모델 통합 프레임워크
- **YOLO**: 이미지 객체 검출 (그림 분석용)

### 인증 & 보안

- **Google OAuth2**: 소셜 로그인
- **JWT**: 토큰 기반 인증
- **Pydantic**: 데이터 검증

### 기타

- **Python-dotenv**: 환경 변수 관리
- **Pandas**: 데이터 처리
- **Python-multipart**: 파일 업로드

## 📁 프로젝트 구조

```
backend/
├── app/                          # 메인 애플리케이션
│   ├── api/                      # API 엔드포인트
│   │   ├── admin.py             # 관리자 API
│   │   ├── agreement.py         # 약관 동의 API
│   │   ├── auth.py              # 인증 API
│   │   ├── chat.py              # 채팅 API
│   │   ├── friend.py            # 친구(AI 상담사) API
│   │   ├── rating.py            # 평가 API
│   │   ├── test.py              # 그림 검사 API
│   │   └── user.py              # 사용자 API
│   ├── models/                   # 데이터베이스 모델
│   │   ├── agreement.py         # 약관 동의 모델
│   │   ├── chat.py              # 채팅 모델
│   │   ├── friend.py            # 친구 모델
│   │   ├── rating.py            # 평가 모델
│   │   ├── test.py              # 검사 모델
│   │   └── user.py              # 사용자 모델
│   ├── schemas/                  # Pydantic 스키마
│   │   ├── agreement.py         # 약관 동의 스키마
│   │   ├── chat.py              # 채팅 스키마
│   │   ├── friend.py            # 친구 스키마
│   │   ├── rating.py            # 평가 스키마
│   │   ├── test.py              # 검사 스키마
│   │   └── user.py              # 사용자 스키마
│   ├── services/                 # 비즈니스 로직
│   │   ├── ai_service.py        # AI 서비스
│   │   ├── auth_service.py      # 인증 서비스
│   │   └── chat_service.py      # 채팅 서비스
│   ├── config.py                # 설정 파일
│   ├── database.py              # 데이터베이스 연결
│   └── main.py                  # FastAPI 애플리케이션
├── llm/                         # AI 모델 관련
│   ├── model/                   # 머신러닝 모델
│   ├── rag/                     # RAG 문서
│   └── test_chat/               # 챗봇 테스트
├── preprocess/                  # 데이터 전처리
├── prompts/                     # AI 프롬프트
├── create_db.sql               # 데이터베이스 생성 스크립트
└── requirements.txt            # Python 의존성
```

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 데이터베이스 설정
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key

# HuggingFace 설정 (HTP 성격 분류 모델용)
HF_TOKEN=your_huggingface_token_here
HF_MODEL_NAME=Bokji/HTP-personality-classifier

# 앱 보안 설정
SECRET_KEY=your_secret_key

# 개발 모드
DEBUG=True
```


### 3. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 `create_db.sql` 스크립트를 실행하세요:

```bash
psql -U username -d database_name -f create_db.sql
```

### 4. 서버 실행

```bash
# 개발 서버
python -m app.main

# 또는 uvicorn 직접 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

서버가 실행되면 다음 URL에서 접근할 수 있습니다:

- API 서버: http://localhost:8000
- API 문서: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📡 API 엔드포인트

### 🔐 인증 API (`/auth`)

| Method | Endpoint                | 설명                           |
| ------ | ----------------------- | ------------------------------ |
| POST   | `/auth/google`          | Google ID 토큰 로그인/회원가입 |
| POST   | `/auth/test-login`      | 테스트 로그인                  |
| GET    | `/auth/google/callback` | Google OAuth 콜백              |
| POST   | `/auth/verify-token`    | JWT 토큰 검증                  |
| GET    | `/auth/me`              | 현재 사용자 정보 조회          |
| POST   | `/auth/check-nickname`  | 닉네임 중복 확인               |
| GET    | `/auth/get-token`       | 쿠키에서 토큰 조회             |
| POST   | `/auth/complete-signup` | 닉네임으로 회원가입 완료       |

### 👤 사용자 API (`/users`)

| Method | Endpoint                           | 설명                            |
| ------ | ---------------------------------- | ------------------------------- |
| POST   | `/users/register`                  | 일반 사용자 회원가입            |
| POST   | `/users/social-login`              | 소셜 로그인                     |
| GET    | `/users`                           | 사용자 목록 조회 (페이지네이션) |
| GET    | `/users/{user_id}`                 | 특정 사용자 조회                |
| PUT    | `/users/{user_id}`                 | 사용자 정보 수정                |
| POST   | `/users/{user_id}/change-password` | 비밀번호 변경                   |
| DELETE | `/users/{user_id}`                 | 사용자 삭제 (소프트 삭제)       |
| GET    | `/users/{user_id}/profile`         | 사용자 프로필 및 통계           |
| GET    | `/users/{user_id}/chat-history`    | 사용자 채팅 기록                |
| GET    | `/users/{user_id}/test-results`    | 사용자 검사 결과                |

### 💬 채팅 API (`/chat`)

| Method | Endpoint                               | 설명                     |
| ------ | -------------------------------------- | ------------------------ |
| POST   | `/chat/sessions`                       | 새 채팅 세션 생성        |
| GET    | `/chat/sessions`                       | 사용자의 채팅 세션 목록  |
| GET    | `/chat/sessions/{session_id}`          | 세션 상세 정보 및 메시지 |
| POST   | `/chat/sessions/{session_id}/messages` | 메시지 전송 및 AI 응답   |
| DELETE | `/chat/sessions/{session_id}`          | 세션 삭제 (소프트 삭제)  |
| GET    | `/chat/sessions/{session_id}/messages` | 세션의 모든 메시지       |

### 🤖 친구(AI 상담사) API (`/friends`)

| Method | Endpoint               | 설명                    |
| ------ | ---------------------- | ----------------------- |
| POST   | `/friends/`            | 새 친구 생성            |
| GET    | `/friends/`            | 활성 친구 목록          |
| GET    | `/friends/{friend_id}` | 특정 친구 정보          |
| PUT    | `/friends/{friend_id}` | 친구 정보 수정          |
| DELETE | `/friends/{friend_id}` | 친구 삭제 (소프트 삭제) |

### 🎨 그림 검사 API (`/api/v1/test`)

| Method | Endpoint                                        | 설명                     |
| ------ | ----------------------------------------------- | ------------------------ |
| POST   | `/api/v1/test/drawing-tests/upload`             | 그림 업로드 및 검사 생성 |
| GET    | `/api/v1/test/drawing-tests`                    | 그림 검사 목록           |
| GET    | `/api/v1/test/drawing-tests/{test_id}`          | 특정 그림 검사           |
| PUT    | `/api/v1/test/drawing-tests/{test_id}`          | 그림 검사 수정           |
| POST   | `/api/v1/test/drawing-test-results`             | 검사 결과 생성/수정      |
| GET    | `/api/v1/test/drawing-test-results/my-results`  | 내 검사 결과             |
| GET    | `/api/v1/test/drawing-test-results/{result_id}` | 특정 검사 결과           |

### ⭐ 평가 API (`/ratings`)

| Method | Endpoint                                 | 설명                               |
| ------ | ---------------------------------------- | ---------------------------------- |
| POST   | `/ratings/`                              | 세션 평가 생성 (중복 평가 허용)    |
| GET    | `/ratings/`                              | 평가 목록 (필터링 가능)            |
| GET    | `/ratings/{rating_id}`                   | 특정 평가                          |
| PUT    | `/ratings/{rating_id}`                   | 평가 수정                          |
| DELETE | `/ratings/{rating_id}`                   | 평가 삭제                          |
| GET    | `/ratings/sessions/{session_id}/average` | 세션 평균 평점 (모든 평가 기반)    |
| GET    | `/ratings/users/{user_id}/average`       | 사용자 평균 평점                   |

### 📋 약관 동의 API (`/agreements`)

| Method | Endpoint                             | 설명                  |
| ------ | ------------------------------------ | --------------------- |
| POST   | `/agreements/`                       | 약관 동의 생성        |
| GET    | `/agreements/`                       | 약관 동의 목록        |
| GET    | `/agreements/{agreement_id}`         | 특정 약관 동의        |
| PUT    | `/agreements/{agreement_id}`         | 약관 동의 수정        |
| DELETE | `/agreements/{agreement_id}`         | 약관 동의 삭제        |
| GET    | `/agreements/users/{user_id}/status` | 사용자 약관 동의 상태 |
| POST   | `/agreements/users/{user_id}/bulk`   | 약관 일괄 동의        |

### 🛠 관리자 API (`/api/v1/admin`)

| Method | Endpoint                        | 설명                               |
| ------ | ------------------------------- | ---------------------------------- |
| POST   | `/api/v1/admin/reset-database`  | 데이터베이스 초기화 (개발용)       |
| GET    | `/api/v1/admin/database-status` | 데이터베이스 상태 및 테이블 카운트 |

## 🗄 데이터베이스

### ERD (Entity Relationship Diagram)

데이터베이스는 다음과 같은 주요 테이블들로 구성됩니다:

```
사용자 시스템:
users (일반 사용자) ──┐
                    ├─── user_informations (통합 사용자 정보)
social_users (소셜) ──┘

친구(AI 상담사) 시스템:
friends (AI 상담사 정보)

채팅 시스템:
chat_sessions (채팅 세션) ───── chat_messages (채팅 메시지)

검사 시스템:
drawing_tests (그림 검사) ───── drawing_test_results (검사 결과)

피드백 시스템:
ratings (평가)
agreements (약관 동의)
```

### 주요 테이블 설명

#### 1. 사용자 관리 테이블

- **users**: 일반 사용자의 인증 정보
- **social_users**: 소셜 로그인 사용자 정보
- **user_informations**: 통합된 사용자 프로필 정보

#### 2. AI 상담사 테이블

- **friends**: AI 상담사 캐릭터 정보 (추진형, 내면형, 관계형, 쾌락형, 안정형)

#### 3. 채팅 시스템 테이블

- **chat_sessions**: 사용자와 AI 상담사 간의 대화 세션
- **chat_messages**: 개별 채팅 메시지

#### 4. 심리 검사 테이블

- **drawing_tests**: 사용자가 업로드한 그림 검사
- **drawing_test_results**: AI 분석을 통한 성격 유형 진단 결과

#### 5. 피드백 테이블

- **ratings**: 상담 세션에 대한 사용자 평가 (중복 평가 허용, friends_id 포함)
- **agreements**: 서비스 이용약관 동의 기록

## 🗂 데이터베이스 쿼리

### 테이블 생성 쿼리

```sql
-- 친구(AI 상담사) 테이블
CREATE TABLE public.friends (
    friends_id serial4 NOT NULL,
    friends_name varchar(10) NOT NULL,
    friends_description text NOT NULL,
    tts_audio_url varchar(2048) NULL,
    tts_voice_type int4 NULL,
    is_active bool NULL,
    created_at timestamp NULL,
    CONSTRAINT friends_pkey PRIMARY KEY (friends_id)
);

-- 소셜 사용자 테이블
CREATE TABLE public.social_users (
    social_user_id serial4 NOT NULL,
    social_id varchar(255) NOT NULL,
    CONSTRAINT social_users_pkey PRIMARY KEY (social_user_id),
    CONSTRAINT social_users_social_id_key UNIQUE (social_id)
);

-- 일반 사용자 테이블
CREATE TABLE public.users (
    user_id serial4 NOT NULL,
    user_password varchar(255) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

-- 사용자 정보 테이블
CREATE TABLE public.user_informations (
    user_id serial4 NOT NULL,
    nickname varchar(20) NOT NULL,
    status varchar(10) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    deleted_at timestamp NULL,
    social_user_id int4 NULL,
    regular_user_id int4 NULL,
    CONSTRAINT user_informations_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_informations_regular_user_id_fkey FOREIGN KEY (regular_user_id) REFERENCES public.users(user_id),
    CONSTRAINT user_informations_social_user_id_fkey FOREIGN KEY (social_user_id) REFERENCES public.social_users(social_user_id)
);

-- 약관 동의 테이블
CREATE TABLE public.agreements (
    agreement_id serial4 NOT NULL,
    user_id int4 NOT NULL,
    is_agree bool NULL,
    agreed_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT agreements_pkey PRIMARY KEY (agreement_id),
    CONSTRAINT agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id)
);

-- 채팅 세션 테이블
CREATE TABLE public.chat_sessions (
    chat_sessions_id uuid NOT NULL,
    user_id int4 NULL,
    friends_id int4 NULL,
    session_name varchar(255) NULL,
    is_active bool NULL,
    created_at timestamp NULL,
    updated_at timestamp NULL,
    CONSTRAINT chat_sessions_pkey PRIMARY KEY (chat_sessions_id),
    CONSTRAINT chat_sessions_friends_id_fkey FOREIGN KEY (friends_id) REFERENCES public.friends(friends_id),
    CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id) ON DELETE CASCADE
);

-- 그림 검사 테이블
CREATE TABLE public.drawing_tests (
    test_id serial4 NOT NULL,
    user_id int4 NOT NULL,
    image_url varchar(2048) NULL,
    submitted_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT drawing_tests_pkey PRIMARY KEY (test_id),
    CONSTRAINT drawing_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id)
);

-- 평가 테이블
CREATE TABLE public.ratings (
    ratings_id serial4 NOT NULL,
    session_id uuid NOT NULL,
    user_id int4 NOT NULL,
    friends_id int4 NOT NULL,
    rating int4 NOT NULL,
    comment text NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT ratings_pkey PRIMARY KEY (ratings_id),
    CONSTRAINT ratings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(chat_sessions_id) ON DELETE CASCADE,
    CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_informations(user_id) ON DELETE CASCADE,
    CONSTRAINT ratings_friends_id_fkey FOREIGN KEY (friends_id) REFERENCES public.friends(friends_id)
);

-- 채팅 메시지 테이블
CREATE TABLE public.chat_messages (
    chat_messages_id uuid NOT NULL,
    session_id uuid NULL,
    sender_type varchar(20) NOT NULL,
    content text NOT NULL,
    created_at timestamp NULL,
    CONSTRAINT chat_messages_pkey PRIMARY KEY (chat_messages_id),
    CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(chat_sessions_id) ON DELETE CASCADE
);

-- 그림 검사 결과 테이블
CREATE TABLE public.drawing_test_results (
    result_id serial4 NOT NULL,
    test_id int4 NOT NULL,
    friends_type int4 NULL,
    summary_text text NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT drawing_test_results_pkey PRIMARY KEY (result_id),
    CONSTRAINT drawing_test_results_test_id_key UNIQUE (test_id),
    CONSTRAINT drawing_test_results_friends_type_fkey FOREIGN KEY (friends_type) REFERENCES public.friends(friends_id),
    CONSTRAINT drawing_test_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.drawing_tests(test_id)
);
```

### 초기 데이터 삽입

```sql
-- 기본 AI 상담사 캐릭터 데이터
INSERT INTO friends (friends_name, friends_description, tts_audio_url, tts_voice_type, is_active, created_at) VALUES
    ('추진형', '목표 지향적이고 도전적인 성격의 친구입니다. 항상 앞으로 나아가려 하고, 문제 해결을 위해 적극적으로 행동합니다.', NULL, NULL, true, '2025-07-17 17:23:42.919576'),
    ('내면형', '깊이 있는 사고와 성찰을 좋아하는 친구입니다. 조용하고 차분하며, 내적 성장과 자기 이해를 중요시합니다.', NULL, NULL, true, '2025-07-17 17:24:29.849924'),
    ('관계형', '사람들과의 관계를 중시하고 소통을 즐기는 친구입니다. 공감 능력이 뛰어나고 다른 사람들과 함께 시간을 보내는 것을 좋아합니다.', NULL, NULL, true, '2025-07-17 17:24:38.821091'),
    ('쾌락형', '즐거움과 재미를 추구하는 친구입니다. 활기차고 유쾌하며, 새로운 경험과 모험을 즐기고 긍정적인 에너지를 전파합니다.', NULL, NULL, true, '2025-07-17 17:24:47.037083'),
    ('안정형', '안정감과 평온함을 중시하는 친구입니다. 차분하고 신중하며, 예측 가능한 환경에서 꾸준히 성장하는 것을 선호합니다.', NULL, NULL, true, '2025-07-17 17:24:54.018487');
```

### 주요 쿼리 패턴

#### 사용자 관련 쿼리

```sql
-- 사용자 정보 조회 (JOIN 사용)
SELECT ui.*, su.social_id, u.user_id as regular_user_id
FROM user_informations ui
LEFT JOIN social_users su ON ui.social_user_id = su.social_user_id
LEFT JOIN users u ON ui.regular_user_id = u.user_id
WHERE ui.user_id = :user_id AND ui.status = 'ACTIVE';

-- 닉네임 중복 확인
SELECT COUNT(*) FROM user_informations
WHERE nickname = :nickname AND status = 'ACTIVE';

-- 사용자 통계 정보
SELECT
    ui.*,
    COUNT(DISTINCT cs.chat_sessions_id) as chat_count,
    COUNT(DISTINCT dt.test_id) as test_count
FROM user_informations ui
LEFT JOIN chat_sessions cs ON ui.user_id = cs.user_id AND cs.is_active = true
LEFT JOIN drawing_tests dt ON ui.user_id = dt.user_id
WHERE ui.user_id = :user_id
GROUP BY ui.user_id;
```

#### 채팅 관련 쿼리

```sql
-- 사용자의 활성 채팅 세션 목록 (메시지가 있는 것만)
SELECT DISTINCT cs.*
FROM chat_sessions cs
JOIN chat_messages cm ON cs.chat_sessions_id = cm.session_id
WHERE cs.user_id = :user_id AND cs.is_active = true
ORDER BY cs.created_at DESC;

-- 세션의 메시지 목록
SELECT * FROM chat_messages
WHERE session_id = :session_id
ORDER BY created_at ASC;

-- 최근 메시지 조회 (AI 응답 생성용)
SELECT * FROM chat_messages
WHERE session_id = :session_id
ORDER BY created_at DESC
LIMIT 10;
```

#### 검사 관련 쿼리

```sql
-- 사용자의 그림 검사 목록
SELECT dt.*, dtr.friends_type, dtr.summary_text, f.friends_name
FROM drawing_tests dt
LEFT JOIN drawing_test_results dtr ON dt.test_id = dtr.test_id
LEFT JOIN friends f ON dtr.friends_type = f.friends_id
WHERE dt.user_id = :user_id
ORDER BY dt.submitted_at DESC;

-- 검사 결과 업서트 (있으면 업데이트, 없으면 삽입)
INSERT INTO drawing_test_results (test_id, friends_type, summary_text, created_at)
VALUES (:test_id, :friends_type, :summary_text, NOW())
ON CONFLICT (test_id)
DO UPDATE SET
    friends_type = :friends_type,
    summary_text = :summary_text,
    created_at = NOW();
```

#### 평가 관련 쿼리

```sql
-- 세션 평균 평점
SELECT
    AVG(rating) as average_rating,
    COUNT(*) as rating_count
FROM ratings
WHERE session_id = :session_id;

-- 사용자 평균 평점
SELECT
    AVG(rating) as average_rating,
    COUNT(*) as rating_count
FROM ratings
WHERE user_id = :user_id;

-- 사용자의 특정 세션 평가 조회 (중복 평가 허용)
SELECT * FROM ratings
WHERE user_id = :user_id AND session_id = :session_id
ORDER BY created_at DESC;
```

#### 관리자 쿼리

```sql
-- 테이블별 레코드 수 조회
SELECT COUNT(*) FROM friends;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM user_informations;
SELECT COUNT(*) FROM chat_sessions;
SELECT COUNT(*) FROM chat_messages;
SELECT COUNT(*) FROM drawing_tests;
SELECT COUNT(*) FROM drawing_test_results;
SELECT COUNT(*) FROM ratings;
SELECT COUNT(*) FROM agreements;

-- 데이터베이스 초기화 (개발용)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS drawing_test_results CASCADE;
DROP TABLE IF EXISTS drawing_tests CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS agreements CASCADE;
DROP TABLE IF EXISTS user_informations CASCADE;
DROP TABLE IF EXISTS social_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
```

### 트랜잭션 패턴

#### 표준 CRUD 트랜잭션

```python
# 생성
try:
    db.add(new_object)
    db.commit()
    db.refresh(new_object)
    return new_object
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail=str(e))

# 수정
try:
    # 수정 작업
    db.commit()
    db.refresh(object)
    return object
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail=str(e))

# 삭제 (소프트 삭제)
try:
    object.is_active = False  # 또는 status = "INACTIVE"
    db.commit()
    return {"message": "Successfully deleted"}
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail=str(e))
```

#### 복합 트랜잭션 (관련 테이블 동시 처리)

```python
# 사용자 생성 시 관련 테이블 동시 생성
try:
    # 1. 메인 사용자 정보 생성
    db.add(user_info)
    db.flush()  # ID 생성을 위해 flush

    # 2. 관련 데이터 생성
    db.add(related_data)

    # 3. 모든 변경사항 커밋
    db.commit()
    db.refresh(user_info)
    return user_info
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail=str(e))
```

## 🤖 AI 서비스

### OpenAI GPT-4o 통합

- **모델**: `gpt-4o`
- **Temperature**: 0.9 (창의적 응답)
- **Max Tokens**: 1000
- **Context Length**: 최근 10개 메시지 유지

### AI 상담사 캐릭터

1. **추진형** (추진이): 목표 지향적, 도전적 성격
2. **내면형** (내면이): 깊은 사고, 성찰 중심
3. **관계형** (관계이): 인간관계, 소통 전문
4. **쾌락형** (쾌락이): 즐거움, 새로운 경험 추구
5. **안정형** (안정이): 안정감, 평온함 중시

### 그림 분석 AI

- **YOLO 모델**: 그림 속 객체 검출
- **GPT-4o Vision**: 그림 심리 분석
- **성격 유형 매칭**: 그림 분석 결과를 바탕으로 적합한 AI 상담사 추천

## 🔒 보안

### 인증 & 권한

- **JWT 토큰**: 30일 만료
- **Google OAuth2**: 안전한 소셜 로그인
- **비밀번호 해싱**: 안전한 비밀번호 저장
- **CORS 설정**: 허용된 도메인만 접근 가능

### 데이터 보호

- **SQL Injection 방지**: SQLAlchemy ORM 사용
- **입력 데이터 검증**: Pydantic 스키마 검증
- **소프트 삭제**: 데이터 완전 삭제 대신 비활성화
- **환경 변수**: 민감한 정보 환경 변수로 관리

### API 보안

- **요청 속도 제한**: 과도한 요청 방지
- **HTTPS**: 암호화된 통신
- **에러 정보 최소화**: 내부 정보 노출 방지

## 📞 연락처

프로젝트 관련 문의사항이 있으시면 개발팀에 연락해주세요.

---

거북이상담소 팀 ✨
