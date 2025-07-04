'use client';

import { useState, useEffect } from 'react';
import { FaBook, FaPlus, FaEdit, FaTrash, FaEye, FaBullseye, FaLightbulb, FaChartLine, FaCalendar, FaClock, FaTag } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';
import { 
  createJournalEntry, 
  getJournalEntries, 
  updateJournalEntry, 
  deleteJournalEntry,
  createStudyGoal,
  getStudyGoals,
  updateGoalProgress,
  createFlashcard,
  getFlashcardsForReview,
  reviewFlashcard
} from '../utils/api';

interface JournalEntry {
  id: string;
  user_id: string;
  subject: string;
  topic?: string;
  entry_type: 'reflection' | 'note' | 'question' | 'achievement';
  content: string;
  mood_rating?: number;
  study_time_minutes: number;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface StudyGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  subject?: string;
  target_date: string;
  goal_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target_value: number;
  current_value: number;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  measurement_unit: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Flashcard {
  id: string;
  user_id: string;
  subject: string;
  topic?: string;
  front_content: string;
  back_content: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  mastery_level: number;
  review_count: number;
  days_since_last_review: number;
}

export default function StudyJournal() {
  const [activeTab, setActiveTab] = useState<'entries' | 'goals' | 'flashcards'>('entries');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showCreateFlashcardModal, setShowCreateFlashcardModal] = useState(false);
  
  const [currentUserId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      switch (activeTab) {
        case 'entries':
          const entriesResponse = await getJournalEntries(currentUserId);
          if (entriesResponse.status === 'success') {
            setEntries(entriesResponse.data || []);
          }
          break;
        case 'goals':
          const goalsResponse = await getStudyGoals(currentUserId);
          if (goalsResponse.status === 'success') {
            setGoals(goalsResponse.data || []);
          }
          break;
        case 'flashcards':
          const flashcardsResponse = await getFlashcardsForReview(currentUserId);
          if (flashcardsResponse.status === 'success') {
            setFlashcards(flashcardsResponse.data || []);
          }
          break;
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri učitavanju podataka', 'Greška učitavanja');
    } finally {
      setIsLoading(false);
    }
  };

