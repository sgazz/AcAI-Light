'use client';

import { useState, useEffect } from 'react';
import { 
  FaGraduationCap, 
  FaMicrophone, 
  FaProjectDiagram, 
  FaRegLightbulb,
  FaUsers,
  FaBook,
  FaFileAlt,
  FaRocket,
  FaPlay,
  FaArrowRight,
  FaStar,
  FaClock,
  FaChartLine,
  FaHistory,
  FaComment,
  FaSignInAlt,
  FaPlus
} from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import LoginModal from './LoginModal';
import SessionSetupModal from './SessionSetupModal';
import { useErrorToast } from './ErrorToastProvider';

interface WelcomeScreenProps {
  onStartChat: () => void;
  onSelectFeature: (featureIndex: number) => void;
  hasRecentSessions?: boolean;
  recentSessions?: Array<{
    id: string;
    title: string;
    lastMessage: string;
    timestamp: string;
    messageCount: number;
  }>;
}

// Mock podaci za poslednje sesije
const mockRecentSessions = [
  {
    id: '1',
    title: 'Matematika - Diferencijalni račun',
    lastMessage: 'Možete li mi objasniti pravilo lanca?',
    timestamp: '2024-01-15T14:30:00Z',
    messageCount: 12
  },
  {
    id: '2', 
    title: 'Fizika - Mehanika',
    lastMessage: 'Kako se rešava problem sa silama?',
    timestamp: '2024-01-14T16:45:00Z',
    messageCount: 8
  },
  {
    id: '3',
    title: 'Programiranje - React Hooks',
    lastMessage: 'Kada koristiti useEffect vs useState?',
    timestamp: '2024-01-13T10:20:00Z', 
    messageCount: 15
  }
];

// Predmeti za SessionSetupModal
const subjects = [
  { id: 'matematika', name: 'Matematika' },
  { id: 'fizika', name: 'Fizika' },
  { id: 'hemija', name: 'Hemija' },
  { id: 'programiranje', name: 'Programiranje' },
  { id: 'jezik', name: 'Jezik' },
  { id: 'istorija', name: 'Istorija' },
  { id: 'geografija', name: 'Geografija' },
  { id: 'umetnost', name: 'Umetnost' },
];

