"""
Problem Generator Service - Lokalna verzija
Generiše probleme bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from .config import Config

logger = logging.getLogger(__name__)

class Subject(str, Enum):
    MATHEMATICS = "mathematics"
    PHYSICS = "physics"
    CHEMISTRY = "chemistry"
    BIOLOGY = "biology"
    COMPUTER_SCIENCE = "computer_science"
    GENERAL = "general"

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class ProblemType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    CALCULATION = "calculation"
    TRUE_FALSE = "true_false"

class ProblemGenerator:
    """Problem Generator servis za lokalni storage"""
    
    def __init__(self):
        """Inicijalizuj Problem Generator servis"""
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'problems')
        self.problems_file = os.path.join(self.data_dir, 'problems.json')
        self.templates_file = os.path.join(self.data_dir, 'templates.json')
        self.categories_file = os.path.join(self.data_dir, 'categories.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće podatke
        self.problems = self._load_problems()
        self.templates = self._load_templates()
        self.categories = self._load_categories()
        
        # Inicijalizuj default kategorije ako ne postoje
        if not self.categories:
            self._init_default_categories()
    
    def _load_problems(self) -> List[Dict[str, Any]]:
        """Učitaj probleme iz lokalnog storage-a"""
        try:
            if os.path.exists(self.problems_file):
                with open(self.problems_file, 'r', encoding='utf-8') as f:
                    problems = json.load(f)
                logger.info(f"Učitano {len(problems)} problema")
                return problems
            else:
                logger.info("Nema postojećih problema")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju problema: {e}")
            return []
    
    def _save_problems(self):
        """Sačuvaj probleme u lokalni storage"""
        try:
            with open(self.problems_file, 'w', encoding='utf-8') as f:
                json.dump(self.problems, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.problems)} problema")
        except Exception as e:
            logger.error(f"Greška pri čuvanju problema: {e}")
    
    def _load_templates(self) -> List[Dict[str, Any]]:
        """Učitaj template-ove iz lokalnog storage-a"""
        try:
            if os.path.exists(self.templates_file):
                with open(self.templates_file, 'r', encoding='utf-8') as f:
                    templates = json.load(f)
                logger.info(f"Učitano {len(templates)} template-ova")
                return templates
            else:
                logger.info("Nema postojećih template-ova")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju template-ova: {e}")
            return []
    
    def _save_templates(self):
        """Sačuvaj template-ove u lokalni storage"""
        try:
            with open(self.templates_file, 'w', encoding='utf-8') as f:
                json.dump(self.templates, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.templates)} template-ova")
        except Exception as e:
            logger.error(f"Greška pri čuvanju template-ova: {e}")
    
    def _load_categories(self) -> List[Dict[str, Any]]:
        """Učitaj kategorije iz lokalnog storage-a"""
        try:
            if os.path.exists(self.categories_file):
                with open(self.categories_file, 'r', encoding='utf-8') as f:
                    categories = json.load(f)
                logger.info(f"Učitano {len(categories)} kategorija")
                return categories
            else:
                logger.info("Nema postojećih kategorija")
                return []
            except Exception as e:
            logger.error(f"Greška pri učitavanju kategorija: {e}")
            return []
    
    def _save_categories(self):
        """Sačuvaj kategorije u lokalni storage"""
        try:
            with open(self.categories_file, 'w', encoding='utf-8') as f:
                json.dump(self.categories, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.categories)} kategorija")
        except Exception as e:
            logger.error(f"Greška pri čuvanju kategorija: {e}")
    
    def _init_default_categories(self):
        """Inicijalizuj default kategorije"""
        default_categories = [
            {
                'id': 'math_algebra',
                'name': 'Algebra',
                'subject': Subject.MATHEMATICS,
                'description': 'Algebarski problemi i jednačine',
                'difficulty_levels': [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.CALCULATION, ProblemType.MULTIPLE_CHOICE],
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'math_geometry',
                'name': 'Geometrija',
                'subject': Subject.MATHEMATICS,
                'description': 'Geometrijski problemi i teoreme',
                'difficulty_levels': [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.CALCULATION, ProblemType.MULTIPLE_CHOICE],
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'physics_mechanics',
                'name': 'Mehanika',
                'subject': Subject.PHYSICS,
                'description': 'Problemi iz mehanike i kretanja',
                'difficulty_levels': [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.CALCULATION, ProblemType.MULTIPLE_CHOICE],
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'physics_electricity',
                'name': 'Elektricitet',
                'subject': Subject.PHYSICS,
                'description': 'Problemi iz elektriciteta i magnetizma',
                'difficulty_levels': [Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.CALCULATION, ProblemType.MULTIPLE_CHOICE],
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'chemistry_organic',
                'name': 'Organska hemija',
                'subject': Subject.CHEMISTRY,
                'description': 'Problemi iz organske hemije',
                'difficulty_levels': [Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.MULTIPLE_CHOICE, ProblemType.SHORT_ANSWER],
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 'cs_programming',
                'name': 'Programiranje',
                'subject': Subject.COMPUTER_SCIENCE,
                'description': 'Problemi iz programiranja i algoritama',
                'difficulty_levels': [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD],
                'problem_types': [ProblemType.SHORT_ANSWER, ProblemType.ESSAY],
                'created_at': datetime.now().isoformat()
            }
        ]
        
        self.categories = default_categories
        self._save_categories()
        logger.info("Default kategorije inicijalizovane")
    
    def create_problem(self, problem_data: Dict[str, Any]) -> str:
        """Kreira novi problem"""
        try:
            problem_id = f"problem_{len(self.problems)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            problem = {
                'id': problem_id,
                'title': problem_data.get('title', 'Bez naslova'),
                'content': problem_data.get('content', ''),
                'subject': problem_data.get('subject', Subject.GENERAL),
                'category': problem_data.get('category', 'general'),
                'difficulty': problem_data.get('difficulty', Difficulty.MEDIUM),
                'problem_type': problem_data.get('problem_type', ProblemType.MULTIPLE_CHOICE),
                'options': problem_data.get('options', []),
                'correct_answer': problem_data.get('correct_answer', ''),
                'explanation': problem_data.get('explanation', ''),
                'solution': problem_data.get('solution', ''),
                'tags': problem_data.get('tags', []),
                'points': problem_data.get('points', 1),
                'is_active': problem_data.get('is_active', True),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': problem_data.get('metadata', {})
            }
            
            self.problems.append(problem)
            self._save_problems()
            
            logger.info(f"Problem {problem_id} uspešno kreiran")
            return problem_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju problema: {e}")
            raise
    
    def get_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati problem po ID-u"""
        for problem in self.problems:
            if problem['id'] == problem_id:
                return problem
            return None
    
    def update_problem(self, problem_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeći problem"""
        try:
            for problem in self.problems:
                if problem['id'] == problem_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['title', 'content', 'subject', 'category', 'difficulty', 
                                 'problem_type', 'options', 'correct_answer', 'explanation', 
                                 'solution', 'tags', 'points', 'is_active', 'metadata']:
                            problem[key] = value
                    
                    problem['updated_at'] = datetime.now().isoformat()
                    self._save_problems()
                    
                    logger.info(f"Problem {problem_id} uspešno ažuriran")
                    return True
            
            logger.warning(f"Problem {problem_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju problema: {e}")
            return False
    
    def delete_problem(self, problem_id: str) -> bool:
        """Obriši problem"""
        try:
            for i, problem in enumerate(self.problems):
                if problem['id'] == problem_id:
                    removed_problem = self.problems.pop(i)
                    self._save_problems()
                    
                    logger.info(f"Problem {problem_id} uspešno obrisan")
                    return True
            
            logger.warning(f"Problem {problem_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju problema: {e}")
            return False
    
    def list_problems(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Lista svih problema sa opcionim filterima"""
        try:
            problems = self.problems.copy()
            
            if filters:
                # Primeni filtere
                if 'subject' in filters:
                    problems = [p for p in problems if p.get('subject') == filters['subject']]
                
                if 'category' in filters:
                    problems = [p for p in problems if p.get('category') == filters['category']]
                
                if 'difficulty' in filters:
                    problems = [p for p in problems if p.get('difficulty') == filters['difficulty']]
                
                if 'problem_type' in filters:
                    problems = [p for p in problems if p.get('problem_type') == filters['problem_type']]
                
                if 'is_active' in filters:
                    problems = [p for p in problems if p.get('is_active') == filters['is_active']]
                
                if 'tags' in filters:
                    tag_filter = filters['tags']
                    if isinstance(tag_filter, list):
                        problems = [p for p in problems if any(tag in p.get('tags', []) for tag in tag_filter)]
            else:
                        problems = [p for p in problems if tag_filter in p.get('tags', [])]
            
            # Sortiraj po datumu kreiranja (najnoviji prvi)
            problems.sort(key=lambda x: x['created_at'], reverse=True)
            
            return problems
            
        except Exception as e:
            logger.error(f"Greška pri listanju problema: {e}")
            return []
    
    def generate_problem_set(self, 
                           subject: Subject = Subject.GENERAL,
                           category: str = None,
                           difficulty: Difficulty = Difficulty.MEDIUM,
                           problem_type: ProblemType = ProblemType.MULTIPLE_CHOICE,
                           count: int = 5) -> List[Dict[str, Any]]:
        """Generiše set problema na osnovu kriterijuma"""
        try:
            # Filtriraj probleme
            available_problems = []
            for problem in self.problems:
                if not problem.get('is_active', True):
                    continue
                
                if problem.get('subject') != subject:
                    continue
                
                if category and problem.get('category') != category:
                    continue
                
                if problem.get('difficulty') != difficulty:
                    continue
                
                if problem.get('problem_type') != problem_type:
                    continue
                
                available_problems.append(problem)
            
            # Ako nema dovoljno problema, dodaj probleme iz sličnih kategorija
            if len(available_problems) < count:
                for problem in self.problems:
                    if not problem.get('is_active', True):
                        continue
                    
                    if problem.get('subject') == subject and problem not in available_problems:
                        available_problems.append(problem)
                    
                    if len(available_problems) >= count:
                        break
            
            # Ako i dalje nema dovoljno, dodaj generalne probleme
            if len(available_problems) < count:
                for problem in self.problems:
                    if not problem.get('is_active', True):
                        continue
                    
                    if problem.get('subject') == Subject.GENERAL and problem not in available_problems:
                        available_problems.append(problem)
                    
                    if len(available_problems) >= count:
                        break
            
            # Vraća traženi broj problema
            return available_problems[:count]
            
        except Exception as e:
            logger.error(f"Greška pri generisanju problem set-a: {e}")
            return []
        
    def create_template(self, template_data: Dict[str, Any]) -> str:
        """Kreira novi template za probleme"""
        try:
            template_id = f"template_{len(self.templates)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            template = {
                'id': template_id,
                'name': template_data.get('name', 'Bez imena'),
                'description': template_data.get('description', ''),
                'subject': template_data.get('subject', Subject.GENERAL),
                'category': template_data.get('category', 'general'),
                'template_text': template_data.get('template_text', ''),
                'variables': template_data.get('variables', []),
                'constraints': template_data.get('constraints', {}),
                'difficulty_range': template_data.get('difficulty_range', [Difficulty.MEDIUM]),
                'problem_types': template_data.get('problem_types', [ProblemType.MULTIPLE_CHOICE]),
                'is_active': template_data.get('is_active', True),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': template_data.get('metadata', {})
            }
            
            self.templates.append(template)
            self._save_templates()
            
            logger.info(f"Template {template_id} uspešno kreiran")
            return template_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju template-a: {e}")
            raise
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati template po ID-u"""
        for template in self.templates:
            if template['id'] == template_id:
                return template
            return None
    
    def list_templates(self, subject: Subject = None) -> List[Dict[str, Any]]:
        """Lista svih template-ova"""
        templates = self.templates.copy()
        
        if subject:
            templates = [t for t in templates if t.get('subject') == subject]
        
        return templates
    
    def generate_from_template(self, template_id: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generiše problem iz template-a"""
        try:
            template = self.get_template(template_id)
            if not template:
                raise Exception(f"Template {template_id} nije pronađen")
            
            if not template.get('is_active', True):
                raise Exception(f"Template {template_id} nije aktivan")
            
            # Jednostavna implementacija - zameni varijable u template tekstu
            template_text = template.get('template_text', '')
            if variables:
                for key, value in variables.items():
                    template_text = template_text.replace(f"{{{key}}}", str(value))
            
            # Kreiraj problem iz template-a
            problem_data = {
                'title': f"Problem iz template-a: {template.get('name', '')}",
                'content': template_text,
                'subject': template.get('subject', Subject.GENERAL),
                'category': template.get('category', 'general'),
                'difficulty': template.get('difficulty_range', [Difficulty.MEDIUM])[0],
                'problem_type': template.get('problem_types', [ProblemType.MULTIPLE_CHOICE])[0],
                'tags': ['template_generated'],
                'metadata': {
                    'template_id': template_id,
                    'variables_used': variables or {}
                }
            }
            
            problem_id = self.create_problem(problem_data)
            return self.get_problem(problem_id)
            
        except Exception as e:
            logger.error(f"Greška pri generisanju iz template-a: {e}")
            raise
    
    def get_categories(self, subject: Subject = None) -> List[Dict[str, Any]]:
        """Dohvati kategorije"""
        categories = self.categories.copy()
        
        if subject:
            categories = [c for c in categories if c.get('subject') == subject]
        
        return categories
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike problem generator sistema"""
        try:
            return {
                'total_problems': len(self.problems),
                'total_templates': len(self.templates),
                'total_categories': len(self.categories),
                'active_problems': len([p for p in self.problems if p.get('is_active', True)]),
                'active_templates': len([t for t in self.templates if t.get('is_active', True)]),
                'problems_by_subject': {
                    subject.value: len([p for p in self.problems if p.get('subject') == subject])
                    for subject in Subject
                },
                'problems_by_difficulty': {
                    difficulty.value: len([p for p in self.problems if p.get('difficulty') == difficulty])
                    for difficulty in Difficulty
                },
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju problem generator statistika: {e}")
            return {}

# Globalna instanca
problem_generator = ProblemGenerator()

def get_problem_generator() -> ProblemGenerator:
    """Dohvati globalnu instancu problem generator servisa"""
    return problem_generator 