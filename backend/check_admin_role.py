import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to sys.path to import app modules
sys.path.append(os.getcwd())

from app.database import DATABASE_URL
from app.models.user import UserInformation

def check_admin_role():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check for admin user
        # Note: UserInformation doesn't have email directly, it's in User or SocialUser
        # But create_admin.py linked them.
        # Let's check by nickname 'Admin' as seen in the screenshot, or we can join with User table.
        
        # Actually, let's look at all users and their roles
        users = db.query(UserInformation).all()
        print(f"Found {len(users)} users.")
        
        for user in users:
            print(f"User ID: {user.user_id}, Nickname: {user.nickname}, Role: {user.role}")
            
            # If nickname is Admin or related to admin@example.com (we can't easily check email here without join, but let's assume nickname)
            if user.nickname == 'Admin' or user.nickname == 'admin':
                if user.role != 'ADMIN':
                    print(f"Updating role for {user.nickname} to ADMIN")
                    user.role = 'ADMIN'
                    db.commit()
                    print("Role updated.")
                else:
                    print(f"User {user.nickname} already has ADMIN role.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin_role()
