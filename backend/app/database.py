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
    
    print("🚀 create_tables() 함수 호출됨")
    
    # create_db.sql 파일 경로
    sql_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'create_db.sql')
    print(f"📁 SQL 파일 경로: {sql_file_path}")
    
    if os.path.exists(sql_file_path):
        print("📄 create_db.sql 파일 발견, 읽는 중...")
        with open(sql_file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        print(f"📝 SQL 내용 길이: {len(sql_content)} 문자")
        
        # SQL 문을 세미콜론으로 분리하여 각각 실행
        sql_statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        print(f"🔢 총 {len(sql_statements)}개의 SQL 문장 감지")
        
        try:
            print("🔗 데이터베이스 연결 시작")
            # 각 SQL 문을 개별 트랜잭션으로 실행
            for i, sql_statement in enumerate(sql_statements, 1):
                if sql_statement:
                    try:
                        print(f"📋 [{i}/{len(sql_statements)}] 실행 중: {sql_statement[:50]}...")
                        with engine.begin() as conn:
                            conn.execute(text(sql_statement))
                        print(f"✅ [{i}/{len(sql_statements)}] 실행 완료")
                    except Exception as e:
                        # 테이블이 이미 존재하는 경우 등의 에러는 무시
                        if "already exists" not in str(e).lower() and "duplicate key" not in str(e).lower():
                            print(f"⚠️  SQL 실행 중 오류: {e}")
                            print(f"SQL: {sql_statement[:200]}...")
                        else:
                            print(f"ℹ️  [{i}/{len(sql_statements)}] 이미 존재함 (무시)")
            
            print("🎉 create_db.sql 실행 완료!")
        except Exception as e:
            print(f"❌ 데이터베이스 연결 또는 실행 실패: {e}")
            raise
    else:
        print(f"❌ create_db.sql 파일을 찾을 수 없습니다: {sql_file_path}")
        print("📂 현재 디렉토리 확인:")
        current_dir = os.path.dirname(os.path.dirname(__file__))
        print(f"   - 확인 중인 디렉토리: {current_dir}")
        if os.path.exists(current_dir):
            files = os.listdir(current_dir)
            print(f"   - 디렉토리 내 파일들: {files}")
        
        # 기존 방식으로 폴백
        print("🔄 SQLAlchemy 모델 기반 테이블 생성으로 폴백")
        from .models.user import Base
        from .models import chat
        Base.metadata.create_all(bind=engine)
        print("✅ SQLAlchemy 기반 테이블 생성 완료")