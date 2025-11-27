FROM python:3.10-slim

# 작업 디렉토리 설정
WORKDIR /app

# Python 종속성 설치
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install uv 
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
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
RUN pip install -r requirements.txt

# Pre-download the model to bake it into the image
# This prevents runtime download errors and improves startup time
ENV HF_HOME=/app/model_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('nlpai-lab/KURE-v1')"

# 애플리케이션 코드 복사 (필요한 파일만)
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p result/images uploads/profile_images

# 포트 노출
EXPOSE 8000

# 애플리케이션 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
