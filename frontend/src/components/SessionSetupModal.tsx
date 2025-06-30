'use client';

import { useState } from 'react';
import { 
  FaTimes, 
  FaGraduationCap, 
  FaCalculator, 
  FaAtom, 
  FaCode, 
  FaLanguage, 
  FaFlask, 
  FaBook, 
  FaGlobe, 
  FaPalette,
  FaCog,
  FaArrowRight,
  FaPlus
} from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';

interface SessionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (subject: string, topic: string, sessionType: 'subject' | 'general') => void;
}

// Predmeti sa ikonama
const subjects = [
  { id: 'matematika', name: 'Matematika', icon: <FaCalculator size={24} />, color: 'from-blue-500 to-cyan-500' },
  { id: 'fizika', name: 'Fizika', icon: <FaAtom size={24} />, color: 'from-purple-500 to-pink-500' },
  { id: 'hemija', name: 'Hemija', icon: <FaFlask size={24} />, color: 'from-green-500 to-emerald-500' },
  { id: 'programiranje', name: 'Programiranje', icon: <FaCode size={24} />, color: 'from-orange-500 to-red-500' },
  { id: 'jezik', name: 'Jezik', icon: <FaLanguage size={24} />, color: 'from-indigo-500 to-purple-500' },
  { id: 'istorija', name: 'Istorija', icon: <FaBook size={24} />, color: 'from-yellow-500 to-orange-500' },
  { id: 'geografija', name: 'Geografija', icon: <FaGlobe size={24} />, color: 'from-teal-500 to-cyan-500' },
  { id: 'umetnost', name: 'Umetnost', icon: <FaPalette size={24} />, color: 'from-pink-500 to-rose-500' },
];

// Oblasti za svaki predmet
const topicsBySubject = {
  matematika: [
    'Algebra', 'Geometrija', 'Trigonometrija', 'Kalkulus', 'Statistika', 
    'Linearna algebra', 'Diskretna matematika', 'Analitička geometrija'
  ],
  fizika: [
    'Mehanika', 'Termodinamika', 'Elektromagnetizam', 'Optika', 'Kvantna fizika',
    'Astrofizika', 'Nuklearna fizika', 'Akustika'
  ],
  hemija: [
    'Opšta hemija', 'Organska hemija', 'Anorganska hemija', 'Fizička hemija',
    'Biohemija', 'Analitička hemija', 'Polimeri', 'Elektrohemija'
  ],
  programiranje: [
    'Python', 'JavaScript', 'Java', 'C++', 'React', 'Node.js', 'Algoritmi',
    'Strukture podataka', 'Baze podataka', 'Web development'
  ],
  jezik: [
    'Gramatika', 'Pisanje', 'Čitanje', 'Govor', 'Vokabular', 'Literatura',
    'Pravopis', 'Interpunkcija'
  ],
  istorija: [
    'Antička istorija', 'Srednji vek', 'Renesansa', 'Revolucije', 'Svetski ratovi',
    'Hladni rat', 'Savremena istorija', 'Kulturna istorija'
  ],
  geografija: [
    'Fizička geografija', 'Ljudska geografija', 'Ekonomija', 'Politička geografija',
    'Klimatologija', 'Demografija', 'Urbanizam', 'Globalizacija'
  ],
  umetnost: [
    'Istorija umetnosti', 'Teorija umetnosti', 'Crtež', 'Slikarstvo', 'Skulptura',
    'Arhitektura', 'Fotografija', 'Digitalna umetnost'
  ],
};

export default function SessionSetupModal({ isOpen, onClose, onStartSession }: SessionSetupModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'subject' | 'general'>('subject');

  const handleStartSession = () => {
    if (sessionType === 'general') {
      onStartSession('general', 'General Chat', 'general');
    } else if (selectedSubject && selectedTopic) {
      onStartSession(selectedSubject, selectedTopic, 'subject');
    }
    onClose();
  };

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
  };

  const handleGeneralSession = () => {
    setSessionType('general');
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const handleSubjectSession = () => {
    setSessionType('subject');
  };

  const canStartSession = sessionType === 'general' || (selectedSubject && selectedTopic);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <FaTimes size={20} />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Kreirajte novu sesiju
            </h2>
            <p className="text-slate-300">
              Izaberite predmet i oblast ili započnite generalnu sesiju
            </p>
          </div>

          {/* Session Type Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Tip sesije</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleSubjectSession}
                className={`p-4 rounded-xl border transition-all ${
                  sessionType === 'subject'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaGraduationCap size={20} />
                  <div className="text-left">
                    <div className="font-medium">Predmetna sesija</div>
                    <div className="text-sm opacity-70">Fokus na specifičan predmet i oblast</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleGeneralSession}
                className={`p-4 rounded-xl border transition-all ${
                  sessionType === 'general'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FaCog size={20} />
                  <div className="text-left">
                    <div className="font-medium">Generalna sesija</div>
                    <div className="text-sm opacity-70">Opšta pitanja i razgovor</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {sessionType === 'subject' && (
            <>
              {/* Subject Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Izaberite predmet</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => handleSubjectSelect(subject.id)}
                      className={`p-4 rounded-xl border transition-all ${
                        selectedSubject === subject.id
                          ? 'bg-blue-500/20 border-blue-500/50 text-white'
                          : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${subject.color} text-white`}>
                          {subject.icon}
                        </div>
                        <span className="font-medium text-sm">{subject.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Selection */}
              {selectedSubject && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Izaberite oblast - {subjects.find(s => s.id === selectedSubject)?.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {topicsBySubject[selectedSubject as keyof typeof topicsBySubject]?.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicSelect(topic)}
                        className={`p-3 rounded-lg border transition-all ${
                          selectedTopic === topic
                            ? 'bg-blue-500/20 border-blue-500/50 text-white'
                            : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="font-medium text-sm">{topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Start Session Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStartSession}
              disabled={!canStartSession}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
                canStartSession
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                  : 'bg-white/10 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-2">
                <FaPlus />
                {sessionType === 'general' ? 'Započni generalnu sesiju' : 'Započni sesiju'}
                <FaArrowRight />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
