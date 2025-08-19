from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# 데이터베이스 URL 구성
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/turtle_db"
)

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 클래스
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 데이터베이스 테이블 생성
def create_tables():
    """create_db.sql 파일을 실행하여 테이블 생성"""
    import os
    from sqlalchemy import text
    
    # create_db.sql 파일 경로
    sql_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'create_db.sql')
    
    if os.path.exists(sql_file_path):
        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        # SQL 문을 세미콜론으로 분리하여 각각 실행
        sql_statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        try:
            has_new_creation = False
            error_count = 0
            # 각 SQL 문을 개별 트랜잭션으로 실행
            for sql_statement in sql_statements:
                if sql_statement:
                    try:
                        with engine.begin() as conn:
                            conn.execute(text(sql_statement))
                        has_new_creation = True
                    except Exception as e:
                        # 이미 존재하는 경우 등의 에러는 조용히 무시
                        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                            error_count += 1
                        pass
            
            if has_new_creation and error_count == 0:
                print("✅ 데이터베이스 테이블 생성 완료!")
            else:
                print("ℹ️ 데이터베이스 테이블이 이미 존재합니다.")
                
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            raise
    else:
        # 기존 방식으로 폴백
        from .models.user import Base
        from .models import chat
        Base.metadata.create_all(bind=engine)
        print("✅ SQLAlchemy 기반 테이블 생성 완료")