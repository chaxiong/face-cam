import mysql.connector
import json
import os
import time

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST",     "db"),
    "port":     int(os.environ.get("DB_PORT", 3306)),
    "user":     os.environ.get("DB_USER",     "faceid"),
    "password": os.environ.get("DB_PASSWORD", "faceid_secret"),
    "database": os.environ.get("DB_NAME",     "face_recognition_db"),
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"[DB] Connection error: {err}")
        return None

def init_db(retries=10, delay=3):
    """Create the database and table, retrying until MySQL is ready."""
    base_cfg = {k: v for k, v in DB_CONFIG.items() if k != "database"}

    for attempt in range(1, retries + 1):
        try:
            conn = mysql.connector.connect(**base_cfg)
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}`")
            cursor.execute(f"USE `{DB_CONFIG['database']}`")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id         INT AUTO_INCREMENT PRIMARY KEY,
                    name       VARCHAR(255) NOT NULL,
                    encoding   JSON         NOT NULL,
                    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            cursor.close()
            conn.close()
            print("[DB] Initialized successfully.")
            return
        except mysql.connector.Error as err:
            print(f"[DB] Attempt {attempt}/{retries} failed: {err}. Retrying in {delay}s…")
            time.sleep(delay)

    print("[DB] Could not connect after all retries.")

def save_user(name, encoding):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            encoding_json = json.dumps(encoding.tolist())
            cursor.execute(
                "INSERT INTO users (name, encoding) VALUES (%s, %s)",
                (name, encoding_json)
            )
            conn.commit()
            return True
        except mysql.connector.Error as err:
            print(f"[DB] save_user error: {err}")
        finally:
            cursor.close()
            conn.close()
    return False

def get_all_users():
    conn = get_db_connection()
    users = []
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name, encoding FROM users")
            for (name, encoding_json) in cursor:
                encoding = json.loads(encoding_json)
                users.append({"name": name, "encoding": encoding})
        except mysql.connector.Error as err:
            print(f"[DB] get_all_users error: {err}")
        finally:
            cursor.close()
            conn.close()
    return users

def delete_user(name):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE name = %s", (name,))
            conn.commit()
            return cursor.rowcount > 0
        except mysql.connector.Error as err:
            print(f"[DB] delete_user error: {err}")
        finally:
            cursor.close()
            conn.close()
    return False

def list_users():
    conn = get_db_connection()
    names = []
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT name, created_at FROM users ORDER BY created_at DESC")
            for (name, created_at) in cursor:
                names.append({"name": name, "created_at": str(created_at)})
        except mysql.connector.Error as err:
            print(f"[DB] list_users error: {err}")
        finally:
            cursor.close()
            conn.close()
    return names
