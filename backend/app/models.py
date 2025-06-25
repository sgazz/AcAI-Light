from sqlalchemy import Column, Integer, String, Text, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

# Kreiraj SQLite bazu
DATABASE_URL = "sqlite:///./chat_history.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Kreiraj session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Kreiraj base klasu za modele
Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String(10), nullable=False)  # 'user' ili 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    session_id = Column(String(50), nullable=False, default="default")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, index=True)  # UUID
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # .pdf, .docx, .txt
    total_pages = Column(Integer, nullable=False, default=0)
    file_size = Column(Integer, nullable=False, default=0)  # u bajtovima
    status = Column(String(20), nullable=False, default="uploaded")  # uploaded, processing, error
    chunks_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    error_message = Column(Text, nullable=True)

# Kreiraj tabele
Base.metadata.create_all(bind=engine)

# Dependency za dobijanje DB session-a
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 