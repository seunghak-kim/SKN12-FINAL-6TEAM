import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

# Add the current directory (backend) to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine

def add_role_column():
    """
    Add 'role' column to user_informations table.
    """
    print("Adding role column to user_informations table...")
    
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='user_informations' AND column_name='role';"
            ))
            if result.fetchone():
                print("Column 'role' already exists.")
                return

            # Add column
            connection.execute(text("ALTER TABLE user_informations ADD COLUMN role VARCHAR(10) DEFAULT 'USER' NOT NULL;"))
            connection.commit()
            print("Column 'role' added successfully.")
            
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_role_column()
