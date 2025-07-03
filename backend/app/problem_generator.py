#!/usr/bin/env python3
"""
Problem Generator Service
AI-powered generisanje problema za studente
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
from ollama import Client

# Supabase integracija
try:
    from .supabase_client import get_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ Supabase nije dostupan - problemi se neće čuvati u bazi")

logger = logging.getLogger(__name__)

class Subject(Enum):
    """Podržani predmeti"""
    MATHEMATICS = "mathematics"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    PROGRAMMING = "programming"

class Difficulty(Enum):
    """Nivoi težine"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class ProblemType(Enum):
    """Tipovi problema"""
    MULTIPLE_CHOICE = "multiple_choice"
    OPEN_ENDED = "open_ended"
    STEP_BY_STEP = "step_by_step"
    TRUE_FALSE = "true_false"
    FILL_IN_BLANK = "fill_in_blank"

@dataclass
class ProblemTemplate:
    """Šablon za generisanje problema"""
    subject: Subject
    topic: str
    difficulty: Difficulty
    problem_type: ProblemType
    template: str
    parameters: Dict[str, Any]
    solution_template: str
    hints: List[str]
    tags: List[str]

@dataclass
class GeneratedProblem:
    """Generisan problem"""
    problem_id: str
    subject: Subject
    topic: str
    difficulty: Difficulty
    problem_type: ProblemType
    question: str
    options: List[str] = None
    correct_answer: Any = None
    solution: str = None
    hints: List[str] = None
    explanation: str = None
    tags: List[str] = None
    created_at: datetime = None

