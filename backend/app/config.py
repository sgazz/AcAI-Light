import os
from typing import List

class Config:
    """Centralizovana konfiguracija za backend aplikaciju"""
    
    # API konfiguracija
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8001"))
    
    # File upload konfiguracija
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # 50MB default
    ALLOWED_EXTENSIONS = os.getenv("ALLOWED_EXTENSIONS", ".pdf,.docx,.txt,.png,.jpg,.jpeg,.bmp,.tiff,.tif").split(",")
    
    # OCR konfiguracija
    OCR_DEFAULT_LANGUAGES = os.getenv("OCR_DEFAULT_LANGUAGES", "srp,eng").split(",")
    OCR_MIN_CONFIDENCE = float(os.getenv("OCR_MIN_CONFIDENCE", "50.0"))
    OCR_BATCH_SIZE = int(os.getenv("OCR_BATCH_SIZE", "5"))
    
    # Database konfiguracija
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    
    # Supabase konfiguracija
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    USE_SUPABASE = bool(os.getenv("USE_SUPABASE", "false").lower() == "true")
    
    # RAG konfiguracija
    RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "500"))
    RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))
    
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