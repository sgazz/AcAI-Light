"""
Career Guidance Service
Handles career profiles, skills inventory, assessments, job recommendations, career paths, and industry insights.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from supabase import create_client, Client
from .config import Config

class CareerGuidanceService:
    def __init__(self):
        self.supabase: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    
    def _handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """Centralizovano rukovanje greškama"""
        return {
            'status': 'error',
            'message': f'Greška u {operation}: {str(error)}',
            'data': None
        }
    
    # Career Profiles Methods
    async def create_career_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new career profile for a user."""
        try:
            profile_id = str(uuid.uuid4())
            profile_data['id'] = profile_id
            profile_data['created_at'] = datetime.utcnow().isoformat()
            profile_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('career_profiles').insert(profile_data).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career profile uspešno kreiran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Greška pri kreiranju career profile-a')
        except Exception as e:
            return self._handle_error(e, "kreiranju career profile-a")
    
    async def get_career_profile(self, user_id: str) -> Dict[str, Any]:
        """Get career profile for a user."""
        try:
            result = self.supabase.table('career_profiles').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career profile uspešno dohvaćen',
                    'data': result.data[0]
                }
            else:
                return {
                    'status': 'success',
                    'message': 'Career profile nije pronađen',
                    'data': None
                }
        except Exception as e:
            return self._handle_error(e, "dohvatanju career profile-a")
    
    async def update_career_profile(self, profile_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update career profile."""
        try:
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('career_profiles').update(update_data).eq('id', profile_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career profile uspešno ažuriran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Career profile nije pronađen')
        except Exception as e:
            return self._handle_error(e, "ažuriranju career profile-a")
    
    async def delete_career_profile(self, profile_id: str) -> Dict[str, Any]:
        """Delete career profile."""
        try:
            result = self.supabase.table('career_profiles').delete().eq('id', profile_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career profile uspešno obrisan',
                    'data': result.data[0]
                }
            else:
                raise Exception('Career profile nije pronađen')
        except Exception as e:
            return self._handle_error(e, "brisanju career profile-a")
    
    # Skills Inventory Methods
    async def add_skill(self, skill_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new skill to user's inventory."""
        try:
            skill_id = str(uuid.uuid4())
            skill_data['id'] = skill_id
            skill_data['created_at'] = datetime.utcnow().isoformat()
            skill_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('skills_inventory').insert(skill_data).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Veština uspešno dodata',
                    'data': result.data[0]
                }
            else:
                raise Exception('Greška pri dodavanju veštine')
        except Exception as e:
            return self._handle_error(e, "dodavanju veštine")
    
    async def get_user_skills(self, user_id: str, category: Optional[str] = None) -> Dict[str, Any]:
        """Get all skills for a user, optionally filtered by category."""
        try:
            query = self.supabase.table('skills_inventory').select('*').eq('user_id', user_id)
            
            if category:
                query = query.eq('skill_category', category)
            
            result = query.execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} veština',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju veština")
    
    async def update_skill(self, skill_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a skill."""
        try:
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('skills_inventory').update(update_data).eq('id', skill_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Veština uspešno ažurirana',
                    'data': result.data[0]
                }
            else:
                raise Exception('Veština nije pronađena')
        except Exception as e:
            return self._handle_error(e, "ažuriranju veštine")
    
    async def delete_skill(self, skill_id: str) -> Dict[str, Any]:
        """Delete a skill."""
        try:
            result = self.supabase.table('skills_inventory').delete().eq('id', skill_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Veština uspešno obrisana',
                    'data': result.data[0]
                }
            else:
                raise Exception('Veština nije pronađena')
        except Exception as e:
            return self._handle_error(e, "brisanju veštine")
    
    async def get_skills_summary(self, user_id: str) -> Dict[str, Any]:
        """Get skills summary for a user."""
        try:
            result = self.supabase.rpc('get_user_skills_summary', {'user_uuid': user_id}).execute()
            
            return {
                'status': 'success',
                'message': 'Skills summary uspešno dohvaćen',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju skills summary")
    
    # Career Assessments Methods
    async def create_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new career assessment."""
        try:
            assessment_id = str(uuid.uuid4())
            assessment_data['id'] = assessment_id
            assessment_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('career_assessments').insert(assessment_data).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Assessment uspešno kreiran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Greška pri kreiranju assessment-a')
        except Exception as e:
            return self._handle_error(e, "kreiranju assessment-a")
    
    async def get_user_assessments(self, user_id: str, assessment_type: Optional[str] = None) -> Dict[str, Any]:
        """Get all assessments for a user, optionally filtered by type."""
        try:
            query = self.supabase.table('career_assessments').select('*').eq('user_id', user_id)
            
            if assessment_type:
                query = query.eq('assessment_type', assessment_type)
            
            result = query.order('created_at', desc=True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} assessment-a',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju assessment-a")
    
    async def submit_assessment_answers(self, assessment_id: str, answers: Dict[str, Any], results: Dict[str, Any], score: float) -> Dict[str, Any]:
        """Submit answers for an assessment and calculate results."""
        try:
            update_data = {
                'answers': answers,
                'results': results,
                'score': score,
                'completion_date': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('career_assessments').update(update_data).eq('id', assessment_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Assessment uspešno završen',
                    'data': result.data[0]
                }
            else:
                raise Exception('Assessment nije pronađen')
        except Exception as e:
            return self._handle_error(e, "završavanju assessment-a")
    
    async def get_assessment_questions(self, assessment_type: str) -> Dict[str, Any]:
        """Get questions for a specific assessment type."""
        try:
            result = self.supabase.table('assessment_questions').select('*').eq('assessment_type', assessment_type).eq('is_active', True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} pitanja',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju pitanja")
    
    # Job Recommendations Methods
    async def create_job_recommendation(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new job recommendation."""
        try:
            job_id = str(uuid.uuid4())
            job_data['id'] = job_id
            job_data['created_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('job_recommendations').insert(job_data).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Job recommendation uspešno kreiran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Greška pri kreiranju job recommendation-a')
        except Exception as e:
            return self._handle_error(e, "kreiranju job recommendation-a")
    
    async def get_job_recommendations(self, user_id: str, status: Optional[str] = None) -> Dict[str, Any]:
        """Get job recommendations for a user."""
        try:
            query = self.supabase.table('job_recommendations').select('*').eq('user_id', user_id)
            
            if status:
                query = query.eq('application_status', status)
            
            result = query.order('match_score', desc=True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} job recommendations',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju job recommendations")
    
    async def update_job_application_status(self, job_id: str, status: str) -> Dict[str, Any]:
        """Update job application status."""
        try:
            result = self.supabase.table('job_recommendations').update({'application_status': status}).eq('id', job_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Job application status uspešno ažuriran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Job recommendation nije pronađen')
        except Exception as e:
            return self._handle_error(e, "ažuriranju job status")
    
    async def calculate_job_match_score(self, user_id: str, required_skills: List[str], preferred_skills: List[str]) -> Dict[str, Any]:
        """Calculate job match score for a user."""
        try:
            result = self.supabase.rpc('calculate_job_match_score', {
                'user_uuid': user_id,
                'required_skills': required_skills,
                'preferred_skills': preferred_skills
            }).execute()
            
            return {
                'status': 'success',
                'message': 'Job match score izračunat',
                'data': {'match_score': result.data}
            }
        except Exception as e:
            return self._handle_error(e, "izračunavanju job match score")
    
    # Career Paths Methods
    async def create_career_path(self, path_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new career path."""
        try:
            path_id = str(uuid.uuid4())
            path_data['id'] = path_id
            path_data['created_at'] = datetime.utcnow().isoformat()
            path_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('career_paths').insert(path_data).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career path uspešno kreiran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Greška pri kreiranju career path-a')
        except Exception as e:
            return self._handle_error(e, "kreiranju career path")
    
    async def get_user_career_paths(self, user_id: str, active_only: bool = True) -> Dict[str, Any]:
        """Get career paths for a user."""
        try:
            query = self.supabase.table('career_paths').select('*').eq('user_id', user_id)
            
            if active_only:
                query = query.eq('is_active', True)
            
            result = query.order('created_at', desc=True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} career paths',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju career paths")
    
    async def update_career_path_progress(self, path_id: str, progress_percentage: float) -> Dict[str, Any]:
        """Update career path progress."""
        try:
            update_data = {
                'progress_percentage': progress_percentage,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('career_paths').update(update_data).eq('id', path_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career path progress uspešno ažuriran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Career path nije pronađen')
        except Exception as e:
            return self._handle_error(e, "ažuriranju career path progress")
    
    async def deactivate_career_path(self, path_id: str) -> Dict[str, Any]:
        """Deactivate a career path."""
        try:
            result = self.supabase.table('career_paths').update({'is_active': False}).eq('id', path_id).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Career path uspešno deaktiviran',
                    'data': result.data[0]
                }
            else:
                raise Exception('Career path nije pronađen')
        except Exception as e:
            return self._handle_error(e, "deaktiviranju career path")
    
    # Industry Insights Methods
    async def get_all_industries(self) -> Dict[str, Any]:
        """Get all industry insights."""
        try:
            result = self.supabase.table('industry_insights').select('*').order('growth_rate', desc=True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} industrija',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju industrija")
    
    async def get_industry_details(self, industry_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific industry."""
        try:
            result = self.supabase.table('industry_insights').select('*').eq('industry_name', industry_name).execute()
            
            if result.data:
                return {
                    'status': 'success',
                    'message': 'Industry details uspešno dohvaćeni',
                    'data': result.data[0]
                }
            else:
                return {
                    'status': 'success',
                    'message': 'Industry nije pronađen',
                    'data': None
                }
        except Exception as e:
            return self._handle_error(e, "dohvatanju industry details")
    
    async def get_industry_trends(self) -> Dict[str, Any]:
        """Get industry trends and insights."""
        try:
            result = self.supabase.table('industry_insights').select('industry_name, trends, growth_rate, job_demand').order('growth_rate', desc=True).execute()
            
            return {
                'status': 'success',
                'message': f'Dohvaćeno {len(result.data)} industry trends',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju industry trends")
    
    # Comprehensive Methods
    async def get_user_career_insights(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive career insights for a user."""
        try:
            result = self.supabase.rpc('get_user_career_insights', {'user_uuid': user_id}).execute()
            
            return {
                'status': 'success',
                'message': 'Career insights uspešno dohvaćeni',
                'data': result.data
            }
        except Exception as e:
            return self._handle_error(e, "dohvatanju career insights")
    
    async def generate_job_recommendations(self, user_id: str, limit: int = 10) -> Dict[str, Any]:
        """Generate job recommendations based on user skills and preferences."""
        try:
            # Get user skills
            skills_result = await self.get_user_skills(user_id)
            user_skills = [skill['skill_name'] for skill in skills_result['data']]
            
            # Get user profile
            profile_result = await self.get_career_profile(user_id)
            user_profile = profile_result['data']
            
            # Get industry insights for preferred industries
            industries = user_profile.get('preferred_industries', []) if user_profile else []
            
            # Generate mock job recommendations based on skills and industries
            recommendations = []
            for i in range(limit):
                recommendation = {
                    'user_id': user_id,
                    'job_title': f'Software Developer - Level {i+1}',
                    'company_name': f'Tech Company {i+1}',
                    'job_description': f'Looking for a skilled developer with experience in {", ".join(user_skills[:3])}',
                    'required_skills': user_skills[:3],
                    'preferred_skills': user_skills[3:6] if len(user_skills) > 3 else [],
                    'salary_range': '60000-80000',
                    'location': 'Belgrade',
                    'job_type': 'Full-time',
                    'match_score': 85 - (i * 5),
                    'application_status': 'recommended'
                }
                recommendations.append(recommendation)
            
            # Insert recommendations
            for rec in recommendations:
                await self.create_job_recommendation(rec)
            
            return {
                'status': 'success',
                'message': f'Generisano {len(recommendations)} job recommendations',
                'data': recommendations
            }
        except Exception as e:
            return self._handle_error(e, "generisanju job recommendations")
    
    async def create_career_assessment(self, user_id: str, assessment_type: str) -> Dict[str, Any]:
        """Create a new assessment for a user."""
        try:
            # Get questions for the assessment type
            questions_result = await self.get_assessment_questions(assessment_type)
            questions = questions_result['data']
            
            if not questions:
                raise Exception(f'Nema pitanja za assessment tip: {assessment_type}')
            
            # Create assessment
            assessment_data = {
                'user_id': user_id,
                'assessment_type': assessment_type,
                'assessment_name': f'{assessment_type.title()} Assessment',
                'questions': questions,
                'answers': {},
                'results': {},
                'score': None,
                'completion_date': None
            }
            
            return await self.create_assessment(assessment_data)
        except Exception as e:
            return self._handle_error(e, "kreiranju career assessment")
    
    async def calculate_assessment_results(self, assessment_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate assessment results based on answers."""
        try:
            # Get assessment
            result = self.supabase.table('career_assessments').select('*').eq('id', assessment_id).execute()
            
            if not result.data:
                raise Exception('Assessment nije pronađen')
            
            assessment = result.data[0]
            questions = assessment['questions']
            
            # Calculate score based on assessment type
            score = 0
            total_questions = len(questions)
            
            if assessment['assessment_type'] == 'personality':
                # Simple scoring for personality assessment
                score = (len(answers) / total_questions) * 100
            elif assessment['assessment_type'] == 'skills':
                # Skills assessment scoring
                score = (len(answers) / total_questions) * 100
            elif assessment['assessment_type'] == 'interests':
                # Interest assessment scoring
                score = (len(answers) / total_questions) * 100
            
            # Generate results based on assessment type
            results = {
                'score': score,
                'total_questions': total_questions,
                'answered_questions': len(answers),
                'assessment_type': assessment['assessment_type']
            }
            
            # Add specific results based on assessment type
            if assessment['assessment_type'] == 'personality':
                results['personality_traits'] = self._analyze_personality_answers(answers)
            elif assessment['assessment_type'] == 'skills':
                results['skill_gaps'] = self._analyze_skill_gaps(answers)
            elif assessment['assessment_type'] == 'interests':
                results['career_interests'] = self._analyze_career_interests(answers)
            
            # Submit results
            return await self.submit_assessment_answers(assessment_id, answers, results, score)
        except Exception as e:
            return self._handle_error(e, "izračunavanju assessment results")
    
    def _analyze_personality_answers(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze personality assessment answers."""
        return {
            'teamwork_preference': 'high' if 'B' in answers.values() else 'low',
            'stress_management': 'good' if 'B' in answers.values() else 'needs_improvement',
            'decision_style': 'analytical' if 'B' in answers.values() else 'intuitive'
        }
    
    def _analyze_skill_gaps(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze skill assessment answers for gaps."""
        return {
            'technical_skills': 'intermediate',
            'soft_skills': 'good',
            'management_skills': 'beginner'
        }
    
    def _analyze_career_interests(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze career interest assessment answers."""
        return {
            'primary_interest': 'technology',
            'work_style': 'dynamic',
            'career_goal': 'technical_expert'
        } 