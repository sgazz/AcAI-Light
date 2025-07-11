import os
from typing import List

# Učitaj .env fajl za environment varijable
try:
    from dotenv import load_dotenv
    # Pokušaj da učitaš .env iz backend direktorijuma
    backend_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(backend_env_path):
        load_dotenv(backend_env_path)
    else:
        # Ako ne postoji u backend, pokušaj u root direktorijumu
        load_dotenv()
except ImportError:
    print("python-dotenv nije instaliran. Environment varijable možda neće biti učitate.")

class Config:
    """Centralizovana konfiguracija za backend aplikaciju (lokalna verzija)"""
    
    # API konfiguracija
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8001"))
    
    # File upload konfiguracija
    max_file_size_str = os.getenv("MAX_FILE_SIZE", "52428800")
    # Ukloni komentare ako postoje
    max_file_size_str = max_file_size_str.split('#')[0].strip()
    MAX_FILE_SIZE = int(max_file_size_str)  # 50MB default
    ALLOWED_EXTENSIONS = os.getenv("ALLOWED_EXTENSIONS", ".pdf,.docx,.txt,.png,.jpg,.jpeg,.bmp,.tiff,.tif").split(",")
    
    # OCR konfiguracija
    OCR_DEFAULT_LANGUAGES = os.getenv("OCR_DEFAULT_LANGUAGES", "srp,eng").split(",")
    OCR_MIN_CONFIDENCE = float(os.getenv("OCR_MIN_CONFIDENCE", "50.0"))
    OCR_BATCH_SIZE = int(os.getenv("OCR_BATCH_SIZE", "5"))
    
    # Lokalni storage konfiguracija
    USE_LOCAL_STORAGE = True  # Uvek koristi lokalni storage
    
    # RAG konfiguracija
    RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "500"))
    RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))
    
    # OpenAI konfiguracija
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
    OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    
    @classmethod
    def get_allowed_extensions(cls) -> List[str]:
        """Vraća listu dozvoljenih ekstenzija"""
        return [ext.strip() for ext in cls.ALLOWED_EXTENSIONS if ext.strip()]
    
    @classmethod
    def is_file_type_allowed(cls, filename: str) -> bool:
        """Proverava da li je tip fajla dozvoljen"""
        if not filename:
            return False
        extension = os.path.splitext(filename)[1].lower()
        return extension in cls.get_allowed_extensions()
    
    @classmethod
    def is_file_size_valid(cls, file_size: int) -> bool:
        """Proverava da li je veličina fajla validna"""
        return file_size <= cls.MAX_FILE_SIZE 