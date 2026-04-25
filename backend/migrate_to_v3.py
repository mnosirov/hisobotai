import sqlite3
import os

def run_migration():
    db_path = os.path.join(os.path.dirname(__file__), "hisobot.db")
    if not os.path.exists(db_path):
        print("Database not found, new setup won't need migration.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if due_date exists
        cursor.execute("PRAGMA table_info(transactions);")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'due_date' not in columns:
            print("Adding due_date to transactions...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN due_date DATETIME;")
            conn.commit()
            print("Successfully migrated to v3!")
        else:
            print("Database already at v3.")
    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
