"""
Exam Service - Lokalna verzija
Upravlja exam funkcionalnostima bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .config import Config

logger = logging.getLogger(__name__)

class ExamService:
    """Exam servis za lokalni storage"""
    
    def __init__(self):
        """Inicijalizuj Exam servis"""
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'exams')
        self.exams_file = os.path.join(self.data_dir, 'exams.json')
        self.attempts_file = os.path.join(self.data_dir, 'attempts.json')
        self.results_file = os.path.join(self.data_dir, 'results.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće podatke
        self.exams = self._load_exams()
        self.attempts = self._load_attempts()
        self.results = self._load_results()
    
    def _load_exams(self) -> List[Dict[str, Any]]:
        """Učitaj examove iz lokalnog storage-a"""
        try:
            if os.path.exists(self.exams_file):
                with open(self.exams_file, 'r', encoding='utf-8') as f:
                    exams = json.load(f)
                logger.info(f"Učitano {len(exams)} examova")
                return exams
            else:
                logger.info("Nema postojećih examova")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju examova: {e}")
            return []
    
    def _save_exams(self):
        """Sačuvaj examove u lokalni storage"""
        try:
            with open(self.exams_file, 'w', encoding='utf-8') as f:
                json.dump(self.exams, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.exams)} examova")
        except Exception as e:
            logger.error(f"Greška pri čuvanju examova: {e}")
    
    def _load_attempts(self) -> List[Dict[str, Any]]:
        """Učitaj attempts iz lokalnog storage-a"""
        try:
            if os.path.exists(self.attempts_file):
                with open(self.attempts_file, 'r', encoding='utf-8') as f:
                    attempts = json.load(f)
                logger.info(f"Učitano {len(attempts)} exam attempts")
                return attempts
            else:
                logger.info("Nema postojećih exam attempts")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju exam attempts: {e}")
            return []
    
    def _save_attempts(self):
        """Sačuvaj attempts u lokalni storage"""
        try:
            with open(self.attempts_file, 'w', encoding='utf-8') as f:
                json.dump(self.attempts, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.attempts)} exam attempts")
        except Exception as e:
            logger.error(f"Greška pri čuvanju exam attempts: {e}")
    
    def _load_results(self) -> List[Dict[str, Any]]:
        """Učitaj results iz lokalnog storage-a"""
        try:
            if os.path.exists(self.results_file):
                with open(self.results_file, 'r', encoding='utf-8') as f:
                    results = json.load(f)
                logger.info(f"Učitano {len(results)} exam results")
                return results
            else:
                logger.info("Nema postojećih exam results")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju exam results: {e}")
            return []
    
    def _save_results(self):
        """Sačuvaj results u lokalni storage"""
        try:
            with open(self.results_file, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.results)} exam results")
        except Exception as e:
            logger.error(f"Greška pri čuvanju exam results: {e}")
    
    def create_exam(self, exam_data: Dict[str, Any]) -> str:
        """Kreira novi exam"""
        try:
            exam_id = f"exam_{len(self.exams)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            exam = {
                'id': exam_id,
                'title': exam_data.get('title', 'Bez naslova'),
                'description': exam_data.get('description', ''),
                'subject': exam_data.get('subject', 'Opšte'),
                'questions': exam_data.get('questions', []),
                'time_limit_minutes': exam_data.get('time_limit_minutes', 60),
                'passing_score': exam_data.get('passing_score', 70),
                'max_attempts': exam_data.get('max_attempts', 3),
                'is_active': exam_data.get('is_active', True),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': exam_data.get('metadata', {})
            }
            
            self.exams.append(exam)
            self._save_exams()
            
            logger.info(f"Exam {exam_id} uspešno kreiran")
            return exam_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju exam-a: {e}")
            raise
    
    def get_exam(self, exam_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati exam po ID-u"""
        for exam in self.exams:
            if exam['id'] == exam_id:
                return exam
        return None
    
    def update_exam(self, exam_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeći exam"""
        try:
            for exam in self.exams:
                if exam['id'] == exam_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['title', 'description', 'subject', 'questions', 'time_limit_minutes', 
                                 'passing_score', 'max_attempts', 'is_active', 'metadata']:
                            exam[key] = value
                    
                    exam['updated_at'] = datetime.now().isoformat()
                    self._save_exams()
                    
                    logger.info(f"Exam {exam_id} uspešno ažuriran")
                    return True
            
            logger.warning(f"Exam {exam_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju exam-a: {e}")
            return False
    
    def delete_exam(self, exam_id: str) -> bool:
        """Obriši exam"""
        try:
            for i, exam in enumerate(self.exams):
                if exam['id'] == exam_id:
                    removed_exam = self.exams.pop(i)
                    self._save_exams()
                    
                    logger.info(f"Exam {exam_id} uspešno obrisan")
                    return True
            
            logger.warning(f"Exam {exam_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju exam-a: {e}")
            return False
    
    def list_exams(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih examova sa opcionim filterima"""
        try:
            exams = self.exams.copy()
            
            if filters:
                # Primeni filtere
                if 'subject' in filters:
                    exams = [e for e in exams if e.get('subject') == filters['subject']]
                
                if 'is_active' in filters:
                    exams = [e for e in exams if e.get('is_active') == filters['is_active']]
                
                if 'title' in filters:
                    title_filter = filters['title'].lower()
                    exams = [e for e in exams if title_filter in e.get('title', '').lower()]
            
            # Sortiraj po datumu kreiranja (najnoviji prvi)
            exams.sort(key=lambda x: x['created_at'], reverse=True)
            
            return exams
            
        except Exception as e:
            logger.error(f"Greška pri listanju examova: {e}")
            return []
    
    def start_exam_attempt(self, exam_id: str, user_id: str = "default_user") -> str:
        """Započni novi exam attempt"""
        try:
            exam = self.get_exam(exam_id)
            if not exam:
                raise Exception(f"Exam {exam_id} nije pronađen")
            
            if not exam.get('is_active', True):
                raise Exception(f"Exam {exam_id} nije aktivan")
            
            # Proveri broj prethodnih attempts
            user_attempts = [a for a in self.attempts if a.get('exam_id') == exam_id and a.get('user_id') == user_id]
            if len(user_attempts) >= exam.get('max_attempts', 3):
                raise Exception(f"Prekoračen maksimalan broj attempts za exam {exam_id}")
            
            attempt_id = f"attempt_{len(self.attempts)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            attempt = {
                'id': attempt_id,
                'exam_id': exam_id,
                'user_id': user_id,
                'started_at': datetime.now().isoformat(),
                'status': 'in_progress',
                'answers': {},
                'score': None,
                'completed_at': None,
                'time_spent_minutes': 0,
                'metadata': {}
            }
            
            self.attempts.append(attempt)
            self._save_attempts()
            
            logger.info(f"Exam attempt {attempt_id} uspešno započet")
            return attempt_id
            
        except Exception as e:
            logger.error(f"Greška pri započinjanju exam attempt-a: {e}")
            raise
    
    def submit_exam_attempt(self, attempt_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Predaj exam attempt i izračunaj rezultat"""
        try:
            attempt = None
            for a in self.attempts:
                if a['id'] == attempt_id:
                    attempt = a
                    break
            
            if not attempt:
                raise Exception(f"Attempt {attempt_id} nije pronađen")
            
            if attempt.get('status') != 'in_progress':
                raise Exception(f"Attempt {attempt_id} nije u toku")
            
            exam = self.get_exam(attempt['exam_id'])
            if not exam:
                raise Exception(f"Exam {attempt['exam_id']} nije pronađen")
            
            # Izračunaj rezultat
            score, results = self._calculate_exam_score(exam, answers)
            
            # Ažuriraj attempt
            attempt['answers'] = answers
            attempt['score'] = score
            attempt['status'] = 'completed'
            attempt['completed_at'] = datetime.now().isoformat()
            
            # Izračunaj vreme provedeno
            start_time = datetime.fromisoformat(attempt['started_at'])
            end_time = datetime.now()
            attempt['time_spent_minutes'] = int((end_time - start_time).total_seconds() / 60)
            
            self._save_attempts()
            
            # Kreiraj result
            result_id = f"result_{len(self.results)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            result = {
                'id': result_id,
                'attempt_id': attempt_id,
                'exam_id': attempt['exam_id'],
                'user_id': attempt['user_id'],
                'score': score,
                'max_score': len(exam.get('questions', [])),
                'passing_score': exam.get('passing_score', 70),
                'passed': score >= exam.get('passing_score', 70),
                'time_spent_minutes': attempt['time_spent_minutes'],
                'completed_at': attempt['completed_at'],
                'detailed_results': results,
                'created_at': datetime.now().isoformat()
            }
            
            self.results.append(result)
            self._save_results()
            
            logger.info(f"Exam attempt {attempt_id} uspešno završen sa score-om {score}")
            
            return {
                'attempt_id': attempt_id,
                'result_id': result_id,
                'score': score,
                'max_score': len(exam.get('questions', [])),
                'passed': score >= exam.get('passing_score', 70),
                'time_spent_minutes': attempt['time_spent_minutes'],
                'detailed_results': results
            }
            
        except Exception as e:
            logger.error(f"Greška pri predaji exam attempt-a: {e}")
            raise
    
    def _calculate_exam_score(self, exam: Dict[str, Any], answers: Dict[str, Any]) -> tuple:
        """Izračunaj score za exam na osnovu odgovora"""
        questions = exam.get('questions', [])
        total_score = 0
        detailed_results = []
        
        for i, question in enumerate(questions):
            question_id = str(i)
            user_answer = answers.get(question_id, '')
            correct_answer = question.get('correct_answer', '')
            
            # Jednostavna logika za proveru odgovora
            is_correct = user_answer.lower().strip() == correct_answer.lower().strip()
            score = 1 if is_correct else 0
            total_score += score
            
            detailed_results.append({
                'question_id': question_id,
                'question_text': question.get('question', ''),
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'score': score
            })
        
        return total_score, detailed_results
    
    def get_exam_results(self, user_id: str = None, exam_id: str = None) -> List[Dict[str, Any]]:
        """Dohvati exam results"""
        results = self.results.copy()
        
        if user_id:
            results = [r for r in results if r.get('user_id') == user_id]
        
        if exam_id:
            results = [r for r in results if r.get('exam_id') == exam_id]
        
        # Sortiraj po datumu završetka (najnoviji prvi)
        results.sort(key=lambda x: x['completed_at'], reverse=True)
        
        return results
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Dohvati statistike korisnika"""
        try:
            user_results = self.get_exam_results(user_id=user_id)
            
            if not user_results:
                return {
                    'total_exams_taken': 0,
                    'total_passed': 0,
                    'average_score': 0,
                    'total_time_spent': 0,
                    'favorite_subject': None
                }
            
            total_exams = len(user_results)
            passed_exams = len([r for r in user_results if r.get('passed', False)])
            average_score = sum(r.get('score', 0) for r in user_results) / total_exams
            total_time = sum(r.get('time_spent_minutes', 0) for r in user_results)
            
            # Najčešći subject
            exam_ids = [r.get('exam_id') for r in user_results]
            subjects = []
            for exam_id in exam_ids:
                exam = self.get_exam(exam_id)
                if exam:
                    subjects.append(exam.get('subject', 'Opšte'))
            
            favorite_subject = max(set(subjects), key=subjects.count) if subjects else None
            
            return {
                'total_exams_taken': total_exams,
                'total_passed': passed_exams,
                'pass_rate': (passed_exams / total_exams) * 100 if total_exams > 0 else 0,
                'average_score': round(average_score, 2),
                'total_time_spent': total_time,
                'favorite_subject': favorite_subject
            }
            
        except Exception as e:
            logger.error(f"Greška pri dohvatanju korisničkih statistika: {e}")
            return {}
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike exam sistema"""
        try:
            return {
                'total_exams': len(self.exams),
                'total_attempts': len(self.attempts),
                'total_results': len(self.results),
                'active_exams': len([e for e in self.exams if e.get('is_active', True)]),
                'completed_attempts': len([a for a in self.attempts if a.get('status') == 'completed']),
                'average_score': sum(r.get('score', 0) for r in self.results) / len(self.results) if self.results else 0,
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju exam statistika: {e}")
            return {}

# Globalna instanca
exam_service = ExamService()

def get_exam_service() -> ExamService:
    """Dohvati globalnu instancu exam servisa"""
    return exam_service 