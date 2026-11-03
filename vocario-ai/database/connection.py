import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Cấu hình chuỗi kết nối PostgreSQL
# Cú pháp: postgresql://<user>:<password>@<host>:<port>/<dbname>
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/vocario_db"
)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency helper cho FastAPI routes để mở và tự động đóng session DB"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