  const createEntry = async (entryData: any) => {
    try {
      const response = await createJournalEntry({
        ...entryData,
        user_id: currentUserId
      });
      
      if (response.status === 'success') {
        showSuccess('Journal entry uspešno kreiran', 'Kreiranje');
        setShowCreateEntryModal(false);
        await loadData();
      } else {
        throw new Error(response.message || 'Greška pri kreiranju entry-ja');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju entry-ja', 'Greška kreiranja');
    }
  };

  const createGoal = async (goalData: any) => {
    try {
      const response = await createStudyGoal({
        ...goalData,
        user_id: currentUserId
      });
      
      if (response.status === 'success') {
        showSuccess('Cilj uspešno kreiran', 'Kreiranje');
        setShowCreateGoalModal(false);
        await loadData();
      } else {
        throw new Error(response.message || 'Greška pri kreiranju cilja');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju cilja', 'Greška kreiranja');
    }
  };

  const createFlashcardHandler = async (flashcardData: any) => {
    try {
      const response = await createFlashcard({
        ...flashcardData,
        user_id: currentUserId
      });
      
      if (response.status === 'success') {
        showSuccess('Flashcard uspešno kreiran', 'Kreiranje');
        setShowCreateFlashcardModal(false);
        await loadData();
      } else {
        throw new Error(response.message || 'Greška pri kreiranju flashcard-a');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju flashcard-a', 'Greška kreiranja');
    }
  };

  const updateGoalProgressHandler = async (goalId: string, newValue: number) => {
    try {
      const response = await updateGoalProgress(goalId, newValue);
      if (response.status === 'success') {
        showSuccess('Napredak ažuriran', 'Ažuriranje');
        await loadData();
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri ažuriranju napretka', 'Greška');
    }
  };

  const getEntryTypeColor = (type: string) => {
    const colors = {
      reflection: 'from-blue-500 to-cyan-500',
      note: 'from-green-500 to-emerald-500',
      question: 'from-yellow-500 to-orange-500',
      achievement: 'from-purple-500 to-pink-500'
    };
    return colors[type as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-400',
      medium: 'text-yellow-400',
      high: 'text-red-400'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-400';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-blue-400',
      completed: 'text-green-400',
      overdue: 'text-red-400',
      cancelled: 'text-gray-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEntries = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h3 className="text-lg sm:text-xl font-semibold text-white">Journal Entries ({entries.length})</h3>
        <button
          onClick={() => setShowCreateEntryModal(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <FaPlus size={14} />
          <span>Novi Entry</span>
        </button>
      </div>
      
      {entries.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <FaBook size={40} className="mx-auto mb-3 sm:mb-4 text-slate-600" />
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Nema journal entries</h3>
          <p className="text-slate-400 mb-4 text-sm sm:text-base">Kreirajte svoj prvi journal entry da počnete praćenje učenja</p>
          <button
            onClick={() => setShowCreateEntryModal(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all mx-auto text-sm sm:text-base"
          >
            <FaPlus size={14} />
            <span>Kreiraj Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-slate-800/50 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-blue-500/30 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 sm:mb-3 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 bg-gradient-to-r ${getEntryTypeColor(entry.entry_type)} rounded-lg`}>
                    <FaBook className="text-white" size={14} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white capitalize text-sm sm:text-base">{entry.entry_type}</h4>
                    <p className="text-xs sm:text-sm text-slate-400">{entry.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  {entry.mood_rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Mood:</span>
                      <span className="text-yellow-400">{entry.mood_rating}/5</span>
                    </div>
                  )}
                  <span className="text-slate-500">{formatDate(entry.created_at)}</span>
                </div>
              </div>
              
              <p className="text-slate-300 mb-2 sm:mb-3 line-clamp-3 text-sm sm:text-base">{entry.content}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400">
                  {entry.study_time_minutes > 0 && (
                    <div className="flex items-center gap-1">
                      <FaClock size={10} />
                      <span>{entry.study_time_minutes} min</span>
                    </div>
                  )}
                  {entry.difficulty_level && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.difficulty_level === 'easy' ? 'bg-green-500/20 text-green-400' :
                      entry.difficulty_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.difficulty_level}
                    </span>
                  )}
                </div>
                
                {entry.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FaTag size={10} className="text-slate-500" />
                    {entry.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                        {tag}
                      </span>
                    ))}
                    {entry.tags.length > 2 && (
                      <span className="text-xs text-slate-500">+{entry.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h3 className="text-lg sm:text-xl font-semibold text-white">Study Goals ({goals.length})</h3>
        <button
          onClick={() => setShowCreateGoalModal(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <FaPlus size={14} />
          <span>Novi Cilj</span>
        </button>
      </div>
      
      {goals.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <FaBullseye size={40} className="mx-auto mb-3 sm:mb-4 text-slate-600" />
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Nema ciljeva</h3>
          <p className="text-slate-400 mb-4 text-sm sm:text-base">Kreirajte svoj prvi cilj da počnete praćenje napretka</p>
          <button
            onClick={() => setShowCreateGoalModal(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all mx-auto text-sm sm:text-base"
          >
            <FaPlus size={14} />
            <span>Kreiraj Cilj</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {goals.map((goal) => {
            const progress = (goal.current_value / goal.target_value) * 100;
            return (
              <div key={goal.id} className="bg-slate-800/50 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-green-500/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 sm:mb-3 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                      <FaBullseye className="text-white" size={14} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm sm:text-base">{goal.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-400">{goal.subject || 'Opšta tema'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className={`${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </span>
                    <span className={`${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                  </div>
                </div>
                
                {goal.description && (
                  <p className="text-slate-300 mb-2 sm:mb-3 text-sm sm:text-base">{goal.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400">Napredak</span>
                    <span className="text-white">{goal.current_value} / {goal.target_value} {goal.measurement_unit}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        progress >= 100 ? 'bg-green-500' : 
                        progress >= 70 ? 'bg-blue-500' : 
                        progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 sm:mt-3 text-xs sm:text-sm text-slate-400 gap-1 sm:gap-2">
                  <div className="flex items-center gap-1">
                    <FaCalendar size={10} />
                    <span>Target: {new Date(goal.target_date).toLocaleDateString('sr-RS')}</span>
                  </div>
                  <span className="capitalize">{goal.goal_type}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFlashcards = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Flashcards za Review ({flashcards.length})</h3>
        <button
          onClick={() => setShowCreateFlashcardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all"
        >
          <FaPlus size={16} />
          <span>Novi Flashcard</span>
        </button>
      </div>
      
      {flashcards.length === 0 ? (
        <div className="text-center py-8">
          <FaLightbulb size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-white mb-2">Nema flashcards za review</h3>
          <p className="text-slate-400 mb-4">Kreirajte flashcards ili sačekajte da budu ponuđeni za ponavljanje</p>
          <button
            onClick={() => setShowCreateFlashcardModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all mx-auto"
          >
            <FaPlus size={16} />
            <span>Kreiraj Flashcard</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {flashcards.map((flashcard) => (
            <div key={flashcard.id} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 hover:border-purple-500/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <FaLightbulb className="text-white" size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{flashcard.subject}</h4>
                    <p className="text-sm text-slate-400">{flashcard.topic || 'Opšta tema'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    flashcard.difficulty_level === 'easy' ? 'bg-green-500/20 text-green-400' :
                    flashcard.difficulty_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {flashcard.difficulty_level}
                  </span>
                  <span className="text-xs text-slate-500">Level {flashcard.mastery_level}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Pitanje:</p>
                  <p className="text-white">{flashcard.front_content}</p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-sm text-slate-400 mb-1">Odgovor:</p>
                  <p className="text-white">{flashcard.back_content}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-slate-400">
                <div className="flex items-center gap-4">
                  <span>Reviews: {flashcard.review_count}</span>
                  <span>Days since: {flashcard.days_since_last_review}</span>
                </div>
                <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors">
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl">
            <FaBook className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Study Journal</h1>
            <p className="text-slate-400 text-sm sm:text-base">Praćenje učenja, ciljeva i flashcards</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
              activeTab === 'entries'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FaBook className="inline mr-2" />
            Journal Entries
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
              activeTab === 'goals'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FaBullseye className="inline mr-2" />
            Goals
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
              activeTab === 'flashcards'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FaLightbulb className="inline mr-2" />
            Flashcards
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-2 border-blue-500 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-slate-400 text-sm sm:text-base">Učitavanje...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {activeTab === 'entries' && renderEntries()}
            {activeTab === 'goals' && renderGoals()}
            {activeTab === 'flashcards' && renderFlashcards()}
          </div>
        )}
      </div>

      {/* Create Entry Modal */}
      {showCreateEntryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Kreiraj Journal Entry</h3>
            <CreateEntryForm onSubmit={createEntry} onCancel={() => setShowCreateEntryModal(false)} />
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Kreiraj Study Goal</h3>
            <CreateGoalForm onSubmit={createGoal} onCancel={() => setShowCreateGoalModal(false)} />
          </div>
        </div>
      )}

      {/* Create Flashcard Modal */}
      {showCreateFlashcardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Kreiraj Flashcard</h3>
            <CreateFlashcardForm onSubmit={createFlashcardHandler} onCancel={() => setShowCreateFlashcardModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Form Components
function CreateEntryForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    entry_type: 'reflection' as const,
    content: '',
    mood_rating: 3,
    study_time_minutes: 0,
    difficulty_level: 'medium' as const,
    tags: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Predmet *</label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({...formData, subject: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Unesite predmet"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tip Entry-ja</label>
        <select
          value={formData.entry_type}
          onChange={(e) => setFormData({...formData, entry_type: e.target.value as any})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="reflection">Refleksija</option>
          <option value="note">Beleška</option>
          <option value="question">Pitanje</option>
          <option value="achievement">Postignuće</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Sadržaj *</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Opišite šta ste naučili..."
          rows={4}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Raspoloženje (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={formData.mood_rating}
            onChange={(e) => setFormData({...formData, mood_rating: parseInt(e.target.value)})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Vreme učenja (min)</label>
          <input
            type="number"
            min="0"
            value={formData.study_time_minutes}
            onChange={(e) => setFormData({...formData, study_time_minutes: parseInt(e.target.value)})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          Kreiraj
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

function CreateGoalForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    target_date: '',
    goal_type: 'weekly' as const,
    target_value: 0,
    priority: 'medium' as const,
    measurement_unit: 'minutes'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Naziv *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Unesite naziv cilja"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Opis</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Opis cilja (opciono)"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Predmet</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            placeholder="Predmet"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tip</label>
          <select
            value={formData.goal_type}
            onChange={(e) => setFormData({...formData, goal_type: e.target.value as any})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="daily">Dnevni</option>
            <option value="weekly">Nedeljni</option>
            <option value="monthly">Mesečni</option>
            <option value="custom">Prilagođeni</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Target Datum *</label>
          <input
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({...formData, target_date: e.target.value})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Target Vrednost *</label>
          <input
            type="number"
            min="1"
            value={formData.target_value}
            onChange={(e) => setFormData({...formData, target_value: parseInt(e.target.value)})}
            className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            required
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          Kreiraj
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

function CreateFlashcardForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    front_content: '',
    back_content: '',
    difficulty_level: 'medium' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Predmet *</label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({...formData, subject: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Unesite predmet"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tema</label>
        <input
          type="text"
          value={formData.topic}
          onChange={(e) => setFormData({...formData, topic: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Tema (opciono)"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Pitanje *</label>
        <textarea
          value={formData.front_content}
          onChange={(e) => setFormData({...formData, front_content: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Unesite pitanje"
          rows={3}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Odgovor *</label>
        <textarea
          value={formData.back_content}
          onChange={(e) => setFormData({...formData, back_content: e.target.value})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
          placeholder="Unesite odgovor"
          rows={3}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Težina</label>
        <select
          value={formData.difficulty_level}
          onChange={(e) => setFormData({...formData, difficulty_level: e.target.value as any})}
          className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="easy">Lako</option>
          <option value="medium">Srednje</option>
          <option value="hard">Teško</option>
        </select>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
        >
          Kreiraj
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
} 