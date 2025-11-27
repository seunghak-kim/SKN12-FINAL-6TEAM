import os
import sys
import bcrypt
from sqlalchemy.orm import Session

# Add the current directory (backend) to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine, Base
from app.models.user import User, UserInformation

def create_admin_user():
    """
    Create a default admin user if it doesn't exist.
    Email: admin@example.com
    Password: adminpassword123!
    """
    print("Checking for admin user...")
    
    # Get DB session
    db = next(get_db())
    
    try:
        # Check if admin user exists
        admin_email = "admin@example.com"
        existing_user = db.query(User).filter(User.email == admin_email).first()
        
        if existing_user:
            print(f"Admin user already exists with email: {admin_email}")
            
            # Check if UserInformation exists and has ADMIN role
            user_info = db.query(UserInformation).filter(UserInformation.regular_user_id == existing_user.user_id).first()
            if user_info:
                if user_info.role != 'ADMIN':
                    print("Updating existing user role to ADMIN...")
                    user_info.role = 'ADMIN'
                    db.commit()
                    print("User role updated.")
                else:
                    print("User already has ADMIN role.")
            else:
                print("User exists but UserInformation missing. Creating it...")
                new_user_info = UserInformation(
                    nickname="Admin",
                    regular_user_id=existing_user.user_id,
                    status='ACTIVE',
                    role='ADMIN'
                )
                db.add(new_user_info)
                db.commit()
                print("UserInformation created.")
                
            return

        print("Creating new admin user...")
        
        # Hash password
        password = "adminpassword123!"
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        # Create User
        new_user = User(
            email=admin_email,
            user_password=hashed_password.decode('utf-8')
        )
        db.add(new_user)
        db.flush()
        
        # Create UserInformation
        new_user_info = UserInformation(
            nickname="Admin",
            regular_user_id=new_user.user_id,
            status='ACTIVE',
            role='ADMIN'
        )
        db.add(new_user_info)
        db.commit()
        
        print(f"Admin user created successfully.")
        print(f"Email: {admin_email}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
