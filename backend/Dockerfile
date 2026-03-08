FROM python:3.10-slim

# 1. 작업 디렉토리 설정
WORKDIR /app

# 2. 시스템 의존성 설치 (중복 제거 및 최적화)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 3. uv 설치 및 환경 설정
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uv/bin/
ENV PATH="/uv/bin:$PATH"

# 4. 의존성 파일 복사
COPY requirements.txt .

# 5. [핵심] CPU 전용 torch 먼저 설치 (용량 90% 절감)
# sentence-transformers가 무거운 CUDA 버전을 가져오지 못하게 미리 차단합니다.
RUN uv pip install --system --no-cache torch --index-url https://download.pytorch.org/whl/cpu

# 6. 나머지 Python 패키지 설치 (uv 사용으로 속도 향상)
RUN uv pip install --system --no-cache -r requirements.txt

# 7. AI 모델 미리 다운로드 (이미지에 포함)
# KURE-v1 모델을 빌드 타임에 미리 구워 넣습니다.
ENV HF_HOME=/app/model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('nlpai-lab/KURE-v1')"

# 8. 애플리케이션 코드 및 디렉토리 설정
COPY . .
RUN mkdir -p result/images uploads/profile_images

# 9. 실행 설정
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
