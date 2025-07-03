"""
Study Journal Service
Upravlja svim operacijama vezanim za Study Journal funkcionalnost
"""

import uuid
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum

from .supabase_client import get_supabase_manager

logger = logging.getLogger(__name__)

class EntryType(str, Enum):
    REFLECTION = "reflection"
    NOTE = "note"
    QUESTION = "question"
    ACHIEVEMENT = "achievement"

class GoalType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class GoalPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class SessionType(str, Enum):
    REVIEW = "review"
    PRACTICE = "practice"
    NEW_MATERIAL = "new_material"
    EXAM_PREP = "exam_prep"
    GROUP_STUDY = "group_study"

class SessionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@dataclass
class JournalEntry:
    id: str
    user_id: str
    subject: str
    topic: Optional[str]
    entry_type: EntryType
    content: str
    mood_rating: Optional[int]
    study_time_minutes: int
    difficulty_level: Optional[DifficultyLevel]
    tags: List[str]
    related_chat_session: Optional[str]
    related_problem_id: Optional[str]
    related_study_room_id: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class StudyGoal:
    id: str
    user_id: str
    title: str
    description: Optional[str]
    subject: Optional[str]
    target_date: date
    goal_type: GoalType
    target_value: int
    current_value: int
    status: GoalStatus
    priority: GoalPriority
    measurement_unit: str
    tags: List[str]
    created_at: datetime
    updated_at: datetime

@dataclass
class Flashcard:
    id: str
    user_id: str
    subject: str
    topic: Optional[str]
    front_content: str
    back_content: str
    difficulty_level: DifficultyLevel
    last_reviewed: Optional[datetime]
    review_count: int
    mastery_level: int
    next_review_date: Optional[date]
    tags: List[str]
    is_archived: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class StudySession:
    id: str
    user_id: str
    title: str
    description: Optional[str]
    subject: Optional[str]
    planned_duration_minutes: int
    actual_duration_minutes: Optional[int]
    session_type: SessionType
    status: SessionStatus
    scheduled_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    notes: Optional[str]
    related_goals: List[str]
    tags: List[str]
    created_at: datetime
    updated_at: datetime

