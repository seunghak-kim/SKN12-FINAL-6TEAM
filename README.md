# MY MOODY: HTP 기반 그림 심리 분석 & GPT 페르소나 챗봇 플랫폼

## 👨‍👨‍👧‍👦 팀 소개
**팀명: 거북이상담소 🐢**

|                       **김승학**                        |                      **남의헌**                      |                       **이정민**                       |                     **이지복**                      |                      **조성지**                       |
| :-----------------------------------------------------: | :--------------------------------------------------: | :----------------------------------------------------: | :-------------------------------------------------: | :---------------------------------------------------: |
| <img src="./assets/img/team/seunghak.jpeg" width="100"> | <img src="./assets/img/team/uiheon.jpg" width="100"> | <img src="./assets/img/team/jeongmin.png" width="100"> | <img src="./assets/img/team/jibok.jpg" width="100"> | <img src="./assets/img/team/seongji.jpg" width="100"> |

---

## 📌 프로젝트 개요

**HTP(House-Tree-Person) 기반 심리 분석과 AI 챗봇을 결합한 비대면 정서 지원 서비스**

- 사용자가 직접 그린 집-나무-사람 그림을 분석하여 정서 상태 및 심리 유형을 추론
- 감정 키워드 기반으로 5가지 성격 유형 분류 (내면형 / 안정형 / 관계형 / 추진형 / 쾌락형)
- 유형별 맞춤형 페르소나 챗봇 연결 → 정서적 공감 및 셀프케어 전략 제공

> 📊 정량적 분석 + GPT 기반 해석 + ML 분류 + 유형별 프롬프트 → 개인 맞춤형 상담 경험 제공

---

## 🧠 핵심 기능

### 1. 이미지 업로드 → 심리 분석

- YOLOv11로 집/나무/사람 객체 탐지
- OpenCV로 시각적 요소 수치화 (크기, 위치, 비율 등)
- GPT-4o가 그림 의미 해석 문장 생성 (프롬프트 기반 엔지니어링)

### 2. 감정 키워드 추출 & 유형 분류

- 해석문에서 감정 키워드 파싱 → JSON 매핑 테이블로 점수화
- KoBERT 기반 분류기로 5가지 유형 중 하나 분류

### 3. 페르소나 챗봇 연결

- 유형별 프롬프트 기반 GPT-4o 챗봇 연결
- 정서 피드백, 공감 대화, 자기 돌봄 전략 제공


## 🛠 기술 스택

| **구분**           | **기술 스택**                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**        | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![OpenSearch](https://img.shields.io/badge/OpenSearch-005EB8?style=for-the-badge)                       |
| **Frontend**       | ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)                                                                                                               |
| **AI 모델**        | ![YOLO](https://img.shields.io/badge/YOLOv11-black?style=for-the-badge) ![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white) ![GPT-4o](https://img.shields.io/badge/GPT--4o-AB47BC?style=for-the-badge) ![KoBERT](https://img.shields.io/badge/KoBERT-1976D2?style=for-the-badge) |
| **Infra & DevOps** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white) ![S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazonaws&logoColor=white)           |

---

## 🧠 상담 유형별 챗봇 전략

| 유형   | 주요 특성               | 챗봇 상담 전략                   |
| ------ | ----------------------- | -------------------------------- |
| 내면형 | 감정적 민감함, 자기성찰 | 감정 표현 유도, 자기 이해 촉진   |
| 안정형 | 조화 지향, 불안 회피    | 신뢰 중심 언어, 정서적 안정 제공 |
| 관계형 | 애정 중심, 인정 욕구    | 정서 유대 형성, 자기 돌봄 강조   |
| 추진형 | 성취욕, 통제욕          | 목표 중심, 자기 주도성 강화      |
| 쾌락형 | 자극 추구, 고통 회피    | 긍정 감정 환기, 창의적 자극 제공 |

---

## 🗃 데이터베이스 ERD

<p align="center">
  <img src="./assets/img/db_erd.png" width="60%">
</p>

## ⚙️ 시스템 아키텍처

<p align="center">
  <img src="./assets/img/architecture.jpg" width="60%">
</p>

## 🖥️ 유저플로우

<p align="center">
  <img src="./assets/img/userflow.png" width="60%">
</p>

## 🗓️ 프로토타입

<p align="center">
  <img src="./assets/img/main.png" width="45%" style="margin: 10px;">
  <img src="./assets/img/upload.png" width="45%" style="margin: 10px;"><br>
  <img src="./assets/img/chatbot.png" width="45%" style="margin: 10px;">
  <img src="./assets/img/mypage.png" width="45%" style="margin: 10px;">
</p>
