#!/usr/bin/env python3
"""
Statička lista pitanja iz fizike za MVP testiranje
"""

from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid

# Lista pitanja iz fizike
PHYSICS_QUESTIONS = [
    {
        "question_id": "p1",
        "question_text": "Šta je osnovna SI jedinica za silu?",
        "question_type": "multiple_choice",
        "options": ["Džul", "Njutn", "Vat", "Pascal"],
        "correct_answer": "Njutn",
        "explanation": "Njutn (N) je osnovna SI jedinica za silu. 1 N = 1 kg·m/s²",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["osnove", "jedinice", "sila"]
    },
    {
        "question_id": "p2",
        "question_text": "Koji zakon kaže da je sila jednaka proizvodu mase i ubrzanja?",
        "question_type": "multiple_choice",
        "options": ["Prvi Njutnov zakon", "Drugi Njutnov zakon", "Treći Njutnov zakon", "Zakon očuvanja energije"],
        "correct_answer": "Drugi Njutnov zakon",
        "explanation": "Drugi Njutnov zakon: F = m·a, gde je F sila, m masa, a ubrzanje",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["Njutnovi zakoni", "dinamika"]
    },
    {
        "question_id": "p3",
        "question_text": "Da li je brzina vektorska veličina?",
        "question_type": "true_false",
        "options": ["Da", "Ne"],
        "correct_answer": "Da",
        "explanation": "Brzina je vektorska veličina jer ima i intenzitet i pravac",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["kinematika", "vektori"]
    },
    {
        "question_id": "p4",
        "question_text": "Koja je formula za kinetičku energiju?",
        "question_type": "multiple_choice",
        "options": ["E = mgh", "E = ½mv²", "E = mc²", "E = F·s"],
        "correct_answer": "E = ½mv²",
        "explanation": "Kinetička energija se računa kao E = ½mv², gde je m masa, v brzina",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["energija", "kinetika"]
    },
    {
        "question_id": "p5",
        "question_text": "Šta je gravitaciona konstanta?",
        "question_type": "multiple_choice",
        "options": ["6.67 × 10⁻¹¹ N·m²/kg²", "9.81 m/s²", "3 × 10⁸ m/s", "1.6 × 10⁻¹⁹ C"],
        "correct_answer": "6.67 × 10⁻¹¹ N·m²/kg²",
        "explanation": "G = 6.67 × 10⁻¹¹ N·m²/kg² je univerzalna gravitaciona konstanta",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["gravitacija", "konstante"]
    },
    {
        "question_id": "p6",
        "question_text": "Da li se energija može uništiti?",
        "question_type": "true_false",
        "options": ["Da", "Ne"],
        "correct_answer": "Ne",
        "explanation": "Energija se ne može uništiti niti stvoriti, samo transformisati (zakon očuvanja energije)",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["energija", "očuvanje"]
    },
    {
        "question_id": "p7",
        "question_text": "Koja je jedinica za snagu?",
        "question_type": "multiple_choice",
        "options": ["Džul", "Njutn", "Vat", "Paskal"],
        "correct_answer": "Vat",
        "explanation": "Vat (W) je SI jedinica za snagu. 1 W = 1 J/s",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["snaga", "jedinice"]
    },
    {
        "question_id": "p8",
        "question_text": "Šta je inercija?",
        "question_type": "short_answer",
        "options": [],
        "correct_answer": "Otpornost tela na promenu stanja kretanja",
        "explanation": "Inercija je svojstvo tela da se odupire promeni stanja kretanja (Prvi Njutnov zakon)",
        "points": 2,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["inercija", "Njutnovi zakoni"]
    },
    {
        "question_id": "p9",
        "question_text": "Koja je formula za potencijalnu energiju u gravitacionom polju?",
        "question_type": "multiple_choice",
        "options": ["E = ½mv²", "E = mgh", "E = mc²", "E = F·s"],
        "correct_answer": "E = mgh",
        "explanation": "Potencijalna energija u gravitacionom polju: E = mgh, gde je g gravitaciono ubrzanje, h visina",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["energija", "potencijalna"]
    },
    {
        "question_id": "p10",
        "question_text": "Da li je ubrzanje vektorska veličina?",
        "question_type": "true_false",
        "options": ["Da", "Ne"],
        "correct_answer": "Da",
        "explanation": "Ubrzanje je vektorska veličina jer ima i intenzitet i pravac",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["kinematika", "vektori"]
    },
    {
        "question_id": "p11",
        "question_text": "Koji zakon kaže da je akcija jednaka reakciji?",
        "question_type": "multiple_choice",
        "options": ["Prvi Njutnov zakon", "Drugi Njutnov zakon", "Treći Njutnov zakon", "Zakon očuvanja energije"],
        "correct_answer": "Treći Njutnov zakon",
        "explanation": "Treći Njutnov zakon: F₁₂ = -F₂₁ (akcija = reakcija)",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["Njutnovi zakoni", "akcija-reakcija"]
    },
    {
        "question_id": "p12",
        "question_text": "Šta je moment sile?",
        "question_type": "short_answer",
        "options": [],
        "correct_answer": "Proizvod sile i kraka sile",
        "explanation": "Moment sile M = F·r, gde je F sila, r krak sile (rastojanje od tačke rotacije)",
        "points": 2,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["moment", "rotacija"]
    },
    {
        "question_id": "p13",
        "question_text": "Koja je brzina svetlosti u vakuumu?",
        "question_type": "multiple_choice",
        "options": ["3 × 10⁸ m/s", "2 × 10⁸ m/s", "1 × 10⁸ m/s", "4 × 10⁸ m/s"],
        "correct_answer": "3 × 10⁸ m/s",
        "explanation": "Brzina svetlosti u vakuumu je c = 3 × 10⁸ m/s",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["svetlost", "konstante"]
    },
    {
        "question_id": "p14",
        "question_text": "Da li se impuls očuva u izolovanom sistemu?",
        "question_type": "true_false",
        "options": ["Da", "Ne"],
        "correct_answer": "Da",
        "explanation": "Impuls se očuva u izolovanom sistemu (zakon očuvanja impulsa)",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["impuls", "očuvanje"]
    },
    {
        "question_id": "p15",
        "question_text": "Koja je formula za centripetalnu silu?",
        "question_type": "multiple_choice",
        "options": ["F = mv²/r", "F = ma", "F = mg", "F = kx"],
        "correct_answer": "F = mv²/r",
        "explanation": "Centripetalna sila: F = mv²/r, gde je m masa, v brzina, r poluprečnik",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["centripetalna sila", "kružno kretanje"]
    },
    {
        "question_id": "p16",
        "question_text": "Šta je elastična energija?",
        "question_type": "short_answer",
        "options": [],
        "correct_answer": "Energija deformisanog elastičnog tela",
        "explanation": "Elastična energija je energija deformisanog elastičnog tela, E = ½kx²",
        "points": 2,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["energija", "elastičnost"]
    },
    {
        "question_id": "p17",
        "question_text": "Koja je jedinica za pritisak?",
        "question_type": "multiple_choice",
        "options": ["Njutn", "Paskal", "Džul", "Vat"],
        "correct_answer": "Paskal",
        "explanation": "Paskal (Pa) je SI jedinica za pritisak. 1 Pa = 1 N/m²",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["pritisak", "jedinice"]
    },
    {
        "question_id": "p18",
        "question_text": "Da li je masa skalarna veličina?",
        "question_type": "true_false",
        "options": ["Da", "Ne"],
        "correct_answer": "Da",
        "explanation": "Masa je skalarna veličina jer ima samo intenzitet, bez pravca",
        "points": 1,
        "difficulty": "easy",
        "subject": "Fizika",
        "tags": ["masa", "skalari"]
    },
    {
        "question_id": "p19",
        "question_text": "Koja je formula za rad?",
        "question_type": "multiple_choice",
        "options": ["W = F·s", "W = mgh", "W = ½mv²", "W = Pt"],
        "correct_answer": "W = F·s",
        "explanation": "Rad je W = F·s, gde je F sila, s pomeraj u pravcu sile",
        "points": 1,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["rad", "energija"]
    },
    {
        "question_id": "p20",
        "question_text": "Šta je period oscilovanja?",
        "question_type": "short_answer",
        "options": [],
        "correct_answer": "Vreme potrebno za jednu potpunu oscilaciju",
        "explanation": "Period T je vreme potrebno za jednu potpunu oscilaciju. T = 1/f",
        "points": 2,
        "difficulty": "medium",
        "subject": "Fizika",
        "tags": ["oscilacije", "period"]
    }
]

