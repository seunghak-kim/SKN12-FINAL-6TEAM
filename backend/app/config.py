import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # 데이터베이스 설정
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/test_1")
    
    # OpenAI 설정
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # 애플리케이션 설정
    APP_NAME: str = "Care Chat API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 보안 설정
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    
    # URL 설정 
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # CORS 설정
    ALLOWED_ORIGINS: list = [
        "http://localhost:80", 
        "http://localhost:8080", 
        "http://localhost:3000"  # Hardcode default for now to avoid reference issue
    ]
    
    class Config:
        env_file = ".env"
        extra = "ignore"

    # HTP 분석 설정
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_DIR: str = os.path.join(BASE_DIR, "llm", "model")
    TEST_IMG_DIR: str = os.path.join(BASE_DIR, "llm", "test_images")
    DETECTION_RESULTS_DIR: str = os.path.join(BASE_DIR, "llm", "detection_results")
    RESULT_DIR: str = os.path.join(BASE_DIR, "result")
    
    YOLO_MODEL_PATH: str = "best.pt"
    SUPPORTED_IMAGE_FORMATS: list = ['.jpg', '.jpeg', '.png', '.bmp', '.gif']

settings = Settings()