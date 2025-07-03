'use client';

import React, { useState, useEffect } from 'react';
import { 
  createCareerProfile, 
  getCareerProfile, 
  updateCareerProfile,
  getUserSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  getSkillsSummary,
  getUserAssessments,
  createCareerAssessment,
  getAssessmentQuestions,
  calculateAssessmentResults,
  getJobRecommendations,
  generateJobRecommendations,
  updateJobApplicationStatus,
  getUserCareerPaths,
  createCareerPath,
  updateCareerPathProgress,
  getAllIndustries,
  getUserCareerInsights
} from '../utils/api';

interface CareerProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  current_position: string;
  years_of_experience: number;
  education_level: string;
  preferred_industries: string[];
  career_goals: string[];
  preferred_locations: string[];
  salary_expectations?: string;
  work_preferences?: string[];
  skills_summary?: string;
  bio?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  created_at: string;
  updated_at: string;
}

interface Skill {
  id: string;
  user_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_of_experience: number;
  self_assessment_score: number;
  is_certified: boolean;
  certification_name?: string;
  certification_date?: string;
  certification_expiry?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Assessment {
  id: string;
  user_id: string;
  assessment_type: 'personality' | 'skills' | 'interests' | 'values';
  assessment_name: string;
  questions: any[];
  answers?: any;
  results?: any;
  score?: number;
  completion_date?: string;
  created_at: string;
}

interface JobRecommendation {
  id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  job_description: string;
  required_skills: string[];
  preferred_skills: string[];
  salary_range: string;
  location: string;
  job_type: string;
  match_score: number;
  application_status: 'recommended' | 'applied' | 'interviewed' | 'offered' | 'rejected' | 'accepted';
  application_date?: string;
  interview_date?: string;
  notes?: string;
  created_at: string;
}

interface CareerPath {
  id: string;
  user_id: string;
  path_name: string;
  target_position: string;
  target_industry: string;
  estimated_duration_months: number;
  required_skills: string[];
  milestones: any[];
  progress_percentage: number;
  is_active: boolean;
  start_date: string;
  target_completion_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Industry {
  id: string;
  industry_name: string;
  description: string;
  growth_rate: number;
  job_demand: 'high' | 'medium' | 'low';
  average_salary: string;
  trends: string[];
  key_skills: string[];
  top_companies: string[];
  future_outlook: string;
  created_at: string;
  updated_at: string;
}

const CareerGuidance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userId] = useState('default_user'); // U realnoj aplikaciji bi došao iz auth-a
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State za različite sekcije
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [insights, setInsights] = useState<any>(null);

  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'profile':
          const profileData = await getCareerProfile(userId);
          setProfile(profileData.data);
          break;
        case 'skills':
          const skillsData = await getUserSkills(userId);
          setSkills(skillsData.data || []);
          break;
        case 'assessments':
          const assessmentsData = await getUserAssessments(userId);
          setAssessments(assessmentsData.data || []);
          break;
        case 'jobs':
          const jobsData = await getJobRecommendations(userId);
          setJobs(jobsData.data || []);
          break;
        case 'paths':
          const pathsData = await getUserCareerPaths(userId);
          setPaths(pathsData.data || []);
          break;
        case 'industries':
          const industriesData = await getAllIndustries();
          setIndustries(industriesData.data || []);
          break;
        case 'insights':
          const insightsData = await getUserCareerInsights(userId);
          setInsights(insightsData.data);
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profil', icon: '👤' },
    { id: 'skills', name: 'Veštine', icon: '🛠️' },
    { id: 'assessments', name: 'Testovi', icon: '📊' },
    { id: 'jobs', name: 'Poslovi', icon: '💼' },
    { id: 'paths', name: 'Karijera', icon: '🎯' },
    { id: 'industries', name: 'Industrije', icon: '🏭' },
    { id: 'insights', name: 'Analitika', icon: '📈' },
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Pokušaj ponovo
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'profile':
        return <ProfileTab profile={profile} onUpdate={loadData} />;
      case 'skills':
        return <SkillsTab skills={skills} onUpdate={loadData} />;
      case 'assessments':
        return <AssessmentsTab assessments={assessments} onUpdate={loadData} />;
      case 'jobs':
        return <JobsTab jobs={jobs} onUpdate={loadData} />;
      case 'paths':
        return <PathsTab paths={paths} onUpdate={loadData} />;
      case 'industries':
        return <IndustriesTab industries={industries} />;
      case 'insights':
        return <InsightsTab insights={insights} />;
      default:
        return <div>Odaberite tab</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Career Guidance
          </h1>
          <p className="text-gray-600">
            Upravljajte svojom karijerom, veštinama i profesionalnim razvojem
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab: React.FC<{ profile: CareerProfile | null; onUpdate: () => void }> = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CareerProfile>>({});

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementacija kreiranja/ažuriranja profila
  };

  if (!profile && !isEditing) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Nema kreiranog profila
        </h3>
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Kreiraj profil
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Karijerni profil</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Otkaži' : 'Uredi'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ime i prezime
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trenutna pozicija
              </label>
              <input
                type="text"
                value={formData.current_position || ''}
                onChange={(e) => setFormData({ ...formData, current_position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Godine iskustva
              </label>
              <input
                type="number"
                value={formData.years_of_experience || ''}
                onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sačuvaj
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900">Ime i prezime</h4>
            <p className="text-gray-600">{profile?.full_name}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Email</h4>
            <p className="text-gray-600">{profile?.email}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Trenutna pozicija</h4>
            <p className="text-gray-600">{profile?.current_position}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Godine iskustva</h4>
            <p className="text-gray-600">{profile?.years_of_experience}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Skills Tab Component
const SkillsTab: React.FC<{ skills: Skill[]; onUpdate: () => void }> = ({ skills, onUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Veštine</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Dodaj veštinu
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nema dodanih veština</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Dodaj prvu veštinu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{skill.skill_name}</h3>
              <p className="text-sm text-gray-600 mb-2">{skill.skill_category}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {skill.proficiency_level}
                </span>
                <span className="text-sm text-gray-500">
                  {skill.years_of_experience} god.
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Assessments Tab Component
const AssessmentsTab: React.FC<{ assessments: Assessment[]; onUpdate: () => void }> = ({ assessments, onUpdate }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Karijerni testovi</h2>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Novi test
        </button>
      </div>

      {assessments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nema završenih testova</p>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Započni prvi test
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{assessment.assessment_name}</h3>
              <p className="text-sm text-gray-600 mb-2">Tip: {assessment.assessment_type}</p>
              {assessment.score && (
                <p className="text-sm text-gray-600">Rezultat: {assessment.score}%</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Jobs Tab Component
const JobsTab: React.FC<{ jobs: JobRecommendation[]; onUpdate: () => void }> = ({ jobs, onUpdate }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Preporuke poslova</h2>
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          Generiši preporuke
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nema preporuka poslova</p>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Generiši prve preporuke
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{job.job_title}</h3>
                <span className="text-sm text-gray-500">{job.match_score}% match</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{job.company_name}</p>
              <p className="text-sm text-gray-600 mb-2">{job.location} • {job.job_type}</p>
              <p className="text-sm text-gray-600">{job.salary_range}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Paths Tab Component
const PathsTab: React.FC<{ paths: CareerPath[]; onUpdate: () => void }> = ({ paths, onUpdate }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Karijerni putovi</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Novi put
        </button>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nema definisanih karijernih putova</p>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Kreiraj prvi put
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paths.map((path) => (
            <div key={path.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{path.path_name}</h3>
              <p className="text-sm text-gray-600 mb-2">
                Cilj: {path.target_position} u {path.target_industry}
              </p>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Napredak</span>
                  <span>{path.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${path.progress_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Industries Tab Component
const IndustriesTab: React.FC<{ industries: Industry[] }> = ({ industries }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Industrije i trendovi</h2>

      {industries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Učitavanje informacija o industrijama...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {industries.map((industry) => (
            <div key={industry.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{industry.industry_name}</h3>
              <p className="text-sm text-gray-600 mb-2">{industry.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-600">+{industry.growth_rate}% rast</span>
                <span className="text-gray-500">{industry.job_demand} potražnja</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Insights Tab Component
const InsightsTab: React.FC<{ insights: any }> = ({ insights }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Karijerna analitika</h2>

      {!insights ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Učitavanje analitike...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Ukupno veština</h3>
            <p className="text-2xl font-bold text-blue-600">{insights.total_skills || 0}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Završeni testovi</h3>
            <p className="text-2xl font-bold text-green-600">{insights.completed_assessments || 0}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2">Aktivni putovi</h3>
            <p className="text-2xl font-bold text-purple-600">{insights.active_paths || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerGuidance; 