"""
Study Center Service
Upravlja svim operacijama vezanim za Study Center funkcionalnost
"""

import uuid
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum

from .supabase_client import get_supabase_manager
from .rag_service import RAGService

logger = logging.getLogger(__name__)

class SessionType(str, Enum):
    TUTORING = "tutoring"
    PRACTICE = "practice"
    REVIEW = "review"
    ASSESSMENT = "assessment"

class TutorMode(str, Enum):
    SOCRATIC = "socratic"
    DIRECT = "direct"
    CONVERSATIONAL = "conversational"
    PRACTICE = "practice"

class InteractionType(str, Enum):
    QUESTION = "question"
    ANSWER = "answer"
    HINT = "hint"
    EXPLANATION = "explanation"
    FEEDBACK = "feedback"
    CORRECTION = "correction"

@dataclass
class StudySession:
    id: str
    user_id: str
    session_type: SessionType
    subject: str
    topic: Optional[str]
    difficulty_level: str
    ai_tutor_mode: TutorMode
    session_data: Dict[str, Any]
    progress_data: Dict[str, Any]
    related_documents: List[str]
    questions_asked: int
    correct_answers: int
    total_time_minutes: int
    started_at: datetime
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

@dataclass
class TutorInteraction:
    id: str
    session_id: str
    user_id: str
    interaction_type: InteractionType
    ai_message: str
    user_response: Optional[str]
    response_quality: Optional[int]
    time_taken_seconds: Optional[int]
    difficulty_adjustment: Dict[str, Any]
    rag_sources: List[Dict[str, Any]]
    concept_tags: List[str]
    is_correct: Optional[bool]
    feedback_message: Optional[str]
    created_at: datetime

@dataclass
class KnowledgeConcept:
    id: str
    user_id: str
    subject: str
    topic: str
    concept: str
    mastery_level: int
    confidence_score: float
    last_reviewed: Optional[datetime]
    next_review_date: Optional[date]
    review_count: int
    correct_reviews: int
    total_time_spent_minutes: int
    related_document_ids: List[str]
    learning_path: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