class ProblemGenerator:
    """Glavna klasa za generisanje problema"""
    
    def __init__(self, ollama_client: Client = None):
        self.ollama_client = ollama_client or Client(host="http://localhost:11434")
        self.templates = self._load_templates()
        
        # Supabase integracija
        self.supabase_manager = None
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                logger.info("✅ Supabase povezivanje uspešno za Problem Generator")
            except Exception as e:
                logger.warning(f"⚠️ Greška pri povezivanju sa Supabase: {e}")
                self.supabase_manager = None
        
    def _load_templates(self) -> Dict[str, ProblemTemplate]:
        """Učitaj šablone za probleme"""
        templates = {}
        
        # Matematika - Algebra
        templates["math_algebra_equation"] = ProblemTemplate(
            subject=Subject.MATHEMATICS,
            topic="Algebra",
            difficulty=Difficulty.BEGINNER,
            problem_type=ProblemType.OPEN_ENDED,
            template="Reši jednačinu: {equation}",
            parameters={
                "equation": ["2x + 5 = 13", "3x - 7 = 8", "5x + 2 = 17", "x/2 + 3 = 7"]
            },
            solution_template="Korak 1: Oduzmi {constant} sa obe strane\nKorak 2: Podeli sa {coefficient}\nRešenje: x = {solution}",
            hints=["Prvo izoluj x", "Koristi inverzne operacije"],
            tags=["algebra", "jednačine", "linearne"]
        )
        
        # Matematika - Geometrija
        templates["math_geometry_area"] = ProblemTemplate(
            subject=Subject.MATHEMATICS,
            topic="Geometrija",
            difficulty=Difficulty.BEGINNER,
            problem_type=ProblemType.OPEN_ENDED,
            template="Izračunaj površinu {shape} sa {dimensions}",
            parameters={
                "shape": ["pravougaonika", "kvadrata", "trougla", "kruga"],
                "dimensions": [
                    "dužinom {length} i širinom {width}",
                    "stranicom {side}",
                    "osnovicom {base} i visinom {height}",
                    "poluprečnikom {radius}"
                ]
            },
            solution_template="Formula: {formula}\nZameni vrednosti: {substitution}\nRešenje: {solution}",
            hints=["Koristi odgovarajuću formulu", "Proveri jedinice"],
            tags=["geometrija", "površina", "formule"]
        )
        
        # Fizika - Mehanika
        templates["physics_mechanics_kinematics"] = ProblemTemplate(
            subject=Subject.PHYSICS,
            topic="Mehanika",
            difficulty=Difficulty.BEGINNER,
            problem_type=ProblemType.OPEN_ENDED,
            template="Telo se kreće sa početnom brzinom {v0} m/s i ubrzanjem {a} m/s². Kolika je brzina nakon {t} sekundi?",
            parameters={
                "v0": [0, 5, 10, 15],
                "a": [2, 3, 4, 5],
                "t": [2, 3, 4, 5]
            },
            solution_template="Formula: v = v₀ + at\nZameni: v = {v0} + {a} × {t}\nRešenje: v = {solution} m/s",
            hints=["Koristi kinematičku formulu", "Proveri jedinice"],
            tags=["fizika", "kinematika", "brzina"]
        )
        
        # Hemija - Stehiometrija
        templates["chemistry_stoichiometry"] = ProblemTemplate(
            subject=Subject.CHEMISTRY,
            topic="Stehiometrija",
            difficulty=Difficulty.INTERMEDIATE,
            problem_type=ProblemType.OPEN_ENDED,
            template="Koliko grama {product} se dobija iz {mass} g {reactant}?",
            parameters={
                "reactant": ["NaOH", "HCl", "H₂SO₄", "Na₂CO₃"],
                "product": ["NaCl", "H₂O", "Na₂SO₄", "CO₂"],
                "mass": [10, 20, 30, 40]
            },
            solution_template="Korak 1: Napiši jednačinu\nKorak 2: Izračunaj molove\nKorak 3: Koristi stehiometriju\nRešenje: {solution} g",
            hints=["Prvo napiši hemijsku jednačinu", "Koristi molove"],
            tags=["hemija", "stehiometrija", "reakcije"]
        )
        
        # Programiranje - Algoritmi
        templates["programming_algorithms"] = ProblemTemplate(
            subject=Subject.PROGRAMMING,
            topic="Algoritmi",
            difficulty=Difficulty.BEGINNER,
            problem_type=ProblemType.OPEN_ENDED,
            template="Napiši algoritam za {task}",
            parameters={
                "task": [
                    "pronalaženje maksimuma u nizu",
                    "sortiranje niza brojeva",
                    "proveru da li je broj prost",
                    "računanje faktorijela"
                ]
            },
            solution_template="Pseudokod:\n{algorithm}\n\nImplementacija:\n{code}",
            hints=["Razmisli o koracima", "Koristi petlje i uslove"],
            tags=["programiranje", "algoritmi", "logika"]
        )
        
        return templates
    
    def generate_problem(
        self,
        subject: Subject,
        topic: str = None,
        difficulty: Difficulty = Difficulty.BEGINNER,
        problem_type: ProblemType = None
    ) -> GeneratedProblem:
        """Generiši problem na osnovu parametara"""
        try:
            # Odaberi odgovarajući šablon
            template = self._select_template(subject, topic, difficulty, problem_type)
            if not template:
                raise ValueError(f"Nema dostupnih šablona za {subject.value}, {topic}, {difficulty.value}")
            
            # Generiši problem koristeći AI
            generated_problem = self._generate_with_ai(template)
            
            # Kreiraj problem objekat
            problem = GeneratedProblem(
                problem_id=str(uuid.uuid4()),
                subject=template.subject,
                topic=template.topic,
                difficulty=template.difficulty,
                problem_type=template.problem_type,
                question=generated_problem["question"],
                options=generated_problem.get("options"),
                correct_answer=generated_problem.get("correct_answer"),
                solution=generated_problem.get("solution"),
                hints=template.hints,
                explanation=generated_problem.get("explanation"),
                tags=template.tags,
                created_at=datetime.now(timezone.utc)
            )
            
            # Sačuvaj problem u bazu
            self.save_problem_to_database(problem)
            
            logger.info(f"✅ Problem generisan: {problem.problem_id}")
            return problem
            
        except Exception as e:
            logger.error(f"❌ Greška pri generisanju problema: {e}")
            raise
    
    def _select_template(
        self,
        subject: Subject,
        topic: str = None,
        difficulty: Difficulty = Difficulty.BEGINNER,
        problem_type: ProblemType = None
    ) -> Optional[ProblemTemplate]:
        """Odaberi odgovarajući šablon"""
        available_templates = []
        
        for template in self.templates.values():
            if template.subject == subject:
                if topic and template.topic.lower() != topic.lower():
                    continue
                if difficulty and template.difficulty != difficulty:
                    continue
                if problem_type and template.problem_type != problem_type:
                    continue
                available_templates.append(template)
        
        if not available_templates:
            return None
        
        # Za sada vraćamo prvi dostupan, kasnije možemo dodati random odabir
        return available_templates[0]
    
    def _generate_with_ai(self, template: ProblemTemplate) -> Dict[str, Any]:
        """Generiši problem koristeći AI"""
        try:
            # Kreiraj prompt za AI
            prompt = self._create_generation_prompt(template)
            
            # Pozovi AI model
            response = self.ollama_client.chat(
                model="mistral:latest",
                messages=[
                    {
                        "role": "system",
                        "content": "Ti si ekspert za kreiranje edukativnih problema. Kreiraj probleme koji su jasni, tačni i edukativni."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                stream=False
            )
            
            # Parsiraj odgovor
            content = response.get("message", {}).get("content", "")
            return self._parse_ai_response(content, template)
            
        except Exception as e:
            logger.error(f"❌ Greška pri AI generisanju: {e}")
            # Fallback na statički generisan problem
            return self._generate_static_problem(template)
    
    def _create_generation_prompt(self, template: ProblemTemplate) -> str:
        """Kreiraj prompt za AI generisanje"""
        return f"""
Kreiraj edukativni problem za {template.subject.value} - {template.topic} na nivou {template.difficulty.value}.

Šablon: {template.template}
Tip problema: {template.problem_type.value}

Parametri za varijaciju:
{json.dumps(template.parameters, indent=2)}

Kreiraj problem u JSON formatu:
{{
    "question": "pitanje",
    "options": ["opcija1", "opcija2", ...],  // ako je multiple choice
    "correct_answer": "tačan odgovor",
    "solution": "korak-po-korak rešenje",
    "explanation": "objašnjenje rešenja"
}}

Problem treba da bude:
- Jasno formulisan
- Na odgovarajućem nivou težine
- Sa tačnim rešenjem
- Edukativan i koristan za studente
"""
    
    def _parse_ai_response(self, content: str, template: ProblemTemplate) -> Dict[str, Any]:
        """Parsiraj AI odgovor"""
        try:
            # Pokušaj da pronađeš JSON u odgovoru
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # Fallback ako nema JSON
                return self._generate_static_problem(template)
                
        except json.JSONDecodeError:
            logger.warning("AI odgovor nije validan JSON, koristim fallback")
            return self._generate_static_problem(template)
    
    def _generate_static_problem(self, template: ProblemTemplate) -> Dict[str, Any]:
        """Generiši statički problem kao fallback"""
        import random
        
        # Za sada koristimo jednostavan pristup
        if template.subject == Subject.MATHEMATICS:
            if "algebra" in template.topic.lower():
                a = random.randint(1, 10)
                b = random.randint(1, 10)
                c = random.randint(1, 20)
                equation = f"{a}x + {b} = {c}"
                solution = (c - b) / a
                
                return {
                    "question": f"Reši jednačinu: {equation}",
                    "correct_answer": solution,
                    "solution": f"Korak 1: Oduzmi {b} sa obe strane\n{equation} → {a}x = {c-b}\nKorak 2: Podeli sa {a}\nx = {solution}",
                    "explanation": f"Rešenje je x = {solution}. Možemo proveriti zamenom u originalnu jednačinu."
                }
        
        # Fallback za ostale predmete
        return {
            "question": f"Problem iz {template.topic}",
            "correct_answer": "Odgovor",
            "solution": "Korak-po-korak rešenje",
            "explanation": "Objašnjenje rešenja"
        }
    
    def validate_answer(
        self, 
        problem: GeneratedProblem, 
        user_answer: Any,
        user_id: str = "anonymous",
        username: str = "Anonymous",
        time_taken_seconds: int = 0,
        hints_used: int = 0,
        solution_viewed: bool = False
    ) -> Dict[str, Any]:
        """Validiraj odgovor korisnika"""
        try:
            is_correct = False
            feedback = ""
            
            if problem.problem_type == ProblemType.MULTIPLE_CHOICE:
                is_correct = str(user_answer).strip().lower() == str(problem.correct_answer).strip().lower()
            elif problem.problem_type == ProblemType.TRUE_FALSE:
                is_correct = str(user_answer).strip().lower() == str(problem.correct_answer).strip().lower()
            else:
                # Za open-ended probleme, pokušaj numeričku proveru
                try:
                    user_num = float(user_answer)
                    correct_num = float(problem.correct_answer)
                    is_correct = abs(user_num - correct_num) < 0.01  # Tolerancija
                except:
                    # Ako nije numerički, poredi stringove
                    is_correct = str(user_answer).strip().lower() == str(problem.correct_answer).strip().lower()
            
            if is_correct:
                feedback = "Odlično! Vaš odgovor je tačan."
            else:
                feedback = f"Vaš odgovor nije tačan. Tačan odgovor je: {problem.correct_answer}"
            
            # Sačuvaj pokušaj u bazu
            self.save_attempt_to_database(
                problem_id=problem.problem_id,
                user_id=user_id,
                username=username,
                user_answer=str(user_answer),
                is_correct=is_correct,
                time_taken_seconds=time_taken_seconds,
                hints_used=hints_used,
                solution_viewed=solution_viewed
            )
            
            return {
                "is_correct": is_correct,
                "feedback": feedback,
                "correct_answer": problem.correct_answer,
                "explanation": problem.explanation
            }
            
        except Exception as e:
            logger.error(f"❌ Greška pri validaciji odgovora: {e}")
            return {
                "is_correct": False,
                "feedback": "Greška pri proveri odgovora",
                "correct_answer": problem.correct_answer,
                "explanation": problem.explanation
            }
    
    def get_available_subjects(self) -> List[Dict[str, Any]]:
        """Vrati listu dostupnih predmeta"""
        subjects = {}
        
        for template in self.templates.values():
            subject_key = template.subject.value
            if subject_key not in subjects:
                subjects[subject_key] = {
                    "name": template.subject.value.title(),
                    "topics": [],
                    "difficulties": [],
                    "problem_types": []
                }
            
            if template.topic not in subjects[subject_key]["topics"]:
                subjects[subject_key]["topics"].append(template.topic)
            
            if template.difficulty not in subjects[subject_key]["difficulties"]:
                subjects[subject_key]["difficulties"].append(template.difficulty.value)
            
            if template.problem_type not in subjects[subject_key]["problem_types"]:
                subjects[subject_key]["problem_types"].append(template.problem_type.value)
        
        return list(subjects.values())
    
    # Supabase integracija metode
    def save_problem_to_database(self, problem: GeneratedProblem) -> Optional[str]:
        """Sačuvaj problem u Supabase bazu"""
        if not self.supabase_manager:
            logger.warning("Supabase nije dostupan - problem se ne čuva")
            return None
        
        try:
            problem_data = {
                'problem_id': problem.problem_id,
                'subject': problem.subject.value,
                'topic': problem.topic,
                'difficulty': problem.difficulty.value,
                'problem_type': problem.problem_type.value,
                'question': problem.question,
                'options': problem.options or [],
                'correct_answer': str(problem.correct_answer) if problem.correct_answer else None,
                'solution': problem.solution,
                'hints': problem.hints or [],
                'explanation': problem.explanation,
                'tags': problem.tags or [],
                'ai_generated': True,
                'created_by': 'system'
            }
            
            result = self.supabase_manager.client.table('problems').insert(problem_data).execute()
            logger.info(f"✅ Problem sačuvan u bazu sa ID: {problem.problem_id}")
            return problem.problem_id
            
        except Exception as e:
            logger.error(f"❌ Greška pri čuvanju problema u bazu: {e}")
            return None
    
    def get_problems_from_database(
        self,
        subject: str = None,
        topic: str = None,
        difficulty: str = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Dohvati probleme iz Supabase baze"""
        if not self.supabase_manager:
            logger.warning("Supabase nije dostupan - vraćam praznu listu")
            return []
        
        try:
            query = self.supabase_manager.client.table('problems').select('*')
            
            if subject:
                query = query.eq('subject', subject)
            if topic:
                query = query.eq('topic', topic)
            if difficulty:
                query = query.eq('difficulty', difficulty)
            
            result = query.order('created_at', desc=True).limit(limit).execute()
            logger.info(f"✅ Dohvaćeno {len(result.data)} problema iz baze")
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Greška pri dohvatanju problema iz baze: {e}")
            return []
    
    def save_attempt_to_database(
        self,
        problem_id: str,
        user_id: str,
        username: str,
        user_answer: str,
        is_correct: bool,
        time_taken_seconds: int = 0,
        hints_used: int = 0,
        solution_viewed: bool = False
    ) -> Optional[str]:
        """Sačuvaj pokušaj rešavanja u bazu"""
        if not self.supabase_manager:
            logger.warning("Supabase nije dostupan - pokušaj se ne čuva")
            return None
        
        try:
            attempt_data = {
                'problem_id': problem_id,
                'user_id': user_id,
                'username': username,
                'user_answer': user_answer,
                'is_correct': is_correct,
                'time_taken_seconds': time_taken_seconds,
                'hints_used': hints_used,
                'solution_viewed': solution_viewed
            }
            
            result = self.supabase_manager.client.table('problem_attempts').insert(attempt_data).execute()
            logger.info(f"✅ Pokušaj sačuvan u bazu")
            return result.data[0]['attempt_id'] if result.data else None
            
        except Exception as e:
            logger.error(f"❌ Greška pri čuvanju pokušaja u bazu: {e}")
            return None
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Dohvati korisničke statistike"""
        if not self.supabase_manager:
            return {
                'total_problems_attempted': 0,
                'total_problems_correct': 0,
                'total_time_spent_seconds': 0,
                'accuracy_percentage': 0.0
            }
        
        try:
            result = self.supabase_manager.client.table('user_problem_stats').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                stats = result.data[0]
                accuracy = (stats['total_problems_correct'] / stats['total_problems_attempted'] * 100) if stats['total_problems_attempted'] > 0 else 0
                return {
                    'total_problems_attempted': stats['total_problems_attempted'],
                    'total_problems_correct': stats['total_problems_correct'],
                    'total_time_spent_seconds': stats['total_time_spent_seconds'],
                    'accuracy_percentage': round(accuracy, 2),
                    'current_streak': stats['current_streak'],
                    'longest_streak': stats['longest_streak']
                }
            else:
                return {
                    'total_problems_attempted': 0,
                    'total_problems_correct': 0,
                    'total_time_spent_seconds': 0,
                    'accuracy_percentage': 0.0,
                    'current_streak': 0,
                    'longest_streak': 0
                }
                
        except Exception as e:
            logger.error(f"❌ Greška pri dohvatanju korisničkih statistika: {e}")
            return {
                'total_problems_attempted': 0,
                'total_problems_correct': 0,
                'total_time_spent_seconds': 0,
                'accuracy_percentage': 0.0
            }

# Globalna instanca
problem_generator = ProblemGenerator()

def get_problem_generator() -> ProblemGenerator:
    """Dohvati globalnu instancu Problem Generator-a"""
    return problem_generator 