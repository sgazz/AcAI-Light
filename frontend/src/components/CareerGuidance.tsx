'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUser, 
  FaTools, 
  FaClipboardCheck, 
  FaBriefcase, 
  FaRoute, 
  FaIndustry, 
  FaChartLine,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaStar,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaCertificate,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner
} from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';
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

  const { showError, showSuccess } = useErrorToast();

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
    { id: 'profile', name: 'Profil', icon: FaUser, color: 'text-blue-600' },
    { id: 'skills', name: 'Veštine', icon: FaTools, color: 'text-green-600' },
    { id: 'assessments', name: 'Testovi', icon: FaClipboardCheck, color: 'text-purple-600' },
    { id: 'jobs', name: 'Poslovi', icon: FaBriefcase, color: 'text-orange-600' },
    { id: 'paths', name: 'Karijera', icon: FaRoute, color: 'text-indigo-600' },
    { id: 'industries', name: 'Industrije', icon: FaIndustry, color: 'text-red-600' },
    { id: 'insights', name: 'Analitika', icon: FaChartLine, color: 'text-teal-600' },
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            <FaSpinner className="animate-spin text-3xl sm:text-4xl text-blue-500" />
            <p className="text-slate-400 text-sm sm:text-base">Učitavanje podataka...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <FaTimesCircle className="text-red-400 text-lg sm:text-xl" />
            <div>
              <h3 className="text-red-300 font-medium text-sm sm:text-base">Greška pri učitavanju</h3>
              <p className="text-red-400 mt-1 text-xs sm:text-sm">{error}</p>
            </div>
          </div>
          <button 
            onClick={loadData}
            className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 text-sm sm:text-base"
          >
            <FaSpinner className="text-sm" />
            <span>Pokušaj ponovo</span>
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl">
            <FaRoute className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Career Guidance</h1>
            <p className="text-slate-400 text-sm sm:text-base">Upravljajte svojom karijerom, veštinama i profesionalnim razvojem</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-4 sm:mb-6">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="text-sm sm:text-lg" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-4 sm:space-y-6">
          {renderTabContent()}
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
          <div className="text-center py-8 sm:py-16">
            <div className="max-w-md mx-auto px-4">
              <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-600">
                <FaUser className="text-4xl sm:text-6xl text-blue-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                  Nema kreiranog profila
                </h3>
                <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">
                  Kreirajte svoj karijerni profil da biste počeli sa planiranjem karijere
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto text-sm sm:text-base"
                >
                  <FaPlus className="text-sm" />
                  <span>Kreiraj profil</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
            <FaUser className="text-blue-500" />
            <span>Karijerni profil</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">Upravljajte svojim profesionalnim informacijama</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center ${
            isEditing 
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          }`}
        >
          {isEditing ? <FaTimesCircle /> : <FaEdit />}
          <span>{isEditing ? 'Otkaži' : 'Uredi profil'}</span>
        </button>
      </div>

      {isEditing ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-slate-600">
                      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Ime i prezime
                </label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-slate-400 text-sm sm:text-base"
                  placeholder="Unesite ime i prezime"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Email adresa
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-slate-400 text-sm sm:text-base"
                  placeholder="vas@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Trenutna pozicija
                </label>
                <input
                  type="text"
                  value={formData.current_position || ''}
                  onChange={(e) => setFormData({ ...formData, current_position: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-slate-400"
                  placeholder="npr. Software Developer"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">
                  Godine iskustva
                </label>
                <input
                  type="number"
                  value={formData.years_of_experience || ''}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-slate-400"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 sm:px-6 py-2 sm:py-3 border border-slate-600 text-slate-300 rounded-lg sm:rounded-xl hover:bg-slate-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                Otkaži
              </button>
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
              >
                Sačuvaj profil
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  <FaUser className="text-blue-500" />
                  <span>Ime i prezime</span>
                </h4>
                <p className="text-slate-300 mt-1 text-lg">{profile?.full_name || 'Nije uneto'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  <FaUser className="text-blue-500" />
                  <span>Email adresa</span>
                </h4>
                <p className="text-slate-300 mt-1 text-lg">{profile?.email || 'Nije uneto'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  <FaBriefcase className="text-green-500" />
                  <span>Trenutna pozicija</span>
                </h4>
                <p className="text-slate-300 mt-1 text-lg">{profile?.current_position || 'Nije uneto'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  <FaClock className="text-orange-500" />
                  <span>Godine iskustva</span>
                </h4>
                <p className="text-slate-300 mt-1 text-lg">{profile?.years_of_experience || '0'} godina</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Skills Tab Component
const SkillsTab: React.FC<{ skills: Skill[]; onUpdate: () => void }> = ({ skills, onUpdate }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const getProficiencyColor = (level: string) => {
    const colors = {
      beginner: 'text-red-500',
      intermediate: 'text-yellow-500',
      advanced: 'text-blue-500',
      expert: 'text-green-500'
    };
    return colors[level as keyof typeof colors] || 'text-gray-500';
  };

  const getProficiencyWidth = (level: string) => {
    const widths = {
      beginner: '25%',
      intermediate: '50%',
      advanced: '75%',
      expert: '100%'
    };
    return widths[level as keyof typeof widths] || '0%';
  };

  return (
    <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
              <FaTools className="text-green-500" />
              <span>Veštine</span>
            </h2>
            <p className="text-slate-400 mt-1 text-sm sm:text-base">Upravljajte svojim tehničkim i soft veštinama</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <FaPlus className="text-sm" />
            <span>Dodaj veštinu</span>
          </button>
        </div>

      {skills.length === 0 ? (
        <div className="text-center py-8 sm:py-16">
          <div className="max-w-md mx-auto px-4">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-600">
              <FaTools className="text-4xl sm:text-6xl text-green-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                Nema dodanih veština
              </h3>
              <p className="text-slate-400 mb-4 sm:mb-6 text-sm sm:text-base">
                Dodajte svoje veštine da biste kreirali kompletan profil
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 mx-auto text-sm sm:text-base"
              >
                <FaPlus className="text-sm" />
                <span>Dodaj prvu veštinu</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div key={skill.id} className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg mb-1">{skill.skill_name}</h3>
                  <p className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded-full inline-block">
                    {skill.skill_category}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                    <FaEdit className="text-sm" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-300">Nivo veštine</span>
                    <span className={`text-sm font-semibold ${getProficiencyColor(skill.proficiency_level)}`}>
                      {skill.proficiency_level}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: getProficiencyWidth(skill.proficiency_level) }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-slate-400">
                  <span className="flex items-center space-x-1">
                    <FaClock className="text-slate-500" />
                    <span>{skill.years_of_experience} godina</span>
                  </span>
                  {skill.is_certified && (
                    <span className="flex items-center space-x-1 text-green-500">
                      <FaCertificate className="text-sm" />
                      <span>Certifikovan</span>
                    </span>
                  )}
                </div>
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
  const getAssessmentTypeColor = (type: string) => {
    const colors = {
      personality: 'text-blue-600 bg-blue-100',
      skills: 'text-green-600 bg-green-100',
      interests: 'text-purple-600 bg-purple-100',
      values: 'text-orange-600 bg-orange-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FaClipboardCheck className="text-purple-600" />
            <span>Karijerni testovi</span>
          </h2>
          <p className="text-slate-400 mt-1">Procenite svoje veštine i interese</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2">
          <FaPlus className="text-sm" />
          <span>Novi test</span>
        </button>
      </div>

      {assessments.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-dashed border-purple-200">
              <FaClipboardCheck className="text-6xl text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Nema završenih testova
              </h3>
              <p className="text-gray-600 mb-6">
                Započnite sa testovima da biste bolje razumeli svoje veštine
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 mx-auto">
                <FaPlus className="text-sm" />
                <span>Započni prvi test</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{assessment.assessment_name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAssessmentTypeColor(assessment.assessment_type)}`}>
                    {assessment.assessment_type}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <FaEye className="text-sm" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {assessment.score && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Rezultat</span>
                      <span className={`text-lg font-bold ${getScoreColor(assessment.score)}`}>
                        {assessment.score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getScoreBg(assessment.score)}`}
                        style={{ width: `${assessment.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {assessment.completion_date && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FaClock className="text-gray-400" />
                    <span>Završen: {new Date(assessment.completion_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {assessment.questions && assessment.questions.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FaClipboardCheck className="text-gray-400" />
                    <span>{assessment.questions.length} pitanja</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                    <FaEye className="text-sm" />
                    <span>Detalji</span>
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <FaDownload className="text-sm" />
                    <span>Izveštaj</span>
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Kreiran: {new Date(assessment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Jobs Tab Component
const JobsTab: React.FC<{ jobs: JobRecommendation[]; onUpdate: () => void }> = ({ jobs, onUpdate }) => {
  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      recommended: 'text-blue-600 bg-blue-100',
      applied: 'text-yellow-600 bg-yellow-100',
      interviewed: 'text-purple-600 bg-purple-100',
      offered: 'text-green-600 bg-green-100',
      rejected: 'text-red-600 bg-red-100',
      accepted: 'text-emerald-600 bg-emerald-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FaBriefcase className="text-orange-600" />
            <span>Preporučeni poslovi</span>
          </h2>
          <p className="text-slate-400 mt-1">Pronađite poslove koji odgovaraju vašim veštinama</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center space-x-2">
          <FaStar className="text-sm" />
          <span>Generiši preporuke</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border-2 border-dashed border-orange-200">
              <FaBriefcase className="text-6xl text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Nema preporučenih poslova
              </h3>
              <p className="text-gray-600 mb-6">
                Generišite preporuke na osnovu vašeg profila i veština
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 mx-auto">
                <FaStar className="text-sm" />
                <span>Generiši prve preporuke</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-xl">{job.job_title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.application_status)}`}>
                      {job.application_status}
                    </span>
                  </div>
                  <p className="text-lg text-gray-700 mb-2">{job.company_name}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <FaMapMarkerAlt className="text-gray-400" />
                      <span>{job.location}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FaClock className="text-gray-400" />
                      <span>{job.job_type}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${getMatchScoreBg(job.match_score)}`}>
                    <FaStar className={`text-sm ${getMatchScoreColor(job.match_score)}`} />
                    <span className={`font-bold ${getMatchScoreColor(job.match_score)}`}>
                      {job.match_score}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{job.salary_range}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700 line-clamp-2">{job.job_description}</p>
              </div>
              
              <div className="space-y-3">
                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Potrebne veštine:</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.slice(0, 5).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {job.preferred_skills && job.preferred_skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Preferirane veštine:</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.preferred_skills.slice(0, 5).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                    <FaCheckCircle className="text-sm" />
                    <span>Prijavi se</span>
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <FaEye className="text-sm" />
                    <span>Detalji</span>
                  </button>
                </div>
                <button className="px-4 py-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <FaDownload className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Paths Tab Component
const PathsTab: React.FC<{ paths: CareerPath[]; onUpdate: () => void }> = ({ paths, onUpdate }) => {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 60) return 'from-blue-500 to-indigo-500';
    if (percentage >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FaRoute className="text-indigo-600" />
            <span>Karijerni putovi</span>
          </h2>
          <p className="text-slate-400 mt-1">Planirajte i pratiте napredak svoje karijere</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2">
          <FaPlus className="text-sm" />
          <span>Novi put</span>
        </button>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-dashed border-indigo-200">
              <FaRoute className="text-6xl text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Nema definisanih karijernih putova
              </h3>
              <p className="text-gray-600 mb-6">
                Kreirajte svoj prvi karijerni put i počnite sa planiranjem
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto">
                <FaPlus className="text-sm" />
                <span>Kreiraj prvi put</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paths.map((path) => (
            <div key={path.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-xl mb-2">{path.path_name}</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-semibold">
                      {path.target_industry}
                    </span>
                    {path.is_active && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                        Aktivan
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <FaEdit className="text-sm" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <FaBriefcase className="text-indigo-500" />
                    <span>Ciljna pozicija</span>
                  </h4>
                  <p className="text-gray-900 font-medium">{path.target_position}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                    <FaClock className="text-indigo-500" />
                    <span>Trajanje</span>
                  </h4>
                  <p className="text-gray-900">{path.estimated_duration_months} meseci</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Napredak</h4>
                    <span className={`text-sm font-bold ${getProgressTextColor(path.progress_percentage)}`}>
                      {path.progress_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`bg-gradient-to-r ${getProgressColor(path.progress_percentage)} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${path.progress_percentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {path.required_skills && path.required_skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Potrebne veštine</h4>
                    <div className="flex flex-wrap gap-2">
                      {path.required_skills.slice(0, 4).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                      {path.required_skills.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{path.required_skills.length - 4} više
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
                    <FaEye className="text-sm" />
                    <span>Detalji</span>
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                    <FaEdit className="text-sm" />
                    <span>Uredi</span>
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Kreiran: {new Date(path.created_at).toLocaleDateString()}</p>
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
  const getDemandColor = (demand: string) => {
    const colors = {
      high: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-red-600 bg-red-100'
    };
    return colors[demand as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getGrowthColor = (growth: number) => {
    if (growth >= 10) return 'text-green-600';
    if (growth >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <FaIndustry className="text-red-600" />
          <span>Industrije i trendovi</span>
        </h2>
        <p className="text-slate-400 mt-1">Istražite različite industrije i njihove trendove</p>
      </div>

      {industries.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-dashed border-red-200">
              <FaIndustry className="text-6xl text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Učitavanje informacija
              </h3>
              <p className="text-gray-600">
                Prikupljamo najnovije podatke o industrijama...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((industry) => (
            <div key={industry.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-xl mb-2">{industry.industry_name}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">{industry.description}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                  <FaEye className="text-sm" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <FaChartLine className="text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Rast</span>
                  </div>
                  <span className={`text-lg font-bold ${getGrowthColor(industry.growth_rate)}`}>
                    +{industry.growth_rate}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <FaBriefcase className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Potražnja</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDemandColor(industry.job_demand)}`}>
                    {industry.job_demand}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <FaStar className="text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Prosečna plata</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {industry.average_salary}
                  </span>
                </div>
              </div>
              
              {industry.key_skills && industry.key_skills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Ključne veštine</h4>
                  <div className="flex flex-wrap gap-2">
                    {industry.key_skills.slice(0, 3).map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        {skill}
                      </span>
                    ))}
                    {industry.key_skills.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{industry.key_skills.length - 3} više
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
                    <FaEye className="text-sm" />
                    <span>Detalji</span>
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Ažurirano: {new Date(industry.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
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
  const stats = [
    {
      title: 'Ukupno veština',
      value: insights?.total_skills || 0,
      icon: FaTools,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Završeni testovi',
      value: insights?.completed_assessments || 0,
      icon: FaClipboardCheck,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Aktivni putovi',
      value: insights?.active_paths || 0,
      icon: FaRoute,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'from-purple-50 to-violet-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Preporučeni poslovi',
      value: insights?.job_recommendations || 0,
      icon: FaBriefcase,
      color: 'from-orange-500 to-red-500',
      bgColor: 'from-orange-50 to-red-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Prosečan match score',
      value: `${insights?.average_match_score || 0}%`,
      icon: FaStar,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Dani aktivnosti',
      value: insights?.active_days || 0,
      icon: FaClock,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'from-teal-50 to-cyan-50',
      borderColor: 'border-teal-200'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <FaChartLine className="text-teal-600" />
          <span>Karijerna analitika</span>
        </h2>
        <p className="text-slate-400 mt-1">Pregled vašeg napretka i aktivnosti</p>
      </div>

      {!insights ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-dashed border-teal-200">
              <FaChartLine className="text-6xl text-teal-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Učitavanje analitike
              </h3>
              <p className="text-gray-600">
                Prikupljamo podatke o vašem napretku...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className={`bg-gradient-to-br ${stat.bgColor} rounded-xl border ${stat.borderColor} p-6 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-lg`}>
                      <IconComponent className="text-white text-xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-700">{stat.title}</h3>
                </div>
              );
            })}
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <FaRoute className="text-indigo-600" />
              <span>Pregled napretka</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Najbolje veštine</h4>
                                 <div className="space-y-3">
                   {insights?.top_skills && insights.top_skills.length > 0 ? (
                     insights.top_skills.slice(0, 5).map((skill: any, index: number) => (
                       <div key={index} className="flex justify-between items-center">
                         <span className="text-gray-600">{skill.name}</span>
                         <div className="flex items-center space-x-2">
                           <div className="w-20 bg-gray-200 rounded-full h-2">
                             <div 
                               className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                               style={{ width: `${skill.level}%` }}
                             ></div>
                           </div>
                           <span className="text-sm font-semibold text-gray-700">{skill.level}%</span>
                         </div>
                       </div>
                     ))
                   ) : (
                     <p className="text-gray-500 text-sm">Nema podataka o veštinama</p>
                   )}
                 </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Preporučene industrije</h4>
                                 <div className="space-y-3">
                   {insights?.recommended_industries && insights.recommended_industries.length > 0 ? (
                     insights.recommended_industries.slice(0, 5).map((industry: any, index: number) => (
                       <div key={index} className="flex justify-between items-center">
                         <span className="text-gray-600">{industry.name}</span>
                         <span className="text-sm font-semibold text-green-600">{industry.match_score}%</span>
                       </div>
                     ))
                   ) : (
                     <p className="text-gray-500 text-sm">Nema podataka o industrijama</p>
                   )}
                 </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <FaClock className="text-orange-600" />
              <span>Nedavne aktivnosti</span>
            </h3>
            
                         <div className="space-y-4">
               {insights?.recent_activities && insights.recent_activities.length > 0 ? (
                 insights.recent_activities.slice(0, 5).map((activity: any, index: number) => (
                   <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                     <div className="p-2 bg-blue-100 rounded-lg">
                       <FaCheckCircle className="text-blue-600 text-sm" />
                     </div>
                     <div className="flex-1">
                       <p className="text-gray-900 font-medium">{activity.description}</p>
                       <p className="text-sm text-gray-500">{activity.date}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <p className="text-gray-500 text-center py-8">Nema nedavnih aktivnosti</p>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerGuidance; 