# 거북이상담소 - HTP 심리검사 프론트엔드

> 그림을 통한 심리 분석과 AI 캐릭터 상담 서비스를 제공하는 프론트엔드 애플리케이션입니다.

## ✨ 주요 기능

- **HTP 심리검사**: 집-나무-사람 그림을 그려 성격 유형을 분석
- **AI 캐릭터 상담**: 5가지 성격 유형별 전용 AI 캐릭터와 채팅 상담
- **성격 유형 분석**: 추진형, 내면형, 관계형, 쾌락형, 안정형 5가지 유형 분류
- **검사 결과 관리**: 과거 검사 기록 조회 및 상세 분석 결과 확인
- **실시간 분석 진행률**: 객체 탐지 → 심리 분석 → 성격 분류 단계별 진행 상황 표시
- **Google OAuth 로그인**: 간편한 소셜 로그인 지원

## 🛠️ 기술 스택

- **Framework**: Next.js 15.2.4
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI
- **State Management**: React Hooks (useAppState, useChatSession)
- **HTTP Client**: Fetch API
- **Charts**: Recharts
- **Form Handling**: React Hook Form + Zod

## 🚀 시작하기

### 1. 의존성 설치

프로젝트 디렉토리에서 다음 명령어를 실행하여 필요한 패키지를 설치합니다.

```bash
npm install
```

### 2. 개발 서버 실행

다음 명령어를 실행하여 개발 서버를 시작합니다.

```bash
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 주소로 접속하여 애플리케이션을 확인할 수 있습니다.

### 3. 사용 가능한 스크립트

*   **테스트 실행:**
    ```bash
    npm test
    ```
*   **프로덕션 빌드:**
    ```bash
    npm run build
    ```

## 📂 프로젝트 구조

```
frontend/
├── public/              # 정적 파일
│   ├── assets/         # 이미지 리소스
│   └── favicon.ico     # 파비콘
├── src/
│   ├── components/     # React 컴포넌트
│   │   ├── common/     # 공통 컴포넌트
│   │   │   ├── AnalysisModal.tsx       # 분석 결과 모달
│   │   │   ├── AnalysisProgress.tsx    # 분석 진행률 표시
│   │   │   ├── CharacterCard.tsx       # 캐릭터 카드
│   │   │   ├── ConsentModal.tsx        # 동의서 모달
│   │   │   ├── FloatingChatBot.tsx     # 플로팅 챗봇
│   │   │   ├── ProbabilityChart.tsx    # 성격 유형 확률 차트
│   │   │   └── StarRating.tsx          # 별점 평가
│   │   └── pages/      # 페이지 컴포넌트
│   │       ├── AuthCallbackPage.tsx    # OAuth 콜백 페이지
│   │       ├── CharactersPage.tsx      # 캐릭터 선택 페이지
│   │       ├── ChatPage.tsx            # 채팅 페이지
│   │       ├── LandingPage.tsx         # 랜딩 페이지
│   │       ├── MyPage.tsx              # 마이페이지
│   │       ├── ResultDetailPage.tsx    # 결과 상세 페이지
│   │       ├── ResultsPage.tsx         # 결과 목록 페이지
│   │       ├── TestInstructionPage.tsx # 검사 설명 페이지
│   │       └── TestPage.tsx            # 그림 그리기 페이지
│   ├── data/           # 정적 데이터
│   │   ├── characters.ts               # 캐릭터 정보
│   │   └── mockData.ts                 # 목 데이터
│   ├── hooks/          # 커스텀 훅
│   │   ├── useAppState.ts              # 앱 상태 관리
│   │   └── useChatSession.ts           # 채팅 세션 관리
│   ├── services/       # API 서비스
│   │   ├── apiClient.ts                # API 클라이언트
│   │   ├── authService.ts              # 인증 서비스
│   │   ├── chatService.ts              # 채팅 서비스
│   │   ├── testService.ts              # 검사 서비스
│   │   └── userService.ts              # 사용자 서비스
│   ├── types/          # TypeScript 타입 정의
│   │   └── index.ts    # 공통 타입 정의
│   ├── App.tsx         # 메인 애플리케이션 컴포넌트
│   └── index.tsx       # 애플리케이션 진입점
├── next.config.mjs     # Next.js 설정
├── tailwind.config.js  # Tailwind CSS 설정
├── tsconfig.json       # TypeScript 설정
└── package.json        # 프로젝트 의존성
```

## 🔧 주요 컴포넌트

### Pages
- **LandingPage**: 서비스 소개 및 로그인
- **TestInstructionPage**: HTP 검사 안내
- **TestPage**: 그림 그리기 및 업로드
- **ResultsPage**: 검사 결과 목록
- **CharactersPage**: AI 캐릭터 선택
- **ChatPage**: AI 캐릭터와 상담 채팅

### Common Components
- **AnalysisProgress**: 3단계 분석 진행률 (객체 탐지 → 심리 분석 → 성격 분류)
- **ProbabilityChart**: 성격 유형별 확률 시각화
- **CharacterCard**: 5가지 성격 유형 캐릭터 카드

### Hooks
- **useAppState**: 전역 앱 상태 관리 (로그인, 검사 결과 등)
- **useChatSession**: 채팅 세션 상태 관리

### Services
- **testService**: HTP 검사 관련 API 호출
- **chatService**: AI 캐릭터 채팅 API 호출
- **authService**: Google OAuth 인증 처리

## 🎨 성격 유형 캐릭터

1. **추진형 (추진이)**: 목표 지향적이고 리더십이 강한 유형
2. **내면형 (내면이)**: 내성적이고 깊이 있는 사고를 하는 유형
3. **관계형 (관계이)**: 사람과의 관계를 중시하는 사교적 유형
4. **쾌락형 (쾌락이)**: 즐거움을 추구하고 자유로운 유형
5. **안정형 (안정이)**: 안정감과 보안을 중시하는 신중한 유형

## 🔗 백엔드 연동

프론트엔드는 FastAPI 기반 백엔드와 연동되어 동작합니다:

- **API 베이스 URL**: `http://localhost:8000`
- **주요 API 엔드포인트**:
  - `POST /api/pipeline/analyze-image`: 그림 분석 요청
  - `GET /api/pipeline/analysis-status/{test_id}`: 분석 진행 상황 조회
  - `POST /api/chat/`: AI 캐릭터와 채팅
  - `GET /auth/google/login`: Google OAuth 로그인