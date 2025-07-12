"""
Pydantic modeli za input validation u AcAIA backend-u
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from enum import Enum
import uuid

# Enums
class MessageType(str, Enum):
    USER = "user"
    AI = "ai"
    SYSTEM = "system"

# User modeli
class UserCreate(BaseModel):
    """Model za kreiranje korisnika"""
    email: EmailStr = Field(..., description="Email adresa")
    password: str = Field(..., min_length=6, max_length=100, description="Lozinka")
    name: Optional[str] = Field(None, max_length=100, description="Ime i prezime")

class UserLogin(BaseModel):
    """Model za login korisnika"""
    email: EmailStr = Field(..., description="Email adresa")
    password: str = Field(..., description="Lozinka")

class UserUpdate(BaseModel):
    """Model za ažuriranje korisnika"""
    name: Optional[str] = Field(None, max_length=100, description="Ime i prezime")
    bio: Optional[str] = Field(None, max_length=500, description="Bio")
    avatar_url: Optional[str] = Field(None, description="URL avatara")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Korisnička podešavanja")

class UserResponse(BaseModel):
    """Model za user response"""
    id: str = Field(..., description="ID korisnika")
    email: str = Field(..., description="Email adresa")
    name: Optional[str] = Field(None, description="Ime i prezime")
    bio: Optional[str] = Field(None, description="Bio")
    avatar_url: Optional[str] = Field(None, description="URL avatara")
    is_premium: bool = Field(False, description="Da li je premium korisnik")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Korisnička podešavanja")
    created_at: datetime = Field(..., description="Vreme kreiranja")
    updated_at: datetime = Field(..., description="Vreme ažuriranja")

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class Subject(str, Enum):
    MATHEMATICS = "mathematics"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    COMPUTER_SCIENCE = "computer_science"
    HISTORY = "history"
    LITERATURE = "literature"
    GEOGRAPHY = "geography"

class ProblemType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    CALCULATION = "calculation"

class AssessmentType(str, Enum):
    PERSONALITY = "personality"
    SKILLS = "skills"
    INTERESTS = "interests"
    VALUES = "values"

class JobStatus(str, Enum):
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFERED = "offered"
    REJECTED = "rejected"
    ACCEPTED = "accepted"

# Base modeli
class BaseRequest(BaseModel):
    """Base model za sve request-ove"""
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)

class BaseResponse(BaseModel):
    """Base model za sve response-ove"""
    success: bool = True
    message: str = "Success"
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

# Chat modeli
class ChatMessage(BaseModel):
    """Model za chat poruku"""
    content: str = Field(..., min_length=1, max_length=10000, description="Sadržaj poruke")
    session_id: Optional[str] = Field(None, description="ID sesije")
    user_id: Optional[str] = Field(None, description="ID korisnika")
    message_type: MessageType = Field(MessageType.USER, description="Tip poruke")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Dodatni metapodaci")

    @validator('content')
    def validate_content(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()

class ChatSession(BaseModel):
    """Model za chat sesiju"""
    session_id: str = Field(..., description="Jedinstveni ID sesije")
    name: str = Field(..., min_length=1, max_length=200, description="Naziv sesije")
    description: Optional[str] = Field(None, max_length=500, description="Opis sesije")
    user_id: str = Field(..., description="ID korisnika")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_archived: bool = Field(False, description="Da li je sesija arhivirana")
    categories: List[str] = Field(default_factory=list, description="Kategorije sesije")

class ChatHistoryRequest(BaseModel):
    """Model za zahtev chat istorije"""
    session_id: str = Field(..., description="ID sesije")
    limit: int = Field(50, ge=1, le=1000, description="Broj poruka za dohvatanje")
    offset: int = Field(0, ge=0, description="Offset za paginaciju")

# RAG modeli
class RAGRequest(BaseModel):
    """Model za RAG zahtev"""
    query: str = Field(..., min_length=1, max_length=5000, description="Upit za RAG")
    session_id: Optional[str] = Field(None, description="ID sesije")
    user_id: Optional[str] = Field(None, description="ID korisnika")
    max_results: int = Field(5, ge=1, le=20, description="Maksimalan broj rezultata")
    similarity_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Prag sličnosti")

# Document modeli
class DocumentUpload(BaseModel):
    """Model za upload dokumenta"""
    filename: str = Field(..., min_length=1, max_length=255, description="Naziv fajla")
    content_type: str = Field(..., description="MIME tip fajla")
    size: int = Field(..., gt=0, le=50*1024*1024, description="Veličina fajla u bajtima")
    user_id: str = Field(..., description="ID korisnika")

    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if v not in allowed_types:
            raise ValueError(f'Unsupported content type: {v}')
        return v

# OCR modeli
class OCRRequest(BaseModel):
    """Model za OCR zahtev"""
    filename: str = Field(..., min_length=1, max_length=255, description="Naziv slike")
    content_type: str = Field(..., description="MIME tip slike")
    size: int = Field(..., gt=0, le=10*1024*1024, description="Veličina slike u bajtima")

    @validator('content_type')
    def validate_image_type(cls, v):
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp']
        if v not in allowed_types:
            raise ValueError(f'Unsupported image type: {v}')
        return v

# Study Room modeli
class StudyRoomCreate(BaseModel):
    """Model za kreiranje study room-a"""
    name: str = Field(..., min_length=1, max_length=100, description="Naziv sobe")
    description: Optional[str] = Field(None, max_length=500, description="Opis sobe")
    max_members: int = Field(10, ge=2, le=50, description="Maksimalan broj članova")
    subject: Optional[str] = Field(None, description="Predmet")
    is_private: bool = Field(False, description="Da li je soba privatna")
    password: Optional[str] = Field(None, min_length=4, max_length=50, description="Lozinka za privatnu sobu")

class StudyRoomJoin(BaseModel):
    """Model za pridruživanje study room-u"""
    room_id: str = Field(..., description="ID sobe")
    user_id: str = Field(..., description="ID korisnika")
    username: str = Field(..., min_length=1, max_length=50, description="Korisničko ime")
    password: Optional[str] = Field(None, description="Lozinka za privatnu sobu")

class StudyRoomMessage(BaseModel):
    """Model za poruku u study room-u"""
    content: str = Field(..., min_length=1, max_length=2000, description="Sadržaj poruke")
    user_id: str = Field(..., description="ID korisnika")
    username: str = Field(..., min_length=1, max_length=50, description="Korisničko ime")
    message_type: str = Field("text", description="Tip poruke")

# Exam modeli
class ExamCreate(BaseModel):
    """Model za kreiranje ispita"""
    title: str = Field(..., min_length=1, max_length=200, description="Naslov ispita")
    description: Optional[str] = Field(None, max_length=1000, description="Opis ispita")
    subject: Subject = Field(..., description="Predmet")
    difficulty: Difficulty = Field(..., description="Težina")
    duration_minutes: int = Field(..., gt=0, le=480, description="Trajanje u minutima")
    total_questions: int = Field(..., gt=0, le=100, description="Ukupan broj pitanja")
    passing_score: float = Field(..., ge=0.0, le=100.0, description="Prolazni rezultat")
    user_id: str = Field(..., description="ID korisnika")

class ExamAttempt(BaseModel):
    """Model za pokušaj ispita"""
    exam_id: str = Field(..., description="ID ispita")
    user_id: str = Field(..., description="ID korisnika")
    start_time: datetime = Field(default_factory=datetime.now, description="Vreme početka")

class ExamAnswer(BaseModel):
    """Model za odgovor na pitanje"""
    question_id: str = Field(..., description="ID pitanja")
    answer: Union[str, List[str], int, float] = Field(..., description="Odgovor")
    time_spent_seconds: Optional[int] = Field(None, ge=0, description="Vreme utrošeno na odgovor")

# Problem Generator modeli
class ProblemGenerationRequest(BaseModel):
    """Model za zahtev generisanja problema"""
    subject: Subject = Field(..., description="Predmet")
    topic: str = Field(..., min_length=1, max_length=100, description="Tema")
    difficulty: Difficulty = Field(..., description="Težina")
    problem_type: ProblemType = Field(..., description="Tip problema")
    count: int = Field(1, ge=1, le=10, description="Broj problema")
    user_id: str = Field(..., description="ID korisnika")

class ProblemAnswer(BaseModel):
    """Model za odgovor na problem"""
    problem_id: str = Field(..., description="ID problema")
    answer: Union[str, int, float, List[str]] = Field(..., description="Odgovor")
    time_spent_seconds: Optional[int] = Field(None, ge=0, description="Vreme utrošeno")

# Study Journal modeli
class JournalEntry(BaseModel):
    """Model za unos u study journal"""
    user_id: str = Field(..., description="ID korisnika")
    subject: str = Field(..., min_length=1, max_length=100, description="Predmet")
    title: str = Field(..., min_length=1, max_length=200, description="Naslov")
    content: str = Field(..., min_length=1, max_length=10000, description="Sadržaj")
    entry_type: str = Field("note", description="Tip unosa")
    tags: List[str] = Field(default_factory=list, description="Tagovi")

class StudyGoal(BaseModel):
    """Model za study goal"""
    user_id: str = Field(..., description="ID korisnika")
    title: str = Field(..., min_length=1, max_length=200, description="Naslov cilja")
    description: Optional[str] = Field(None, max_length=1000, description="Opis cilja")
    subject: str = Field(..., min_length=1, max_length=100, description="Predmet")
    target_date: Optional[datetime] = Field(None, description="Ciljni datum")
    current_progress: int = Field(0, ge=0, le=100, description="Trenutni progres")

class Flashcard(BaseModel):
    """Model za flashcard"""
    user_id: str = Field(..., description="ID korisnika")
    subject: str = Field(..., min_length=1, max_length=100, description="Predmet")
    front_content: str = Field(..., min_length=1, max_length=1000, description="Prednja strana")
    back_content: str = Field(..., min_length=1, max_length=1000, description="Zadnja strana")
    mastery_level: int = Field(1, ge=1, le=5, description="Nivo savladavanja")

class FlashcardReview(BaseModel):
    """Model za review flashcard-a"""
    flashcard_id: str = Field(..., description="ID flashcard-a")
    difficulty_rating: int = Field(..., ge=1, le=5, description="Ocena težine")
    was_correct: bool = Field(..., description="Da li je odgovor tačan")
    response_time_seconds: Optional[int] = Field(None, ge=0, description="Vreme odgovora")

# Career Guidance modeli
class CareerProfile(BaseModel):
    """Model za career profile"""
    user_id: str = Field(..., description="ID korisnika")
    full_name: str = Field(..., min_length=1, max_length=100, description="Puno ime")
    email: EmailStr = Field(..., description="Email adresa")
    phone: Optional[str] = Field(None, max_length=20, description="Telefon")
    location: Optional[str] = Field(None, max_length=100, description="Lokacija")
    education_level: str = Field(..., description="Nivo obrazovanja")
    years_experience: int = Field(0, ge=0, le=50, description="Godine iskustva")
    current_role: Optional[str] = Field(None, max_length=100, description="Trenutna pozicija")
    desired_role: Optional[str] = Field(None, max_length=100, description="Željena pozicija")
    industry_preferences: List[str] = Field(default_factory=list, description="Preferencije industrije")
    salary_expectations: Optional[str] = Field(None, description="Očekivanja za platu")

class Skill(BaseModel):
    """Model za skill"""
    user_id: str = Field(..., description="ID korisnika")
    name: str = Field(..., min_length=1, max_length=100, description="Naziv veštine")
    category: str = Field(..., min_length=1, max_length=50, description="Kategorija")
    proficiency_level: int = Field(..., ge=1, le=5, description="Nivo stručnosti")
    years_experience: int = Field(0, ge=0, le=50, description="Godine iskustva")
    is_certified: bool = Field(False, description="Da li je sertifikovana")

class Assessment(BaseModel):
    """Model za assessment"""
    user_id: str = Field(..., description="ID korisnika")
    assessment_type: AssessmentType = Field(..., description="Tip assessment-a")
    title: str = Field(..., min_length=1, max_length=200, description="Naslov")
    description: Optional[str] = Field(None, max_length=1000, description="Opis")
    total_questions: int = Field(..., gt=0, le=100, description="Ukupan broj pitanja")

class AssessmentSubmission(BaseModel):
    """Model za submission assessment-a"""
    assessment_id: str = Field(..., description="ID assessment-a")
    answers: Dict[str, Any] = Field(..., description="Odgovori")
    results: Dict[str, Any] = Field(..., description="Rezultati")
    score: float = Field(..., ge=0.0, le=100.0, description="Skor")

class JobRecommendation(BaseModel):
    """Model za job recommendation"""
    user_id: str = Field(..., description="ID korisnika")
    title: str = Field(..., min_length=1, max_length=200, description="Naslov pozicije")
    company: str = Field(..., min_length=1, max_length=100, description="Kompanija")
    location: str = Field(..., min_length=1, max_length=100, description="Lokacija")
    description: str = Field(..., min_length=1, max_length=2000, description="Opis")
    requirements: List[str] = Field(default_factory=list, description="Zahtevi")
    salary_range: Optional[str] = Field(None, description="Raspon plate")
    match_score: float = Field(..., ge=0.0, le=100.0, description="Match score")
    application_url: Optional[str] = Field(None, description="URL za aplikaciju")

class CareerPath(BaseModel):
    """Model za career path"""
    user_id: str = Field(..., description="ID korisnika")
    title: str = Field(..., min_length=1, max_length=200, description="Naslov putanje")
    description: str = Field(..., min_length=1, max_length=1000, description="Opis")
    target_role: str = Field(..., min_length=1, max_length=100, description="Ciljna pozicija")
    industry: str = Field(..., min_length=1, max_length=100, description="Industrija")
    estimated_duration_months: int = Field(..., gt=0, le=120, description="Procenjeno trajanje")
    current_progress: float = Field(0.0, ge=0.0, le=100.0, description="Trenutni progres")

# Background Task modeli
class BackgroundTask(BaseModel):
    """Model za background task"""
    task_id: str = Field(..., description="ID task-a")
    task_type: str = Field(..., description="Tip task-a")
    priority: TaskPriority = Field(TaskPriority.MEDIUM, description="Prioritet")
    status: TaskStatus = Field(TaskStatus.PENDING, description="Status")
    data: Dict[str, Any] = Field(default_factory=dict, description="Podaci task-a")
    created_at: datetime = Field(default_factory=datetime.now, description="Vreme kreiranja")
    started_at: Optional[datetime] = Field(None, description="Vreme početka")
    completed_at: Optional[datetime] = Field(None, description="Vreme završetka")
    result: Optional[Dict[str, Any]] = Field(None, description="Rezultat")
    error: Optional[str] = Field(None, description="Greška")

# WebSocket modeli
class WebSocketMessage(BaseModel):
    """Model za WebSocket poruku"""
    message_type: str = Field(..., description="Tip poruke")
    data: Dict[str, Any] = Field(default_factory=dict, description="Podaci poruke")
    timestamp: datetime = Field(default_factory=datetime.now, description="Vreme poruke")
    session_id: Optional[str] = Field(None, description="ID sesije")
    user_id: Optional[str] = Field(None, description="ID korisnika")

# Response modeli
class ChatResponse(BaseResponse):
    """Model za chat response"""
    data: Dict[str, Any] = Field(default_factory=dict, description="Chat podaci")

class SessionListResponse(BaseResponse):
    """Model za listu sesija"""
    data: List[ChatSession] = Field(default_factory=list, description="Lista sesija")

class DocumentListResponse(BaseResponse):
    """Model za listu dokumenata"""
    data: List[Dict[str, Any]] = Field(default_factory=list, description="Lista dokumenata")

class TaskListResponse(BaseResponse):
    """Model za listu task-ova"""
    data: List[BackgroundTask] = Field(default_factory=list, description="Lista task-ova")

# Error modeli
class ErrorResponse(BaseModel):
    """Model za error response"""
    success: bool = False
    error_code: str = Field(..., description="Kod greške")
    message: str = Field(..., description="Poruka greške")
    details: Optional[Dict[str, Any]] = Field(None, description="Detalji greške")
    timestamp: datetime = Field(default_factory=datetime.now, description="Vreme greške") 

class SessionRenameRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Novi naziv sesije")

class SessionCategoriesRequest(BaseModel):
    categories: List[str] = Field(..., description="Lista kategorija")

class SessionArchiveRequest(BaseModel):
    is_archived: bool = Field(..., description="Da li arhivirati sesiju")

class SessionRestoreRequest(BaseModel):
    is_archived: bool = Field(..., description="Da li vratiti iz arhive")

class SessionShareRequest(BaseModel):
    permissions: str = Field('read', pattern='^(read|write)$', description="Dozvole za deljenje")
    expires_in: str = Field('7d', pattern='^\d+d$', description="Vreme isteka linka, npr. '7d'") 