class StudyJournalService:
    """Glavni servis za upravljanje Study Journal funkcionalnostima"""
    
    def __init__(self):
        try:
            supabase_manager = get_supabase_manager()
            self.supabase = supabase_manager.client if supabase_manager else None
        except Exception as e:
            logger.error(f"Greška pri inicijalizaciji Supabase klijenta: {e}")
            self.supabase = None
    
    def _handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """Centralizovano rukovanje greškama"""
        logger.error(f"Greška u {operation}: {error}")
        return {
            "status": "error",
            "message": f"Greška u {operation}: {str(error)}",
            "data": None
        }
    
    # ==================== JOURNAL ENTRIES ====================
    
    async def create_journal_entry(self, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kreira novi journal entry"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            entry_id = str(uuid.uuid4())
            entry_data["id"] = entry_id
            entry_data["created_at"] = datetime.now().isoformat()
            entry_data["updated_at"] = datetime.now().isoformat()
            
            # Validacija
            if not entry_data.get("user_id"):
                raise ValueError("user_id je obavezan")
            if not entry_data.get("subject"):
                raise ValueError("subject je obavezan")
            if not entry_data.get("content"):
                raise ValueError("content je obavezan")
            
            # Ažuriraj analitiku
            await self._update_analytics(
                user_id=entry_data["user_id"],
                study_time_minutes=entry_data.get("study_time_minutes", 0),
                subject=entry_data["subject"],
                mood_rating=entry_data.get("mood_rating")
            )
            
            result = self.supabase.table("study_journal_entries").insert(entry_data).execute()
            
            if result.data:
                logger.info(f"Journal entry kreiran: {entry_id}")
                return {
                    "status": "success",
                    "message": "Journal entry uspešno kreiran",
                    "data": result.data[0]
                }
            else:
                raise Exception("Greška pri kreiranju journal entry-ja")
                
        except Exception as e:
            return self._handle_error(e, "kreiranju journal entry-ja")
    
    async def get_journal_entries(
        self, 
        user_id: str, 
        subject: Optional[str] = None,
        entry_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Dohvata journal entries za korisnika"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            query = self.supabase.table("study_journal_entries")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)
            
            if subject:
                query = query.eq("subject", subject)
            if entry_type:
                query = query.eq("entry_type", entry_type)
            
            result = query.execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} journal entries",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju journal entries")
    
    async def update_journal_entry(self, entry_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ažurira journal entry"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            update_data["updated_at"] = datetime.now().isoformat()
            
            result = self.supabase.table("study_journal_entries")\
                .update(update_data)\
                .eq("id", entry_id)\
                .execute()
            
            if result.data:
                logger.info(f"Journal entry ažuriran: {entry_id}")
                return {
                    "status": "success",
                    "message": "Journal entry uspešno ažuriran",
                    "data": result.data[0]
                }
            else:
                raise Exception("Journal entry nije pronađen")
                
        except Exception as e:
            return self._handle_error(e, "ažuriranju journal entry-ja")
    
    async def delete_journal_entry(self, entry_id: str) -> Dict[str, Any]:
        """Briše journal entry"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.table("study_journal_entries")\
                .delete()\
                .eq("id", entry_id)\
                .execute()
            
            if result.data:
                logger.info(f"Journal entry obrisan: {entry_id}")
                return {
                    "status": "success",
                    "message": "Journal entry uspešno obrisan",
                    "data": result.data[0]
                }
            else:
                raise Exception("Journal entry nije pronađen")
                
        except Exception as e:
            return self._handle_error(e, "brisanju journal entry-ja")
    
    # ==================== STUDY GOALS ====================
    
    async def create_study_goal(self, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kreira novi study goal"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            goal_id = str(uuid.uuid4())
            goal_data["id"] = goal_id
            goal_data["created_at"] = datetime.now().isoformat()
            goal_data["updated_at"] = datetime.now().isoformat()
            
            # Validacija
            if not goal_data.get("user_id"):
                raise ValueError("user_id je obavezan")
            if not goal_data.get("title"):
                raise ValueError("title je obavezan")
            if not goal_data.get("target_date"):
                raise ValueError("target_date je obavezan")
            if not goal_data.get("target_value"):
                raise ValueError("target_value je obavezan")
            
            result = self.supabase.table("study_goals").insert(goal_data).execute()
            
            if result.data:
                logger.info(f"Study goal kreiran: {goal_id}")
                return {
                    "status": "success",
                    "message": "Study goal uspešno kreiran",
                    "data": result.data[0]
                }
            else:
                raise Exception("Greška pri kreiranju study goal-a")
                
        except Exception as e:
            return self._handle_error(e, "kreiranju study goal-a")
    
    async def get_study_goals(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        subject: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Dohvata study goals za korisnika"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            query = self.supabase.table("study_goals")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("target_date", desc=True)\
                .range(offset, offset + limit - 1)
            
            if status:
                query = query.eq("status", status)
            if subject:
                query = query.eq("subject", subject)
            
            result = query.execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} study goals",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju study goals")
    
    async def update_goal_progress(self, goal_id: str, new_value: int) -> Dict[str, Any]:
        """Ažurira napredak u cilju"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Dohvati trenutni goal
            result = self.supabase.table("study_goals")\
                .select("*")\
                .eq("id", goal_id)\
                .execute()
            
            if not result.data:
                raise Exception("Goal nije pronađen")
            
            goal = result.data[0]
            current_value = goal.get("current_value", 0)
            target_value = goal.get("target_value", 0)
            
            # Ažuriraj vrednost i status
            update_data = {
                "current_value": new_value,
                "status": "completed" if new_value >= target_value else "active",
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("study_goals")\
                .update(update_data)\
                .eq("id", goal_id)\
                .execute()
            
            if result.data:
                logger.info(f"Goal progress ažuriran: {goal_id}")
                return {
                    "status": "success",
                    "message": "Napredak u cilju uspešno ažuriran",
                    "data": result.data[0]
                }
            else:
                raise Exception("Greška pri ažuriranju goal-a")
                
        except Exception as e:
            return self._handle_error(e, "ažuriranju goal progress-a")
    
    # ==================== FLASHCARDS ====================
    
    async def create_flashcard(self, flashcard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kreira novi flashcard"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            flashcard_id = str(uuid.uuid4())
            flashcard_data["id"] = flashcard_id
            flashcard_data["created_at"] = datetime.now().isoformat()
            flashcard_data["updated_at"] = datetime.now().isoformat()
            
            # Validacija
            if not flashcard_data.get("user_id"):
                raise ValueError("user_id je obavezan")
            if not flashcard_data.get("subject"):
                raise ValueError("subject je obavezan")
            if not flashcard_data.get("front_content"):
                raise ValueError("front_content je obavezan")
            if not flashcard_data.get("back_content"):
                raise ValueError("back_content je obavezan")
            
            result = self.supabase.table("study_flashcards").insert(flashcard_data).execute()
            
            if result.data:
                logger.info(f"Flashcard kreiran: {flashcard_id}")
                return {
                    "status": "success",
                    "message": "Flashcard uspešno kreiran",
                    "data": result.data[0]
                }
            else:
                raise Exception("Greška pri kreiranju flashcard-a")
                
        except Exception as e:
            return self._handle_error(e, "kreiranju flashcard-a")
    
    async def get_flashcards_for_review(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """Dohvata flashcards za review (spaced repetition)"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Koristi custom funkciju za spaced repetition
            result = self.supabase.rpc(
                "get_flashcards_for_review",
                {"user_id_param": user_id, "limit_count": limit}
            ).execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} flashcards za review",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju flashcards za review")
    
    async def review_flashcard(
        self, 
        flashcard_id: str, 
        difficulty_rating: int, 
        was_correct: bool,
        response_time_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """Obeležava review flashcard-a"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Ažuriraj mastery level
            self.supabase.rpc(
                "update_flashcard_mastery",
                {
                    "flashcard_id_param": flashcard_id,
                    "difficulty_rating": difficulty_rating,
                    "was_correct": was_correct
                }
            ).execute()
            
            # Sačuvaj review istoriju
            review_data = {
                "id": str(uuid.uuid4()),
                "flashcard_id": flashcard_id,
                "user_id": "temp_user",  # TODO: dohvati iz flashcard-a
                "review_date": datetime.now().isoformat(),
                "difficulty_rating": difficulty_rating,
                "response_time_seconds": response_time_seconds,
                "was_correct": was_correct,
                "created_at": datetime.now().isoformat()
            }
            
            self.supabase.table("flashcard_reviews").insert(review_data).execute()
            
            logger.info(f"Flashcard review sačuvan: {flashcard_id}")
            return {
                "status": "success",
                "message": "Flashcard review uspešno sačuvan",
                "data": {"flashcard_id": flashcard_id, "was_correct": was_correct}
            }
            
        except Exception as e:
            return self._handle_error(e, "review flashcard-a")
    
    # ==================== STUDY SESSIONS ====================
    
    async def create_study_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kreira novu study session"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            session_id = str(uuid.uuid4())
            session_data["id"] = session_id
            session_data["created_at"] = datetime.now().isoformat()
            session_data["updated_at"] = datetime.now().isoformat()
            
            # Validacija
            if not session_data.get("user_id"):
                raise ValueError("user_id je obavezan")
            if not session_data.get("title"):
                raise ValueError("title je obavezan")
            if not session_data.get("scheduled_at"):
                raise ValueError("scheduled_at je obavezan")
            if not session_data.get("planned_duration_minutes"):
                raise ValueError("planned_duration_minutes je obavezan")
            
            result = self.supabase.table("study_sessions").insert(session_data).execute()
            
            if result.data:
                logger.info(f"Study session kreirana: {session_id}")
                return {
                    "status": "success",
                    "message": "Study session uspešno kreirana",
                    "data": result.data[0]
                }
            else:
                raise Exception("Greška pri kreiranju study session")
                
        except Exception as e:
            return self._handle_error(e, "kreiranju study session")
    
    async def start_study_session(self, session_id: str) -> Dict[str, Any]:
        """Započinje study session"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            update_data = {
                "status": "in_progress",
                "started_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("study_sessions")\
                .update(update_data)\
                .eq("id", session_id)\
                .execute()
            
            if result.data:
                logger.info(f"Study session započeta: {session_id}")
                return {
                    "status": "success",
                    "message": "Study session uspešno započeta",
                    "data": result.data[0]
                }
            else:
                raise Exception("Study session nije pronađena")
                
        except Exception as e:
            return self._handle_error(e, "započinjanju study session")
    
    async def complete_study_session(
        self, 
        session_id: str, 
        actual_duration_minutes: int,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Završava study session"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            update_data = {
                "status": "completed",
                "actual_duration_minutes": actual_duration_minutes,
                "completed_at": datetime.now().isoformat(),
                "notes": notes,
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("study_sessions")\
                .update(update_data)\
                .eq("id", session_id)\
                .execute()
            
            if result.data:
                logger.info(f"Study session završena: {session_id}")
                return {
                    "status": "success",
                    "message": "Study session uspešno završena",
                    "data": result.data[0]
                }
            else:
                raise Exception("Study session nije pronađena")
                
        except Exception as e:
            return self._handle_error(e, "završavanju study session")
    
    # ==================== ANALYTICS ====================
    
    async def _update_analytics(
        self, 
        user_id: str, 
        study_time_minutes: int = 0,
        subject: Optional[str] = None,
        mood_rating: Optional[int] = None
    ) -> None:
        """Ažurira dnevnu analitiku"""
        try:
            if not self.supabase:
                return
            
            self.supabase.rpc(
                "update_study_analytics",
                {
                    "user_id_param": user_id,
                    "study_time_minutes": study_time_minutes,
                    "subject_param": subject,
                    "mood_rating": mood_rating
                }
            ).execute()
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju analitike: {e}")
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Dohvata statistike korisnika"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.rpc("get_user_study_stats", {"user_id_param": user_id}).execute()
            
            if result.data:
                return {
                    "status": "success",
                    "message": "Statistike uspešno dohvaćene",
                    "data": result.data[0]
                }
            else:
                return {
                    "status": "success",
                    "message": "Nema podataka za korisnika",
                    "data": {
                        "total_study_days": 0,
                        "total_study_time_hours": 0,
                        "current_streak_days": 0,
                        "longest_streak_days": 0,
                        "total_entries": 0,
                        "total_goals": 0,
                        "completed_goals": 0,
                        "total_flashcards": 0,
                        "average_mood": 0,
                        "favorite_subject": None,
                        "productivity_score": 0
                    }
                }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju korisničkih statistika")
    
    async def get_analytics_by_date_range(
        self, 
        user_id: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        """Dohvata analitiku za određeni period"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.table("study_analytics")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("date", start_date.isoformat())\
                .lte("date", end_date.isoformat())\
                .order("date", desc=True)\
                .execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćena analitika za period {start_date} - {end_date}",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju analitike po periodu")
    
    # ==================== INTEGRATION HELPERS ====================
    
    async def create_entry_from_chat_session(
        self, 
        user_id: str, 
        chat_session_id: str,
        subject: str,
        content: str,
        mood_rating: Optional[int] = None
    ) -> Dict[str, Any]:
        """Kreira journal entry iz chat sesije"""
        entry_data = {
            "user_id": user_id,
            "subject": subject,
            "entry_type": "reflection",
            "content": content,
            "mood_rating": mood_rating,
            "study_time_minutes": 0,
            "related_chat_session": chat_session_id,
            "tags": ["chat-session"],
            "is_public": False
        }
        
        return await self.create_journal_entry(entry_data)
    
    async def create_entry_from_problem(
        self, 
        user_id: str, 
        problem_id: str,
        subject: str,
        content: str,
        difficulty_level: Optional[str] = None,
        study_time_minutes: int = 0
    ) -> Dict[str, Any]:
        """Kreira journal entry iz rešenog problema"""
        entry_data = {
            "user_id": user_id,
            "subject": subject,
            "entry_type": "achievement",
            "content": content,
            "study_time_minutes": study_time_minutes,
            "difficulty_level": difficulty_level,
            "related_problem_id": problem_id,
            "tags": ["problem-solved"],
            "is_public": False
        }
        
        return await self.create_journal_entry(entry_data)

# Globalna instanca servisa
study_journal_service = StudyJournalService() 