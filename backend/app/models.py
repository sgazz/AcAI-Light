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

# Kreiraj tabele
Base.metadata.create_all(bind=engine)

# Dependency za dobijanje DB session-a
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 