'use client';

import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaStop, FaClock, FaCheck, FaTimes, FaList, FaPlus, FaEdit, FaTrash, FaEye, FaGraduationCap } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';

interface Exam {
  exam_id: string;
  title: string;
  description: string;
  subject: string;
  duration_minutes: number;
  total_points: number;
  passing_score: number;
  questions: Question[];
  status: string;
  created_by: string;
  is_public: boolean;
  allow_retakes: boolean;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

interface Question {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';
  options: string[];
  correct_answer: any;
  explanation: string;
  points: number;
  difficulty: string;
  subject: string;
  tags: string[];
}

interface ExamAttempt {
  attempt_id: string;
  exam_id: string;
  user_id: string;
  username: string;
  start_time: string;
  end_time?: string;
  answers: Record<string, any>;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  time_taken_minutes: number;
}

export default function ExamSimulation() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhysicsModal, setShowPhysicsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [showExamList, setShowExamList] = useState(true);
  const [examMode, setExamMode] = useState<'list' | 'exam' | 'results'>('list');
  
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    subject: '',
    duration_minutes: 60,
    total_points: 100,
    passing_score: 70,
    is_public: false,
    allow_retakes: true,
    max_attempts: 3
  });

  const [physicsForm, setPhysicsForm] = useState({
    title: 'Ispit iz Fizike',
    count: 10
  });
  
  const [currentUserId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  const [currentUsername] = useState(`Student_${Math.random().toString(36).substr(2, 4)}`);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (examMode === 'exam' && currentAttempt && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examMode, currentAttempt, timeLeft]);

  const loadExams = async () => {
    try {
      setIsLoading(true);
      // Učitaj sve javne ispite i ispite koje je kreirao trenutni korisnik
      const response = await fetch(`http://localhost:8001/exams`);
      const data = await response.json();
      
      if (data.status === 'success') {
        // Filtriraj da prikažeš javne ispite i ispite koje je kreirao trenutni korisnik
        const allExams = data.exams || [];
        const filteredExams = allExams.filter((exam: Exam) => 
          exam.is_public || exam.created_by === currentUserId
        );
        setExams(filteredExams);
      } else {
        throw new Error(data.message || 'Greška pri učitavanju ispita');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri učitavanju ispita', 'Greška učitavanja');
    } finally {
      setIsLoading(false);
    }
  };

  const createExam = async () => {
    try {
      if (!createForm.title.trim()) {
        showError('Naziv ispita je obavezan', 'Validacija');
        return;
      }

      const examData = {
        ...createForm,
        questions: [],
        created_by: currentUserId
      };

      const response = await fetch('http://localhost:8001/exam/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(examData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        showSuccess('Ispit uspešno kreiran', 'Kreiranje ispita');
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          subject: '',
          duration_minutes: 60,
          total_points: 100,
          passing_score: 70,
          is_public: false,
          allow_retakes: true,
          max_attempts: 3
        });
        await loadExams();
      } else {
        throw new Error(data.message || 'Greška pri kreiranju ispita');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju ispita', 'Greška kreiranja');
    }
  };

  const createPhysicsExam = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8001/exam/physics/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(physicsForm),
      });

      const data = await response.json();

      if (data.status === 'success') {
        showSuccess('Ispit iz fizike uspešno kreiran', 'Kreiranje ispita iz fizike');
        setShowPhysicsModal(false);
        setPhysicsForm({
          title: 'Ispit iz Fizike',
          count: 10
        });
        await loadExams();
      } else {
        throw new Error(data.message || 'Greška pri kreiranju ispita iz fizike');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju ispita iz fizike', 'Greška kreiranja');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExam = async () => {
    if (!examToDelete) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:8001/exam/${examToDelete.exam_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        showSuccess('Ispit uspešno obrisan', 'Brisanje ispita');
        setShowDeleteModal(false);
        setExamToDelete(null);
        await loadExams();
      } else {
        throw new Error(data.message || 'Greška pri brisanju ispita');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri brisanju ispita', 'Greška brisanja');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (exam: Exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const startExam = async (exam: Exam) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:8001/exam/${exam.exam_id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUserId,
          username: currentUsername
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setCurrentExam(exam);
        setCurrentAttempt(data.attempt);
        setTimeLeft(exam.duration_minutes * 60); // Konvertuj u sekunde
        setCurrentQuestionIndex(0);
        setAnswers({});
        setExamMode('exam');
        showSuccess('Ispit započet', 'Započinjanje ispita');
      } else {
        throw new Error(data.message || 'Greška pri započinjanju ispita');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri započinjanju ispita', 'Greška započinjanja');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (questionId: string, answer: any) => {
    if (!currentAttempt) return;

    try {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));

      const response = await fetch(`http://localhost:8001/exam/attempt/${currentAttempt.attempt_id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: questionId,
          answer: answer
        }),
      });

      const data = await response.json();
      if (data.status !== 'success') {
        console.error('Greška pri predaji odgovora:', data.message);
      }
    } catch (error: any) {
      console.error('Greška pri predaji odgovora:', error);
    }
  };

  const finishExam = async () => {
    if (!currentAttempt) return;

    try {
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:8001/exam/attempt/${currentAttempt.attempt_id}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.status === 'success') {
        setCurrentAttempt(data.attempt);
        setExamMode('results');
        showSuccess('Ispit završen', 'Završavanje ispita');
      } else {
        throw new Error(data.message || 'Greška pri završavanju ispita');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri završavanju ispita', 'Greška završavanja');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestion = () => {
    if (!currentExam || currentQuestionIndex >= currentExam.questions.length) {
      return null;
    }
    return currentExam.questions[currentQuestionIndex];
  };

  const nextQuestion = () => {
    if (currentExam && currentQuestionIndex < currentExam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (currentExam && index >= 0 && index < currentExam.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const renderQuestion = (question: Question) => {
    const currentAnswer = answers[question.question_id];

    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.question_id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => submitAnswer(question.question_id, e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.question_id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => submitAnswer(question.question_id, e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'short_answer':
        return (
          <div>
            <input
              type="text"
              value={currentAnswer || ''}
              onChange={(e) => submitAnswer(question.question_id, e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Unesite odgovor..."
            />
          </div>
        );

      case 'essay':
        return (
          <div>
            <textarea
              value={currentAnswer || ''}
              onChange={(e) => submitAnswer(question.question_id, e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Unesite odgovor..."
              rows={6}
            />
          </div>
        );

      default:
        return <div className="text-red-400">Nepodržan tip pitanja</div>;
    }
  };

  const renderExamList = () => (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <FaGraduationCap className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Exam Simulation</h2>
            <p className="text-sm text-slate-300">Upravljanje ispitima i testovima</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowPhysicsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <FaGraduationCap size={14} />
            <span>Fizika Ispit</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <FaPlus size={14} />
            <span>Kreiraj ispit</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-slate-400 mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">Učitavanje ispita...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            <FaGraduationCap size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nema dostupnih ispita</p>
            <p className="text-sm">Kreirajte prvi ispit!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div key={exam.exam_id} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{exam.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    exam.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    exam.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {exam.status}
                  </span>
                </div>
                
                <p className="text-slate-300 text-sm mb-3">{exam.description}</p>
                
                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <FaClock size={12} />
                    <span>{exam.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaCheck size={12} />
                    <span>{exam.total_points} poena</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Predmet: {exam.subject}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => startExam(exam)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <FaPlay size={12} />
                    <span>Započni</span>
                  </button>
                  <button className="px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors">
                    <FaEye size={12} />
                  </button>
                  <button 
                    onClick={() => confirmDelete(exam)}
                    className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="Obriši ispit"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderExam = () => {
    if (!currentExam || !currentAttempt) return null;

    const currentQuestion = getCurrentQuestion();
    const progress = ((currentQuestionIndex + 1) / currentExam.questions.length) * 100;

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <FaGraduationCap className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{currentExam.title}</h2>
              <p className="text-sm text-slate-300">Pitanje {currentQuestionIndex + 1} od {currentExam.questions.length}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg">
              <FaClock size={14} />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            
            <button
              onClick={finishExam}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <FaStop size={14} />
              <span>Završi</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>Napredak</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {currentQuestion ? (
                <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Pitanje {currentQuestionIndex + 1}
                    </h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                      {currentQuestion.points} poena
                    </span>
                  </div>
                  
                  <p className="text-white mb-6 text-lg">{currentQuestion.question_text}</p>
                  
                  {renderQuestion(currentQuestion)}
                </div>
              ) : (
                <div className="text-center text-slate-400 mt-8">
                  <p>Nema više pitanja</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex justify-between">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Prethodno</span>
                </button>
                
                <div className="flex gap-2">
                  {currentExam.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        index === currentQuestionIndex
                          ? 'bg-blue-500 text-white'
                          : answers[currentExam.questions[index].question_id]
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === currentExam.questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Sledeće</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!currentAttempt) return null;

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <FaGraduationCap className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Rezultati ispita</h2>
              <p className="text-sm text-slate-300">{currentExam?.title}</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setExamMode('list');
              setCurrentExam(null);
              setCurrentAttempt(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/70 transition-colors"
          >
            <FaList size={14} />
            <span>Nazad na listu</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                currentAttempt.passed 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {currentAttempt.passed ? (
                  <FaCheck size={32} />
                ) : (
                  <FaTimes size={32} />
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                {currentAttempt.passed ? 'Čestitamo!' : 'Pokušajte ponovo'}
              </h3>
              
              <p className="text-slate-300 mb-6">
                {currentAttempt.passed 
                  ? 'Uspešno ste položili ispit!' 
                  : 'Nažalost, niste položili ispit. Možete pokušati ponovo.'
                }
              </p>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ostvareni poeni:</span>
                  <span className="text-white font-semibold">{currentAttempt.score}/{currentAttempt.total_points}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Procenat:</span>
                  <span className="text-white font-semibold">{currentAttempt.percentage.toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Vreme:</span>
                  <span className="text-white font-semibold">{currentAttempt.time_taken_minutes} min</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-semibold ${
                    currentAttempt.passed ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {currentAttempt.passed ? 'Položen' : 'Nije položen'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {examMode === 'list' && renderExamList()}
      {examMode === 'exam' && renderExam()}
      {examMode === 'results' && renderResults()}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Kreiraj novi ispit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Naziv ispita</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Unesite naziv ispita"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Opis</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Unesite opis ispita"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Predmet</label>
                <input
                  type="text"
                  value={createForm.subject}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Unesite predmet"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Trajanje (min)</label>
                  <input
                    type="number"
                    value={createForm.duration_minutes}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ukupno poena</label>
                  <input
                    type="number"
                    value={createForm.total_points}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, total_points: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Prolazni rezultat (%)</label>
                <input
                  type="number"
                  value={createForm.passing_score}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={createForm.is_public}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="is_public" className="text-sm text-slate-300">Javni ispit</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={createExam}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Kreiraj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Physics Exam Modal */}
      {showPhysicsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Kreiraj ispit iz fizike</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Naziv ispita</label>
                <input
                  type="text"
                  value={physicsForm.title}
                  onChange={(e) => setPhysicsForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Unesite naziv ispita"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Broj pitanja</label>
                <input
                  type="number"
                  value={physicsForm.count}
                  onChange={(e) => setPhysicsForm(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  min="1"
                  max="20"
                />
                <p className="text-xs text-slate-400 mt-1">Maksimalno 20 pitanja</p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-300">
                  <strong>Info:</strong> Ispit će biti kreiran sa nasumično odabranim pitanjem iz fizike.
                  Pitanja uključuju multiple choice, true/false i short answer tipove.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPhysicsModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={createPhysicsExam}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Kreiranje...' : 'Kreiraj ispit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && examToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <FaTrash className="text-red-400" size={20} />
              </div>
              <h3 className="text-xl font-bold text-white">Obriši ispit</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-3">
                Da li ste sigurni da želite da obrišete ispit:
              </p>
              <div className="bg-slate-700/50 border border-white/10 rounded-lg p-3">
                <h4 className="font-semibold text-white">{examToDelete.title}</h4>
                <p className="text-sm text-slate-400">{examToDelete.subject} • {examToDelete.total_points} poena</p>
              </div>
              <p className="text-sm text-red-400 mt-3">
                <strong>Upozorenje:</strong> Ova akcija se ne može poništiti!
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setExamToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={deleteExam}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Brisanje...' : 'Obriši'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 