def get_physics_questions() -> List[Dict[str, Any]]:
    """Vraća listu pitanja iz fizike"""
    return PHYSICS_QUESTIONS

def get_physics_questions_by_difficulty(difficulty: str = None) -> List[Dict[str, Any]]:
    """Vraća pitanja iz fizike filtrirana po težini"""
    if difficulty:
        return [q for q in PHYSICS_QUESTIONS if q["difficulty"] == difficulty]
    return PHYSICS_QUESTIONS

def get_physics_questions_by_type(question_type: str = None) -> List[Dict[str, Any]]:
    """Vraća pitanja iz fizike filtrirana po tipu"""
    if question_type:
        return [q for q in PHYSICS_QUESTIONS if q["question_type"] == question_type]
    return PHYSICS_QUESTIONS

def get_random_physics_questions(count: int = 10) -> List[Dict[str, Any]]:
    """Vraća nasumično odabrana pitanja iz fizike"""
    import random
    questions = PHYSICS_QUESTIONS.copy()
    random.shuffle(questions)
    return questions[:count]

def create_physics_exam(title: str = "Ispit iz fizike", count: int = 10) -> Dict[str, Any]:
    """Kreira ispit iz fizike sa nasumično odabranim pitanjem"""
    selected_questions = get_random_physics_questions(count)
    total_points = sum(q["points"] for q in selected_questions)
    
    return {
        "exam_id": str(uuid.uuid4()),
        "title": title,
        "description": f"Ispit iz fizike sa {count} pitanja",
        "subject": "Fizika",
        "duration_minutes": count * 2,
        "total_points": total_points,
        "passing_score": int(total_points * 0.7),
        "questions": selected_questions,
        "status": "active",
        "created_by": "system",
        "is_public": True,
        "allow_retakes": True,
        "max_attempts": 3,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    } 