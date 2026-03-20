import mysql.connector
import json
import os

DB_CONFIG = {
    "host": "192.168.200.91",
    "port": 3306, # Assuming standard port, user mentioned 8080 which is likely for web
    "user": "root",
    "password": "rootpassword",
    "database": "face_recognition_db"
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

def init_db():
    conn = mysql.connector.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"]
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
    cursor.execute(f"USE {DB_CONFIG['database']}")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            encoding JSON NOT NULL
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()

def save_user(name, encoding):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        encoding_json = json.dumps(encoding.tolist())
        cursor.execute("INSERT INTO users (name, encoding) VALUES (%s, %s)", (name, encoding_json))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    return False

def get_all_users():
    conn = get_db_connection()
    users = []
    if conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name, encoding FROM users")
        for (name, encoding_json) in cursor:
            encoding = json.loads(encoding_json)
            users.append({"name": name, "encoding": encoding})
        cursor.close()
        conn.close()
    return users
