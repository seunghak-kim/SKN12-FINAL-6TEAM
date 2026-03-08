FROM python:3.10-slim

WORKDIR /app

# 1. 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. [핵심] CPU 전용 torch와 torchvision을 먼저 명시적으로 설치
# 이 단계가 있어야 뒤의 sentence-transformers가 무거운 CUDA 버전을 가져오지 않습니다.
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# 3. 나머지 Python 패키지 설치
RUN pip install --no-cache-dir \
    opensearch-py \
    sentence-transformers \
    scikit-learn \
    numpy \
    tqdm \
    python-dotenv

# 4. 코드 복사 및 환경 설정
COPY . /app
ENV PYTHONUNBUFFERED=1

# 5. 초기화 스크립트 실행
CMD ["python", "initialize_opensearch.py"]
