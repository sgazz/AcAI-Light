"""
Career Guidance Service - Lokalna verzija
Upravlja career guidance funkcionalnostima bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .config import Config

logger = logging.getLogger(__name__)

class CareerGuidanceService:
    """Career Guidance servis za lokalni storage"""
    
    def __init__(self):
        """Inicijalizuj Career Guidance servis"""
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'career_guidance')
        self.profiles_file = os.path.join(self.data_dir, 'profiles.json')
        self.assessments_file = os.path.join(self.data_dir, 'assessments.json')
        self.recommendations_file = os.path.join(self.data_dir, 'recommendations.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće podatke
        self.profiles = self._load_profiles()
        self.assessments = self._load_assessments()
        self.recommendations = self._load_recommendations()
    
    def _load_profiles(self) -> List[Dict[str, Any]]:
        """Učitaj profile iz lokalnog storage-a"""
        try:
            if os.path.exists(self.profiles_file):
                with open(self.profiles_file, 'r', encoding='utf-8') as f:
                    profiles = json.load(f)
                logger.info(f"Učitano {len(profiles)} career profila")
                return profiles
            else:
                logger.info("Nema postojećih career profila")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju career profila: {e}")
            return []
    
    def _save_profiles(self):
        """Sačuvaj profile u lokalni storage"""
        try:
            with open(self.profiles_file, 'w', encoding='utf-8') as f:
                json.dump(self.profiles, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.profiles)} career profila")
        except Exception as e:
            logger.error(f"Greška pri čuvanju career profila: {e}")
    
    def _load_assessments(self) -> List[Dict[str, Any]]:
        """Učitaj assessments iz lokalnog storage-a"""
        try:
            if os.path.exists(self.assessments_file):
                with open(self.assessments_file, 'r', encoding='utf-8') as f:
                    assessments = json.load(f)
                logger.info(f"Učitano {len(assessments)} career assessments")
                return assessments
            else:
                logger.info("Nema postojećih career assessments")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju career assessments: {e}")
            return []
    
    def _save_assessments(self):
        """Sačuvaj assessments u lokalni storage"""
        try:
            with open(self.assessments_file, 'w', encoding='utf-8') as f:
                json.dump(self.assessments, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.assessments)} career assessments")
        except Exception as e:
            logger.error(f"Greška pri čuvanju career assessments: {e}")
    
    def _load_recommendations(self) -> List[Dict[str, Any]]:
        """Učitaj recommendations iz lokalnog storage-a"""
        try:
            if os.path.exists(self.recommendations_file):
                with open(self.recommendations_file, 'r', encoding='utf-8') as f:
                    recommendations = json.load(f)
                logger.info(f"Učitano {len(recommendations)} career recommendations")
                return recommendations
            else:
                logger.info("Nema postojećih career recommendations")
                return []
        except Exception as e:
            logger.error(f"Greška pri učitavanju career recommendations: {e}")
            return []
    
    def _save_recommendations(self):
        """Sačuvaj recommendations u lokalni storage"""
        try:
            with open(self.recommendations_file, 'w', encoding='utf-8') as f:
                json.dump(self.recommendations, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.recommendations)} career recommendations")
        except Exception as e:
            logger.error(f"Greška pri čuvanju career recommendations: {e}")
    
    def create_profile(self, profile_data: Dict[str, Any]) -> str:
        """Kreira novi career profile"""
        try:
            profile_id = f"profile_{len(self.profiles)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            profile = {
                'id': profile_id,
                'name': profile_data.get('name', 'Bez imena'),
                'age': profile_data.get('age', 0),
                'education_level': profile_data.get('education_level', 'srednja'),
                'interests': profile_data.get('interests', []),
                'skills': profile_data.get('skills', []),
                'personality_traits': profile_data.get('personality_traits', []),
                'work_preferences': profile_data.get('work_preferences', {}),
                'career_goals': profile_data.get('career_goals', []),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': profile_data.get('metadata', {})
            }
            
            self.profiles.append(profile)
            self._save_profiles()
            
            logger.info(f"Career profile {profile_id} uspešno kreiran")
            return profile_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju career profile-a: {e}")
            raise
    
    def get_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati profile po ID-u"""
        for profile in self.profiles:
            if profile['id'] == profile_id:
                return profile
        return None
    
    def update_profile(self, profile_id: str, update_data: Dict[str, Any]) -> bool:
        """Ažuriraj postojeći profile"""
        try:
            for profile in self.profiles:
                if profile['id'] == profile_id:
                    # Ažuriraj polja
                    for key, value in update_data.items():
                        if key in ['name', 'age', 'education_level', 'interests', 'skills', 
                                 'personality_traits', 'work_preferences', 'career_goals', 'metadata']:
                            profile[key] = value
                    
                    profile['updated_at'] = datetime.now().isoformat()
                    self._save_profiles()
                    
                    logger.info(f"Career profile {profile_id} uspešno ažuriran")
                    return True
            
            logger.warning(f"Career profile {profile_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri ažuriranju career profile-a: {e}")
            return False
    
    def delete_profile(self, profile_id: str) -> bool:
        """Obriši profile"""
        try:
            for i, profile in enumerate(self.profiles):
                if profile['id'] == profile_id:
                    removed_profile = self.profiles.pop(i)
                    self._save_profiles()
                    
                    logger.info(f"Career profile {profile_id} uspešno obrisan")
                    return True
            
            logger.warning(f"Career profile {profile_id} nije pronađen")
            return False
            
        except Exception as e:
            logger.error(f"Greška pri brisanju career profile-a: {e}")
            return False
    
    def create_assessment(self, assessment_data: Dict[str, Any]) -> str:
        """Kreira novi career assessment"""
        try:
            assessment_id = f"assessment_{len(self.assessments)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            assessment = {
                'id': assessment_id,
                'profile_id': assessment_data.get('profile_id', ''),
                'assessment_type': assessment_data.get('assessment_type', 'general'),
                'questions': assessment_data.get('questions', []),
                'answers': assessment_data.get('answers', []),
                'results': assessment_data.get('results', {}),
                'score': assessment_data.get('score', 0),
                'completed_at': datetime.now().isoformat(),
                'created_at': datetime.now().isoformat(),
                'metadata': assessment_data.get('metadata', {})
            }
            
            self.assessments.append(assessment)
            self._save_assessments()
            
            logger.info(f"Career assessment {assessment_id} uspešno kreiran")
            return assessment_id
            
        except Exception as e:
            logger.error(f"Greška pri kreiranju career assessment-a: {e}")
            raise
    
    def get_assessment(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati assessment po ID-u"""
        for assessment in self.assessments:
            if assessment['id'] == assessment_id:
                return assessment
        return None
    
    def get_assessments_by_profile(self, profile_id: str) -> List[Dict[str, Any]]:
        """Dohvati sve assessments za određeni profile"""
        return [a for a in self.assessments if a.get('profile_id', '') == profile_id]
    
    def generate_recommendations(self, profile_id: str, assessment_id: str = None) -> str:
        """Generiše career recommendations na osnovu profile-a i assessment-a"""
        try:
            profile = self.get_profile(profile_id)
            if not profile:
                raise Exception(f"Profile {profile_id} nije pronađen")
            
            # Dohvati relevantne assessments
            assessments = self.get_assessments_by_profile(profile_id)
            if assessment_id:
                assessments = [a for a in assessments if a['id'] == assessment_id]
            
            # Generiši recommendations (pojednostavljena logika)
            recommendations = self._analyze_profile_and_generate_recommendations(profile, assessments)
            
            recommendation_id = f"rec_{len(self.recommendations)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            recommendation = {
                'id': recommendation_id,
                'profile_id': profile_id,
                'assessment_ids': [a['id'] for a in assessments],
                'career_paths': recommendations.get('career_paths', []),
                'skills_to_develop': recommendations.get('skills_to_develop', []),
                'education_recommendations': recommendations.get('education_recommendations', []),
                'job_market_insights': recommendations.get('job_market_insights', {}),
                'confidence_score': recommendations.get('confidence_score', 0.7),
                'generated_at': datetime.now().isoformat(),
                'created_at': datetime.now().isoformat(),
                'metadata': recommendations.get('metadata', {})
            }
            
            self.recommendations.append(recommendation)
            self._save_recommendations()
            
            logger.info(f"Career recommendations {recommendation_id} uspešno generisane")
            return recommendation_id
            
        except Exception as e:
            logger.error(f"Greška pri generisanju career recommendations: {e}")
            raise
    
    def get_recommendations(self, profile_id: str = None) -> List[Dict[str, Any]]:
        """Dohvati recommendations"""
        if profile_id:
            return [r for r in self.recommendations if r.get('profile_id', '') == profile_id]
        return self.recommendations
    
    def _analyze_profile_and_generate_recommendations(self, profile: Dict[str, Any], assessments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analizira profile i assessments i generiše recommendations"""
        # Pojednostavljena logika za generisanje recommendations
        interests = profile.get('interests', [])
        skills = profile.get('skills', [])
        personality_traits = profile.get('personality_traits', [])
        education_level = profile.get('education_level', 'srednja')
        
        # Osnovne career paths na osnovu interesa
        career_paths = []
        if 'tehnologija' in interests or 'programiranje' in interests:
            career_paths.append({
                'title': 'Software Developer',
                'description': 'Razvoj softvera i aplikacija',
                'match_score': 0.9,
                'required_skills': ['programiranje', 'logičko razmišljanje'],
                'education_path': 'Fakultet ili kurs programiranja'
            })
        
        if 'nauka' in interests or 'istraživanje' in interests:
            career_paths.append({
                'title': 'Istraživač',
                'description': 'Naučno istraživanje i analiza',
                'match_score': 0.8,
                'required_skills': ['analitičko razmišljanje', 'istraživanje'],
                'education_path': 'Fakultet u relevantnoj oblasti'
            })
        
        if 'komunikacija' in interests or 'ljudi' in interests:
            career_paths.append({
                'title': 'HR Specialist',
                'description': 'Upravljanje ljudskim resursima',
                'match_score': 0.7,
                'required_skills': ['komunikacija', 'organizacija'],
                'education_path': 'Fakultet ili kurs HR-a'
            })
        
        # Skills to develop
        skills_to_develop = []
        if 'programiranje' not in skills:
            skills_to_develop.append('Programiranje (Python, JavaScript)')
        if 'komunikacija' not in skills:
            skills_to_develop.append('Komunikacione veštine')
        if 'analitičko razmišljanje' not in skills:
            skills_to_develop.append('Analitičko razmišljanje')
        
        # Education recommendations
        education_recommendations = []
        if education_level == 'srednja':
            education_recommendations.append('Fakultet u oblasti koja te interesuje')
        elif education_level == 'fakultet':
            education_recommendations.append('Master studije za specijalizaciju')
            education_recommendations.append('Kursevi za dodatne veštine')
        
        return {
            'career_paths': career_paths,
            'skills_to_develop': skills_to_develop,
            'education_recommendations': education_recommendations,
            'job_market_insights': {
                'trending_skills': ['AI/ML', 'Cloud Computing', 'Data Science'],
                'growth_industries': ['Tehnologija', 'Zdravstvo', 'Održivi razvoj']
            },
            'confidence_score': 0.75,
            'metadata': {
                'analysis_method': 'rule_based',
                'factors_considered': ['interests', 'skills', 'personality', 'education']
            }
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike career guidance sistema"""
        try:
            return {
                'total_profiles': len(self.profiles),
                'total_assessments': len(self.assessments),
                'total_recommendations': len(self.recommendations),
                'profiles_with_assessments': len(set(a.get('profile_id') for a in self.assessments if a.get('profile_id') is not None)),
                'profiles_with_recommendations': len(set(r.get('profile_id') for r in self.recommendations if r.get('profile_id') is not None)),
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Greška pri dohvatanju career guidance statistika: {e}")
            return {}

# Globalna instanca
career_guidance_service = CareerGuidanceService() 