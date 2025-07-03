'use client';

import { useState, useEffect } from 'react';
import { FaCalculator, FaAtom, FaFlask, FaCode, FaPlay, FaCheck, FaTimes, FaLightbulb, FaChartLine, FaGraduationCap, FaCog } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';

interface Subject {
  name: string;
  topics: string[];
  difficulties: string[];
  problem_types: string[];
}

interface Problem {
  problem_id: string;
  subject: string;
  topic: string;
  difficulty: string;
  problem_type: string;
  question: string;
  options?: string[];
  correct_answer?: any;
  solution?: string;
  hints?: string[];
  explanation?: string;
  tags?: string[];
  created_at?: string;
}

interface ValidationResult {
  is_correct: boolean;
  feedback: string;
  correct_answer: any;
  explanation?: string;
}

export default function ProblemGenerator() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [selectedProblemType, setSelectedProblemType] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [problemHistory, setProblemHistory] = useState<Problem[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'solve' | 'result'>('select');
  
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    loadSubjects();
    loadStats();
    loadProblemsFromDatabase();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await fetch('http://localhost:8001/problems/subjects');
      const data = await response.json();
      
      if (data.status === 'success') {
        setSubjects(data.subjects);
      } else {
        throw new Error(data.message || 'Greška pri učitavanju predmeta');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri učitavanju predmeta', 'Učitavanje');
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8001/problems/stats');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error('Greška pri učitavanju statistika:', error);
    }
  };

  const loadProblemsFromDatabase = async () => {
    try {
      const response = await fetch('http://localhost:8001/problems/database?limit=20');
      const data = await response.json();
      
      if (data.status === 'success') {
        setProblemHistory(data.problems);
        console.log(`✅ Učitano ${data.problems.length} problema iz baze`);
      } else {
        console.warn('Nema problema u bazi ili greška pri učitavanju');
      }
    } catch (error: any) {
      console.error('Greška pri učitavanju problema iz baze:', error);
    }
  };

  const generateProblem = async () => {
    try {
      setIsLoading(true);
      setValidationResult(null);
      setShowSolution(false);
      setUserAnswer('');
      
      const generationData = {
        subject: selectedSubject,
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty,
        problem_type: selectedProblemType || undefined
      };
      
      const response = await fetch('http://localhost:8001/problems/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationData),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setCurrentProblem(data.problem);
        setProblemHistory(prev => [data.problem, ...prev.slice(0, 9)]); // Zadrži poslednjih 10
        setCurrentStep('solve');
        showSuccess('Problem uspešno generisan', 'Generisanje');
      } else {
        throw new Error(data.message || 'Greška pri generisanju problema');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri generisanju problema', 'Generisanje');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAnswer = async () => {
    if (!currentProblem || !userAnswer.trim()) {
      showError('Unesite odgovor pre provere', 'Validacija');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`http://localhost:8001/problems/${currentProblem.problem_id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: userAnswer }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setValidationResult(data.validation);
        setCurrentStep('result');
        
        if (data.validation.is_correct) {
          showSuccess('Odlično! Vaš odgovor je tačan.', 'Validacija');
        } else {
          showError('Vaš odgovor nije tačan. Pokušajte ponovo.', 'Validacija');
        }
      } else {
        throw new Error(data.message || 'Greška pri validaciji odgovora');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri validaciji odgovora', 'Validacija');
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectIcon = (subjectName: string) => {
    switch (subjectName.toLowerCase()) {
      case 'mathematics':
        return <FaCalculator className="text-blue-500" size={24} />;
      case 'physics':
        return <FaAtom className="text-purple-500" size={24} />;
      case 'chemistry':
        return <FaFlask className="text-green-500" size={24} />;
      case 'programming':
        return <FaCode className="text-orange-500" size={24} />;
      default:
        return <FaGraduationCap className="text-gray-500" size={24} />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const renderSubjectSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Problem Generator</h2>
        <p className="text-slate-300">Odaberite predmet i parametre za generisanje problema</p>
      </div>
      
      {/* Predmeti */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Odaberite predmet</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map((subject, index) => (
            <button
              key={index}
              onClick={() => setSelectedSubject(subject.name.toLowerCase())}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedSubject === subject.name.toLowerCase()
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-slate-800/50 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {getSubjectIcon(subject.name)}
                <span className="text-white font-medium">{subject.name}</span>
                <span className="text-xs text-slate-400">{subject.topics.length} tema</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Parametri */}
      {selectedSubject && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Parametri problema</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tema */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tema (opciono)</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Sve teme</option>
                {subjects.find(s => s.name.toLowerCase() === selectedSubject)?.topics.map((topic, index) => (
                  <option key={index} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            
            {/* Nivo težine */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nivo težine</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="beginner">Početnik</option>
                <option value="intermediate">Srednji</option>
                <option value="advanced">Napredni</option>
              </select>
            </div>
            
            {/* Tip problema */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tip problema (opciono)</label>
              <select
                value={selectedProblemType}
                onChange={(e) => setSelectedProblemType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Svi tipovi</option>
                {subjects.find(s => s.name.toLowerCase() === selectedSubject)?.problem_types.map((type, index) => (
                  <option key={index} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={generateProblem}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generisanje...</span>
                </>
              ) : (
                <>
                  <FaPlay size={16} />
                  <span>Generiši problem</span>
                </>
              )}
            </button>
            
            <button
              onClick={loadProblemsFromDatabase}
              disabled={isLoading}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCog size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Statistike */}
      {stats && (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Statistike</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.total_templates}</div>
              <div className="text-sm text-slate-400">Ukupno šablona</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.available_subjects}</div>
              <div className="text-sm text-slate-400">Predmeta</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.templates_by_subject?.mathematics || 0}</div>
              <div className="text-sm text-slate-400">Matematika</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{stats.templates_by_subject?.physics || 0}</div>
              <div className="text-sm text-slate-400">Fizika</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Istorija problema */}
      {problemHistory.length > 0 && (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Istorija problema ({problemHistory.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {problemHistory.slice(0, 5).map((problem, index) => (
              <div
                key={problem.problem_id || index}
                className="p-3 bg-slate-700/50 border border-white/10 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                onClick={() => {
                  setCurrentProblem(problem);
                  setCurrentStep('solve');
                  setUserAnswer('');
                  setValidationResult(null);
                  setShowSolution(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSubjectIcon(problem.subject)}
                    <div>
                      <div className="text-white font-medium">{problem.topic}</div>
                      <div className="text-sm text-slate-400">{problem.question.substring(0, 50)}...</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    {problem.created_at && (
                      <span className="text-xs text-slate-500">
                        {new Date(problem.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProblemSolving = () => (
    <div className="space-y-6">
      {currentProblem && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSubjectIcon(currentProblem.subject)}
              <div>
                <h2 className="text-xl font-bold text-white">{currentProblem.topic}</h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(currentProblem.difficulty)}`}>
                    {currentProblem.difficulty}
                  </span>
                  <span className="text-sm text-slate-400">{currentProblem.problem_type}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setCurrentStep('select')}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Novi problem
            </button>
          </div>
          
          {/* Problem */}
          <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Problem</h3>
            <p className="text-white text-lg mb-6">{currentProblem.question}</p>
            
            {/* Opcije za multiple choice */}
            {currentProblem.options && currentProblem.problem_type === 'multiple_choice' && (
              <div className="space-y-2 mb-6">
                {currentProblem.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setUserAnswer(option)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      userAnswer === option
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-slate-700/50 hover:border-white/20'
                    }`}
                  >
                    <span className="text-white">{String.fromCharCode(65 + index)}. {option}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Input za odgovor */}
            {currentProblem.problem_type !== 'multiple_choice' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Vaš odgovor</label>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Unesite vaš odgovor..."
                />
              </div>
            )}
            
            {/* Hints */}
            {currentProblem.hints && currentProblem.hints.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <FaLightbulb className="text-yellow-400" size={16} />
                  <span className="text-sm font-medium text-yellow-400">Saveti</span>
                </div>
                <ul className="space-y-1">
                  {currentProblem.hints.map((hint, index) => (
                    <li key={index} className="text-sm text-slate-300">• {hint}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Dugmad */}
            <div className="flex gap-3">
              <button
                onClick={validateAnswer}
                disabled={!userAnswer.trim() || isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheck size={16} />
                <span>Proveri odgovor</span>
              </button>
              
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FaLightbulb size={16} />
                <span>{showSolution ? 'Sakrij' : 'Prikaži'} rešenje</span>
              </button>
            </div>
          </div>
          
          {/* Rešenje */}
          {showSolution && currentProblem.solution && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Rešenje</h3>
              <div className="text-white whitespace-pre-line">{currentProblem.solution}</div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      {currentProblem && validationResult && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSubjectIcon(currentProblem.subject)}
              <div>
                <h2 className="text-xl font-bold text-white">Rezultat</h2>
                <span className="text-sm text-slate-400">{currentProblem.topic}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep('select')}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Novi problem
              </button>
              <button
                onClick={() => setCurrentStep('solve')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
          
          {/* Rezultat */}
          <div className={`border rounded-xl p-6 ${
            validationResult.is_correct
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {validationResult.is_correct ? (
                <FaCheck className="text-green-400" size={24} />
              ) : (
                <FaTimes className="text-red-400" size={24} />
              )}
              <h3 className={`text-lg font-semibold ${
                validationResult.is_correct ? 'text-green-400' : 'text-red-400'
              }`}>
                {validationResult.is_correct ? 'Tačno!' : 'Netačno'}
              </h3>
            </div>
            
            <p className="text-white mb-4">{validationResult.feedback}</p>
            
            {!validationResult.is_correct && (
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Tačan odgovor:</h4>
                <p className="text-white font-mono">{validationResult.correct_answer}</p>
              </div>
            )}
            
            {validationResult.explanation && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">Objašnjenje:</h4>
                <p className="text-white">{validationResult.explanation}</p>
              </div>
            )}
          </div>
          
          {/* Rešenje */}
          {currentProblem.solution && (
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detaljno rešenje</h3>
              <div className="text-white whitespace-pre-line">{currentProblem.solution}</div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <FaGraduationCap className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Problem Generator</h1>
            <p className="text-sm text-slate-300">Interaktivno rešavanje problema</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg">
            <FaChartLine size={14} />
            <span className="text-sm">{problemHistory.length} rešeno</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'select' && renderSubjectSelection()}
        {currentStep === 'solve' && renderProblemSolving()}
        {currentStep === 'result' && renderResult()}
      </div>
    </div>
  );
} 