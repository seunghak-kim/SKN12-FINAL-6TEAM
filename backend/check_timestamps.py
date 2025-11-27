import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to sys.path to import app modules
sys.path.append(os.getcwd())

from app.database import DATABASE_URL
from app.models.test import DrawingTest, DrawingTestResult

def check_timestamps():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get latest 5 results
        results = db.query(DrawingTestResult).order_by(DrawingTestResult.created_at.desc()).limit(5).all()
        
        print(f"Found {len(results)} results.")
        
        for result in results:
            test = db.query(DrawingTest).filter(DrawingTest.test_id == result.test_id).first()
            if test:
                print(f"Test ID: {test.test_id}")
                print(f"  Submitted At: {test.submitted_at}")
                print(f"  Created At:   {result.created_at}")
                
                if test.submitted_at and result.created_at:
                    delta = result.created_at - test.submitted_at
                    print(f"  Duration:     {delta.total_seconds()} seconds")
                else:
                    print("  Duration:     Cannot calculate (missing timestamps)")
            else:
                print(f"Result ID: {result.result_id} has no associated test.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_timestamps()
