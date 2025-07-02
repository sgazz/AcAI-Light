"""
Exam Simulation Service
Upravlja kreiranjem, pokretanjem i ocenjivanjem ispita
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class QuestionType(Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    MATCHING = "matching"

class ExamStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class Question:
    """Reprezentuje jedno pitanje u ispitu"""
    
    def __init__(self, 
                 question_id: str = None,
                 question_text: str = "",
                 question_type: QuestionType = QuestionType.MULTIPLE_CHOICE,
                 options: List[str] = None,
                 correct_answer: Any = None,
                 explanation: str = "",
                 points: int = 1,
                 difficulty: str = "medium",
                 subject: str = "",
                 tags: List[str] = None):
        
        self.question_id = question_id or str(uuid.uuid4())
        self.question_text = question_text
        self.question_type = question_type
        self.options = options or []
        self.correct_answer = correct_answer
        self.explanation = explanation
        self.points = points
        self.difficulty = difficulty
        self.subject = subject
        self.tags = tags or []
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertuj u dictionary za JSON serializaciju"""
        return {
            "question_id": self.question_id,
            "question_text": self.question_text,
            "question_type": self.question_type.value,
            "options": self.options,
            "correct_answer": self.correct_answer,
            "explanation": self.explanation,
            "points": self.points,
            "difficulty": self.difficulty,
            "subject": self.subject,
            "tags": self.tags,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Question':
        """Kreiraj Question iz dictionary-a"""
        return cls(
            question_id=data.get("question_id"),
            question_text=data.get("question_text", ""),
            question_type=QuestionType(data.get("question_type", "multiple_choice")),
            options=data.get("options", []),
            correct_answer=data.get("correct_answer"),
            explanation=data.get("explanation", ""),
            points=data.get("points", 1),
            difficulty=data.get("difficulty", "medium"),
            subject=data.get("subject", ""),
            tags=data.get("tags", [])
        )

class Exam:
    """Reprezentuje jedan ispit"""
    
    def __init__(self,
                 exam_id: str = None,
                 title: str = "",
                 description: str = "",
                 subject: str = "",
                 duration_minutes: int = 60,
                 total_points: int = 100,
                 passing_score: int = 70,
                 questions: List[Question] = None,
                 status: ExamStatus = ExamStatus.DRAFT,
                 created_by: str = "",
                 is_public: bool = False,
                 allow_retakes: bool = True,
                 max_attempts: int = 3):
        
        self.exam_id = exam_id or str(uuid.uuid4())
        self.title = title
        self.description = description
        self.subject = subject
        self.duration_minutes = duration_minutes
        self.total_points = total_points
        self.passing_score = passing_score
        self.questions = questions or []
        self.status = status
        self.created_by = created_by
        self.is_public = is_public
        self.allow_retakes = allow_retakes
        self.max_attempts = max_attempts
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertuj u dictionary za JSON serializaciju"""
        return {
            "exam_id": self.exam_id,
            "title": self.title,
            "description": self.description,
            "subject": self.subject,
            "duration_minutes": self.duration_minutes,
            "total_points": self.total_points,
            "passing_score": self.passing_score,
            "questions": [q.to_dict() for q in self.questions],
            "status": self.status.value,
            "created_by": self.created_by,
            "is_public": self.is_public,
            "allow_retakes": self.allow_retakes,
            "max_attempts": self.max_attempts,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Exam':
        """Kreiraj Exam iz dictionary-a"""
        questions = [Question.from_dict(q) for q in data.get("questions", [])]
        return cls(
            exam_id=data.get("exam_id"),
            title=data.get("title", ""),
            description=data.get("description", ""),
            subject=data.get("subject", ""),
            duration_minutes=data.get("duration_minutes", 60),
            total_points=data.get("total_points", 100),
            passing_score=data.get("passing_score", 70),
            questions=questions,
            status=ExamStatus(data.get("status", "draft")),
            created_by=data.get("created_by", ""),
            is_public=data.get("is_public", False),
            allow_retakes=data.get("allow_retakes", True),
            max_attempts=data.get("max_attempts", 3)
        )

class ExamAttempt:
    """Reprezentuje pokušaj polaganja ispita"""
    
    def __init__(self,
                 attempt_id: str = None,
                 exam_id: str = "",
                 user_id: str = "",
                 username: str = "",
                 start_time: datetime = None,
                 end_time: datetime = None,
                 answers: Dict[str, Any] = None,
                 score: int = 0,
                 total_points: int = 0,
                 percentage: float = 0.0,
                 passed: bool = False,
                 time_taken_minutes: int = 0):
        
        self.attempt_id = attempt_id or str(uuid.uuid4())
        self.exam_id = exam_id
        self.user_id = user_id
        self.username = username
        self.start_time = start_time or datetime.now()
        self.end_time = end_time
        self.answers = answers or {}
        self.score = score
        self.total_points = total_points
        self.percentage = percentage
        self.passed = passed
        self.time_taken_minutes = time_taken_minutes
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertuj u dictionary za JSON serializaciju"""
        return {
            "attempt_id": self.attempt_id,
            "exam_id": self.exam_id,
            "user_id": self.user_id,
            "username": self.username,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "answers": self.answers,
            "score": self.score,
            "total_points": self.total_points,
            "percentage": self.percentage,
            "passed": self.passed,
            "time_taken_minutes": self.time_taken_minutes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExamAttempt':
        """Kreiraj ExamAttempt iz dictionary-a"""
        start_time = datetime.fromisoformat(data["start_time"]) if data.get("start_time") else None
        end_time = datetime.fromisoformat(data["end_time"]) if data.get("end_time") else None
        
        return cls(
            attempt_id=data.get("attempt_id"),
            exam_id=data.get("exam_id", ""),
            user_id=data.get("user_id", ""),
            username=data.get("username", ""),
            start_time=start_time,
            end_time=end_time,
            answers=data.get("answers", {}),
            score=data.get("score", 0),
            total_points=data.get("total_points", 0),
            percentage=data.get("percentage", 0.0),
            passed=data.get("passed", False),
            time_taken_minutes=data.get("time_taken_minutes", 0)
        )

class ExamService:
    """Glavni servis za upravljanje ispitima"""
    
    def __init__(self, supabase_manager=None):
        self.supabase_manager = supabase_manager
        self.active_attempts: Dict[str, ExamAttempt] = {}
    
    async def create_exam(self, exam_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kreiraj novi ispit"""
        try:
            exam = Exam.from_dict(exam_data)
            
            if self.supabase_manager:
                exam_dict = exam.to_dict()
                result = self.supabase_manager.client.table("exams").insert(exam_dict).execute()
                
                if result.data:
                    logger.info(f"✅ Ispit kreiran: {exam.exam_id}")
                    return {
                        "status": "success",
                        "exam": result.data[0],
                        "message": "Ispit uspešno kreiran"
                    }
            
            return {
                "status": "success",
                "exam": exam.to_dict(),
                "message": "Ispit kreiran (offline mode)"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri kreiranju ispita: {e}")
            return {
                "status": "error",
                "message": f"Greška pri kreiranju ispita: {str(e)}"
            }
    
    async def get_exam(self, exam_id: str) -> Dict[str, Any]:
        """Dohvati ispit po ID-u"""
        try:
            if self.supabase_manager:
                result = self.supabase_manager.client.table("exams").select("*").eq("exam_id", exam_id).execute()
                
                if result.data:
                    exam = Exam.from_dict(result.data[0])
                    return {
                        "status": "success",
                        "exam": exam.to_dict(),
                        "message": "Ispit pronađen"
                    }
            
            return {
                "status": "error",
                "message": "Ispit nije pronađen"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri dohvatanju ispita: {e}")
            return {
                "status": "error",
                "message": f"Greška pri dohvatanju ispita: {str(e)}"
            }
    
    async def list_exams(self, user_id: str = None, subject: str = None) -> Dict[str, Any]:
        """Listaj sve ispite"""
        try:
            if self.supabase_manager:
                query = self.supabase_manager.client.table("exams").select("*")
                
                if user_id and user_id != "list":
                    query = query.eq("created_by", user_id)
                
                if subject:
                    query = query.eq("subject", subject)
                
                result = query.execute()
                
                return {
                    "status": "success",
                    "exams": result.data,
                    "message": f"Pronađeno {len(result.data)} ispita"
                }
            
            return {
                "status": "success",
                "exams": [],
                "message": "Nema dostupnih ispita"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri listanju ispita: {e}")
            return {
                "status": "error",
                "message": f"Greška pri listanju ispita: {str(e)}"
            }
    
    async def start_exam_attempt(self, exam_id: str, user_id: str, username: str) -> Dict[str, Any]:
        """Započni pokušaj polaganja ispita"""
        try:
            # Dohvati ispit
            exam_result = await self.get_exam(exam_id)
            if exam_result["status"] != "success":
                return exam_result
            
            exam = Exam.from_dict(exam_result["exam"])
            
            # Proveri da li korisnik može da polaže ispit
            if not exam.is_public and exam.created_by != user_id:
                return {
                    "status": "error",
                    "message": "Nemate pristup ovom ispitu"
                }
            
            # Proveri broj pokušaja
            attempts_result = await self.get_user_attempts(exam_id, user_id)
            if attempts_result["status"] == "success":
                attempts_count = len(attempts_result["attempts"])
                if attempts_count >= exam.max_attempts:
                    return {
                        "status": "error",
                        "message": f"Dostigli ste maksimalan broj pokušaja ({exam.max_attempts})"
                    }
            
            # Kreiraj novi pokušaj
            attempt = ExamAttempt(
                exam_id=exam_id,
                user_id=user_id,
                username=username,
                total_points=exam.total_points
            )
            
            # Sačuvaj u bazu
            if self.supabase_manager:
                attempt_dict = attempt.to_dict()
                result = self.supabase_manager.client.table("exam_attempts").insert(attempt_dict).execute()
                
                if result.data:
                    attempt = ExamAttempt.from_dict(result.data[0])
            
            # Dodaj u aktivne pokušaje
            self.active_attempts[attempt.attempt_id] = attempt
            
            logger.info(f"✅ Pokušaj započet: {attempt.attempt_id}")
            return {
                "status": "success",
                "attempt": attempt.to_dict(),
                "exam": exam.to_dict(),
                "message": "Pokušaj uspešno započet"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri započinjanju pokušaja: {e}")
            return {
                "status": "error",
                "message": f"Greška pri započinjanju pokušaja: {str(e)}"
            }
    
    async def submit_answer(self, attempt_id: str, question_id: str, answer: Any) -> Dict[str, Any]:
        """Predaj odgovor na pitanje"""
        try:
            if attempt_id not in self.active_attempts:
                return {
                    "status": "error",
                    "message": "Aktivni pokušaj nije pronađen"
                }
            
            attempt = self.active_attempts[attempt_id]
            attempt.answers[question_id] = answer
            
            # Ažuriraj u bazi
            if self.supabase_manager:
                self.supabase_manager.client.table("exam_attempts").update({
                    "answers": attempt.answers
                }).eq("attempt_id", attempt_id).execute()
            
            return {
                "status": "success",
                "message": "Odgovor uspešno predat"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri predaji odgovora: {e}")
            return {
                "status": "error",
                "message": f"Greška pri predaji odgovora: {str(e)}"
            }
    
    async def finish_exam_attempt(self, attempt_id: str) -> Dict[str, Any]:
        """Završi pokušaj polaganja ispita"""
        try:
            if attempt_id not in self.active_attempts:
                return {
                    "status": "error",
                    "message": "Aktivni pokušaj nije pronađen"
                }
            
            attempt = self.active_attempts[attempt_id]
            attempt.end_time = datetime.now()
            
            # Izračunaj vreme
            time_diff = attempt.end_time - attempt.start_time
            attempt.time_taken_minutes = int(time_diff.total_seconds() / 60)
            
            # Dohvati ispit za ocenjivanje
            exam_result = await self.get_exam(attempt.exam_id)
            if exam_result["status"] != "success":
                return exam_result
            
            exam = Exam.from_dict(exam_result["exam"])
            
            # Ocenjivanje
            score, total_points = await self._grade_exam(attempt, exam)
            attempt.score = score
            attempt.total_points = total_points
            attempt.percentage = (score / total_points * 100) if total_points > 0 else 0
            attempt.passed = attempt.percentage >= exam.passing_score
            
            # Sačuvaj rezultate
            if self.supabase_manager:
                self.supabase_manager.client.table("exam_attempts").update({
                    "end_time": attempt.end_time.isoformat(),
                    "answers": attempt.answers,
                    "score": attempt.score,
                    "total_points": attempt.total_points,
                    "percentage": attempt.percentage,
                    "passed": attempt.passed,
                    "time_taken_minutes": attempt.time_taken_minutes
                }).eq("attempt_id", attempt_id).execute()
            
            # Ukloni iz aktivnih pokušaja
            del self.active_attempts[attempt_id]
            
            logger.info(f"✅ Pokušaj završen: {attempt_id}, Rezultat: {attempt.percentage:.1f}%")
            return {
                "status": "success",
                "attempt": attempt.to_dict(),
                "message": "Pokušaj uspešno završen"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri završavanju pokušaja: {e}")
            return {
                "status": "error",
                "message": f"Greška pri završavanju pokušaja: {str(e)}"
            }
    
    async def _grade_exam(self, attempt: ExamAttempt, exam: Exam) -> tuple[int, int]:
        """Ocenjivanje ispita"""
        score = 0
        total_points = 0
        
        for question in exam.questions:
            total_points += question.points
            
            if question.question_id in attempt.answers:
                user_answer = attempt.answers[question.question_id]
                
                if question.question_type == QuestionType.MULTIPLE_CHOICE:
                    if user_answer == question.correct_answer:
                        score += question.points
                
                elif question.question_type == QuestionType.TRUE_FALSE:
                    if user_answer == question.correct_answer:
                        score += question.points
                
                elif question.question_type == QuestionType.SHORT_ANSWER:
                    # Jednostavno poređenje teksta
                    if str(user_answer).lower().strip() == str(question.correct_answer).lower().strip():
                        score += question.points
                
                # Za essay i matching pitanja treba AI ocenjivanje
                elif question.question_type in [QuestionType.ESSAY, QuestionType.MATCHING]:
                    # TODO: Implementirati AI ocenjivanje
                    pass
        
        return score, total_points
    
    async def get_user_attempts(self, exam_id: str, user_id: str) -> Dict[str, Any]:
        """Dohvati sve pokušaje korisnika za određeni ispit"""
        try:
            if self.supabase_manager:
                result = self.supabase_manager.client.table("exam_attempts").select("*").eq("exam_id", exam_id).eq("user_id", user_id).execute()
                
                return {
                    "status": "success",
                    "attempts": result.data,
                    "message": f"Pronađeno {len(result.data)} pokušaja"
                }
            
            return {
                "status": "success",
                "attempts": [],
                "message": "Nema pokušaja"
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri dohvatanju pokušaja: {e}")
            return {
                "status": "error",
                "message": f"Greška pri dohvatanju pokušaja: {str(e)}"
            }
    
    async def generate_ai_questions(self, subject: str, topic: str, count: int = 10, difficulty: str = "medium") -> List[Question]:
        """Generiši pitanja pomoću AI-a"""
        try:
            # TODO: Implementirati AI generisanje pitanja
            # Ovo će koristiti Ollama model za generisanje pitanja
            questions = []
            
            # Placeholder implementacija
            for i in range(count):
                question = Question(
                    question_text=f"AI generisano pitanje {i+1} za {subject} - {topic}",
                    question_type=QuestionType.MULTIPLE_CHOICE,
                    options=["Opcija A", "Opcija B", "Opcija C", "Opcija D"],
                    correct_answer="Opcija A",
                    explanation="AI generisano objašnjenje",
                    points=1,
                    difficulty=difficulty,
                    subject=subject,
                    tags=[topic, difficulty]
                )
                questions.append(question)
            
            return questions
            
        except Exception as e:
            logger.error(f"❌ Greška pri AI generisanju pitanja: {e}")
            return []

# Globalna instanca servisa
exam_service = None

async def get_exam_service() -> ExamService:
    """Dohvati globalnu instancu ExamService-a"""
    global exam_service
    if exam_service is None:
        from .supabase_client import get_supabase_manager
        supabase_manager = get_supabase_manager()
        exam_service = ExamService(supabase_manager)
    return exam_service 