class StudyCenterService:
    def __init__(self):
        self.supabase = get_supabase_manager()
        self.rag_service = RAGService()
    
    def _handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """Centralizovano rukovanje greškama"""
        error_msg = f"Greška pri {operation}: {str(error)}"
        logger.error(error_msg, exc_info=True)
        return {
            "status": "error",
            "message": error_msg,
            "data": None
        }
    
    async def start_tutoring_session(
        self, 
        user_id: str, 
        subject: str, 
        topic: str = None,
        session_type: SessionType = SessionType.TUTORING,
        difficulty_level: str = "medium",
        ai_tutor_mode: TutorMode = TutorMode.SOCRATIC
    ) -> Dict[str, Any]:
        """Kreira novu tutoring sesiju"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            session_id = str(uuid.uuid4())
            session_data = {
                "id": session_id,
                "user_id": user_id,
                "session_type": session_type.value,
                "subject": subject,
                "topic": topic,
                "difficulty_level": difficulty_level,
                "ai_tutor_mode": ai_tutor_mode.value,
                "session_data": {},
                "progress_data": {
                    "current_question": 0,
                    "total_questions": 0,
                    "correct_answers": 0,
                    "session_start": datetime.now().isoformat()
                },
                "related_documents": [],
                "questions_asked": 0,
                "correct_answers": 0,
                "total_time_minutes": 0,
                "started_at": datetime.now().isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("study_center_sessions").insert(session_data).execute()
            
            if result.data:
                logger.info(f"Study Center sesija kreirana: {session_id}")
                return {
                    "status": "success",
                    "message": "Tutoring sesija uspešno započeta",
                    "data": {
                        "session_id": session_id,
                        "session": result.data[0]
                    }
                }
            else:
                raise Exception("Greška pri kreiranju sesije")
                
        except Exception as e:
            return self._handle_error(e, "kreiranju tutoring sesije")
    
    async def generate_tutor_question(
        self, 
        session_id: str, 
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Generiše pitanje od AI tutor-a"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Dohvati sesiju
            session_result = self.supabase.table("study_center_sessions").select("*").eq("id", session_id).execute()
            
            if not session_result.data:
                raise Exception("Sesija nije pronađena")
            
            session = session_result.data[0]
            
            # Dohvati relevantne dokumente iz RAG-a ako postoje
            rag_context = ""
            if session.get("related_documents"):
                # TODO: Implementirati RAG pretragu za relevantne informacije
                rag_context = "Koristeći vaše uploadovane dokumente..."
            
            # Generiši pitanje na osnovu konteksta
            question_prompt = f"""
            Ti si AI tutor koji pomaže studentu da uči {session['subject']}.
            {f"Tema: {session['topic']}" if session['topic'] else ""}
            Nivo težine: {session['difficulty_level']}
            Mod: {session['ai_tutor_mode']}
            
            {rag_context}
            
            Generiši jedno pitanje koje će pomoći studentu da razume koncept.
            Pitanje treba da bude:
            - Prilagođeno nivou težine
            - U skladu sa tutor modom
            - Kontekstualno relevantno
            """
            
            # TODO: Implementirati poziv ka AI modelu za generisanje pitanja
            # Za sada koristimo placeholder
            ai_question = f"Možete li mi objasniti ključne koncepte iz {session['subject']}?"
            
            # Sačuvaj interakciju
            interaction_data = {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "user_id": session["user_id"],
                "interaction_type": InteractionType.QUESTION.value,
                "ai_message": ai_question,
                "user_response": None,
                "response_quality": None,
                "time_taken_seconds": None,
                "difficulty_adjustment": {},
                "rag_sources": [],
                "concept_tags": [session["subject"]],
                "is_correct": None,
                "feedback_message": None,
                "created_at": datetime.now().isoformat()
            }
            
            self.supabase.table("ai_tutor_interactions").insert(interaction_data).execute()
            
            # Ažuriraj sesiju
            self.supabase.table("study_center_sessions").update({
                "questions_asked": session["questions_asked"] + 1,
                "progress_data": {
                    **session["progress_data"],
                    "current_question": session["questions_asked"] + 1
                }
            }).eq("id", session_id).execute()
            
            return {
                "status": "success",
                "message": "Pitanje uspešno generisano",
                "data": {
                    "question": ai_question,
                    "session_id": session_id,
                    "context": {
                        "subject": session["subject"],
                        "topic": session["topic"],
                        "difficulty": session["difficulty_level"],
                        "mode": session["ai_tutor_mode"]
                    }
                }
            }
            
        except Exception as e:
            return self._handle_error(e, "generisanju tutor pitanja")
    
    async def evaluate_student_response(
        self, 
        session_id: str, 
        response: str,
        interaction_id: str = None
    ) -> Dict[str, Any]:
        """Evaluira odgovor studenta"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Dohvati sesiju
            session_result = self.supabase.table("study_center_sessions").select("*").eq("id", session_id).execute()
            
            if not session_result.data:
                raise Exception("Sesija nije pronađena")
            
            session = session_result.data[0]
            
            # TODO: Implementirati AI evaluaciju odgovora
            # Za sada koristimo jednostavnu evaluaciju
            evaluation_prompt = f"""
            Evaluiraj odgovor studenta na pitanje iz {session['subject']}.
            
            Odgovor studenta: {response}
            
            Oceni:
            1. Tačnost (1-5)
            2. Kompletnost (1-5)
            3. Razumevanje (1-5)
            4. Da li je odgovor tačan (true/false)
            5. Feedback poruka
            """
            
            # Placeholder evaluacija
            response_quality = 4  # TODO: AI evaluacija
            is_correct = True  # TODO: AI evaluacija
            feedback_message = "Odličan odgovor! Pokazujete dobro razumevanje koncepta."
            
            # Sačuvaj evaluaciju
            evaluation_data = {
                "id": str(uuid.uuid4()),
                "session_id": session_id,
                "user_id": session["user_id"],
                "interaction_type": InteractionType.FEEDBACK.value,
                "ai_message": feedback_message,
                "user_response": response,
                "response_quality": response_quality,
                "time_taken_seconds": 30,  # TODO: Implementirati praćenje vremena
                "difficulty_adjustment": {},
                "rag_sources": [],
                "concept_tags": [session["subject"]],
                "is_correct": is_correct,
                "feedback_message": feedback_message,
                "created_at": datetime.now().isoformat()
            }
            
            self.supabase.table("ai_tutor_interactions").insert(evaluation_data).execute()
            
            # Ažuriraj sesiju
            new_correct_answers = session["correct_answers"] + (1 if is_correct else 0)
            self.supabase.table("study_center_sessions").update({
                "correct_answers": new_correct_answers,
                "progress_data": {
                    **session["progress_data"],
                    "correct_answers": new_correct_answers
                }
            }).eq("id", session_id).execute()
            
            # Ažuriraj knowledge tracking
            await self._update_knowledge_tracking(session["user_id"], session["subject"], session["topic"], is_correct)
            
            return {
                "status": "success",
                "message": "Odgovor uspešno evaluiran",
                "data": {
                    "evaluation": {
                        "quality": response_quality,
                        "is_correct": is_correct,
                        "feedback": feedback_message
                    },
                    "session_progress": {
                        "correct_answers": new_correct_answers,
                        "total_questions": session["questions_asked"]
                    }
                }
            }
            
        except Exception as e:
            return self._handle_error(e, "evaluaciji odgovora studenta")
    
    async def get_learning_progress(self, user_id: str) -> Dict[str, Any]:
        """Dohvata napredak učenja korisnika"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Koristi custom funkciju za napredak
            result = self.supabase.rpc(
                "get_user_study_center_progress",
                {"user_id_param": user_id}
            ).execute()
            
            if result.data:
                progress = result.data[0]
                return {
                    "status": "success",
                    "message": "Napredak uspešno dohvaćen",
                    "data": progress
                }
            else:
                return {
                    "status": "success",
                    "message": "Nema podataka o napretku",
                    "data": {
                        "total_sessions": 0,
                        "total_time_hours": 0,
                        "total_questions": 0,
                        "total_correct": 0,
                        "overall_accuracy": 0,
                        "subjects_studied": [],
                        "mastery_levels": {},
                        "weak_areas": [],
                        "strength_areas": []
                    }
                }
                
        except Exception as e:
            return self._handle_error(e, "dohvatanju napretka učenja")
    
    async def end_tutoring_session(self, session_id: str) -> Dict[str, Any]:
        """Završava tutoring sesiju"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            # Dohvati sesiju
            session_result = self.supabase.table("study_center_sessions").select("*").eq("id", session_id).execute()
            
            if not session_result.data:
                raise Exception("Sesija nije pronađena")
            
            session = session_result.data[0]
            
            # Ažuriraj sesiju
            update_data = {
                "completed_at": datetime.now().isoformat(),
                "progress_data": {
                    **session["progress_data"],
                    "session_end": datetime.now().isoformat(),
                    "total_duration": session.get("total_time_minutes", 0)
                }
            }
            
            result = self.supabase.table("study_center_sessions").update(update_data).eq("id", session_id).execute()
            
            if result.data:
                # Ažuriraj analitiku
                self.supabase.rpc(
                    "update_study_center_analytics",
                    {"user_id_param": session["user_id"]}
                ).execute()
                
                logger.info(f"Study Center sesija završena: {session_id}")
                return {
                    "status": "success",
                    "message": "Tutoring sesija uspešno završena",
                    "data": {
                        "session_id": session_id,
                        "summary": {
                            "total_questions": session["questions_asked"],
                            "correct_answers": session["correct_answers"],
                            "accuracy": round((session["correct_answers"] / max(session["questions_asked"], 1)) * 100, 2),
                            "duration_minutes": session.get("total_time_minutes", 0)
                        }
                    }
                }
            else:
                raise Exception("Greška pri završavanju sesije")
                
        except Exception as e:
            return self._handle_error(e, "završavanju tutoring sesije")
    
    async def get_concepts_for_review(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """Dohvata koncepte za review (spaced repetition)"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.rpc(
                "get_concepts_for_review",
                {"user_id_param": user_id, "limit_count": limit}
            ).execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} koncepata za review",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju koncepata za review")
    
    async def _update_knowledge_tracking(
        self, 
        user_id: str, 
        subject: str, 
        topic: str, 
        was_correct: bool,
        concept: str = None
    ) -> None:
        """Ažurira knowledge tracking za koncept"""
        try:
            if not concept:
                concept = f"{subject} - {topic}"
            
            # Dohvati postojeći koncept ili kreiraj novi
            existing = self.supabase.table("knowledge_tracking").select("*").eq("user_id", user_id).eq("subject", subject).eq("topic", topic).eq("concept", concept).execute()
            
            if existing.data:
                # Ažuriraj postojeći
                current = existing.data[0]
                new_mastery = min(current["mastery_level"] + (1 if was_correct else -1), 5)
                new_mastery = max(new_mastery, 1)
                
                # Izračunaj interval za sledeći review
                review_intervals = {1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
                next_review = date.today() + timedelta(days=review_intervals.get(new_mastery, 7))
                
                self.supabase.table("knowledge_tracking").update({
                    "mastery_level": new_mastery,
                    "review_count": current["review_count"] + 1,
                    "correct_reviews": current["correct_reviews"] + (1 if was_correct else 0),
                    "last_reviewed": datetime.now().isoformat(),
                    "next_review_date": next_review.isoformat(),
                    "updated_at": datetime.now().isoformat()
                }).eq("id", current["id"]).execute()
            else:
                # Kreiraj novi koncept
                new_concept = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "subject": subject,
                    "topic": topic,
                    "concept": concept,
                    "mastery_level": 2 if was_correct else 1,
                    "confidence_score": 0.5 if was_correct else 0.2,
                    "last_reviewed": datetime.now().isoformat(),
                    "next_review_date": (date.today() + timedelta(days=3 if was_correct else 1)).isoformat(),
                    "review_count": 1,
                    "correct_reviews": 1 if was_correct else 0,
                    "total_time_spent_minutes": 0,
                    "related_document_ids": [],
                    "learning_path": [],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                self.supabase.table("knowledge_tracking").insert(new_concept).execute()
                
        except Exception as e:
            logger.error(f"Greška pri ažuriranju knowledge tracking: {e}")
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> Dict[str, Any]:
        """Dohvata sesije korisnika"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.table("study_center_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} sesija",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju sesija korisnika")
    
    async def get_session_interactions(self, session_id: str) -> Dict[str, Any]:
        """Dohvata interakcije za sesiju"""
        try:
            if not self.supabase:
                raise Exception("Supabase nije dostupan")
            
            result = self.supabase.table("ai_tutor_interactions").select("*").eq("session_id", session_id).order("created_at", asc=True).execute()
            
            return {
                "status": "success",
                "message": f"Dohvaćeno {len(result.data)} interakcija",
                "data": result.data
            }
            
        except Exception as e:
            return self._handle_error(e, "dohvatanju interakcija sesije")

# Globalna instanca servisa
study_center_service = StudyCenterService() 