const features = [
  {
    icon: <FaRegLightbulb size={24} />,
    title: 'Active Recall',
    description: 'Interaktivno učenje kroz pitanja i odgovore',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  {
    icon: <FaProjectDiagram size={24} />,
    title: 'Mind Mapping',
    description: 'Vizuelno organizovanje koncepata i ideja',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  {
    icon: <FaMicrophone size={24} />,
    title: 'Audio Mode',
    description: 'Govorno komuniciranje sa AI asistentom',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  {
    icon: <FaUsers size={24} />,
    title: 'Study Room',
    description: 'Kolaborativno učenje sa drugima',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  {
    icon: <MdQuiz size={24} />,
    title: 'Exam Simulation',
    description: 'Praksa kroz simulacije ispita',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  {
    icon: <FaBook size={24} />,
    title: 'Study Journal',
    description: 'Praćenje napretka i beleške',
    color: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20'
  }
];

const quickActions = [
  { icon: <FaPlus size={20} />, label: 'Nova Sesija', action: 'session-setup' },
  { icon: <FaRocket size={20} />, label: 'Započni Chat', action: 'chat' },
  { icon: <FaFileAlt size={20} />, label: 'Upload Dokument', action: 'upload' },
  { icon: <FaPlay size={20} />, label: 'Audio Mode', action: 'audio' },
  { icon: <FaProjectDiagram size={20} />, label: 'Mind Map', action: 'mindmap' }
];

export default function WelcomeScreen({ 
  onStartChat, 
  onSelectFeature, 
  hasRecentSessions = false,
  recentSessions = mockRecentSessions
}: WelcomeScreenProps) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const { showError, showSuccess } = useErrorToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setIsVisible(true);
    
    // Auto-rotate feature highlights
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'chat':
        onStartChat();
        break;
      case 'upload':
        onSelectFeature(8); // Dokumenti
        break;
      case 'audio':
        onSelectFeature(2); // Audio Mode
        break;
      case 'mindmap':
        onSelectFeature(1); // Mind Mapping
        break;
      case 'session-setup':
        setShowSessionSetup(true);
        break;
    }
  };



  const handleStartSession = async (subject: string, topic: string, sessionType: 'subject' | 'general') => {
    console.log('Starting session:', { subject, topic, sessionType });
    
    // Kreiraj naslov sesije
    const sessionTitle = sessionType === 'general' 
      ? 'General Chat' 
      : `${subjects.find(s => s.id === subject)?.name} - ${topic}`;
    
    try {
      // Kreiraj novu sesiju u backend-u
      const response = await fetch('http://localhost:8001/chat/new-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const sessionId = data.session_id;
        
        console.log('Session created:', { sessionId, title: sessionTitle, subject, topic, sessionType });
        
        // Kreiraj session metadata
        const metadataResponse = await fetch('http://localhost:8001/session/metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            name: sessionTitle,
            description: `${sessionType === 'general' ? 'Generalna' : 'Predmetna'} sesija za ${sessionType === 'general' ? 'opšta pitanja' : `${subjects.find(s => s.id === subject)?.name} - ${topic}`}`
          })
        });
        
        if (metadataResponse.ok) {
          console.log('Session metadata created successfully');
        }
        
        // Sačuvaj session ID u localStorage
        localStorage.setItem('currentSessionId', sessionId);
        localStorage.setItem('currentSessionTitle', sessionTitle);
        localStorage.setItem('currentSessionType', sessionType);
        
        // Prikaži toast sa informacijama o sesiji
        showSuccess(`Sesija kreirana: ${sessionTitle}`, 'Nova sesija');
        
        // Prebaci na chat
        onStartChat();
      } else {
        console.error('Greška pri kreiranju sesije:', response.status);
        showError('Greška pri kreiranju sesije', 'Greška');
      }
    } catch (error) {
      console.error('Greška pri kreiranju sesije:', error);
      showError('Greška pri kreiranju sesije', 'Greška');
    }
  };

  return (
    <div className={`w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="relative">
              <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl">
                <FaGraduationCap className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              AcAIA
            </h1>
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-3 sm:mb-4">
            Dobrodošli u budućnost učenja
          </h2>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-6 sm:mb-8 lg:mb-10 max-w-3xl mx-auto px-4">
            Vaš AI asistent za pametno učenje, sa naprednim RAG tehnologijama i 
            interaktivnim alatima za maksimalan uspeh
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 justify-center items-center px-4">
            <button
              onClick={() => setShowSessionSetup(true)}
              className="group relative w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl text-white font-semibold text-base sm:text-lg lg:text-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2 justify-center">
                Započni sada
                <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
            
            <button
              onClick={() => setShowLoginModal(true)}
              className="group relative w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl text-white font-semibold text-base sm:text-lg lg:text-xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
            >
              <span className="relative flex items-center gap-2 justify-center">
                <FaSignInAlt />
                Prijavi se
              </span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-4 sm:mb-6 lg:mb-8 text-center">
            Brzi pristup
          </h3>
          
          {/* Recent Sessions */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h4 className="text-base sm:text-lg lg:text-xl font-medium text-white mb-3 sm:mb-4 lg:mb-6 text-center flex items-center justify-center gap-2">
              <FaHistory className="text-blue-400" />
              Poslednje sesije
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto mb-4 sm:mb-6 lg:mb-8">
              {recentSessions?.slice(0, 3).map((session) => (
                <button
                  key={session.id}
                  onClick={() => onStartChat()}
                  className="group p-3 sm:p-4 lg:p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105 text-left"
                >
                  <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                      <FaComment className="text-blue-400" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-white font-medium text-xs sm:text-sm lg:text-base mb-1 truncate">
                        {session.title}
                      </h5>
                      <p className="text-slate-400 text-xs sm:text-sm mb-2 truncate">
                        {session.lastMessage}
                      </p>
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                        <span>{new Date(session.timestamp).toLocaleDateString('sr-RS')}</span>
                        <span>{session.messageCount} poruka</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">
            {quickActions.map((action, index) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.action)}
                className="group p-4 sm:p-6 lg:p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-4">
                  <div className="p-2 sm:p-3 lg:p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg sm:rounded-xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                    {action.icon}
                  </div>
                  <span className="text-white font-medium text-xs sm:text-sm lg:text-base text-center">{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-4 sm:mb-6 lg:mb-8 text-center">
            Istražite mogućnosti
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <button
                key={feature.title}
                onClick={() => onSelectFeature(index)}
                className={`group p-4 sm:p-6 lg:p-8 ${feature.bgColor} backdrop-blur-sm border ${feature.borderColor} rounded-lg sm:rounded-2xl hover:bg-white/5 hover:border-white/20 transition-all duration-300 transform hover:scale-105`}
              >
                <div className="flex items-start gap-3 sm:gap-4 lg:gap-6">
                  <div className={`p-2 sm:p-3 lg:p-4 bg-gradient-to-br ${feature.color} rounded-lg sm:rounded-xl text-white shadow-lg`}>
                    {feature.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-semibold mb-1 sm:mb-2 lg:mb-3 text-sm sm:text-base lg:text-lg">{feature.title}</h4>
                    <p className="text-slate-300 text-xs sm:text-sm lg:text-base">{feature.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            <div className="p-4 sm:p-6 lg:p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-2xl text-center">
              <div className="flex justify-center mb-2 sm:mb-3 lg:mb-4">
                <FaStar className="text-yellow-400" size={20} />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">4.9/5</div>
              <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Korisnička ocena</div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-2xl text-center">
              <div className="flex justify-center mb-2 sm:mb-3 lg:mb-4">
                <FaClock className="text-blue-400" size={20} />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Dostupnost</div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-2xl text-center">
              <div className="flex justify-center mb-2 sm:mb-3 lg:mb-4">
                <FaChartLine className="text-green-400" size={20} />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">+85%</div>
              <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Poboljšanje rezultata</div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="text-center pb-8 sm:pb-12 lg:pb-16">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-3 sm:mb-4 lg:mb-6">
            Kako početi?
          </h3>
          <div className="max-w-3xl mx-auto text-slate-300 text-sm sm:text-base lg:text-lg px-4">
            <p className="mb-3 sm:mb-4 lg:mb-6">
              1. <strong>Upload dokumente</strong> - Dodajte svoje materijale za učenje
            </p>
            <p className="mb-3 sm:mb-4 lg:mb-6">
              2. <strong>Započnite chat</strong> - Postavite pitanja AI asistentu
            </p>
            <p className="mb-3 sm:mb-4 lg:mb-6">
              3. <strong>Istražite alate</strong> - Koristite Mind Mapping, Audio Mode i druge funkcionalnosti
            </p>
            <p>
              4. <strong>Pratite napredak</strong> - Koristite Study Journal za praćenje rezultata
            </p>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Session Setup Modal */}
      <SessionSetupModal
        isOpen={showSessionSetup}
        onClose={() => setShowSessionSetup(false)}
        onStartSession={handleStartSession}
      />
    </div>
  );
}
