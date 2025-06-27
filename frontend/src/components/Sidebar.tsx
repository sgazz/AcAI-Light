'use client';

import { FaGraduationCap, FaMicrophone, FaUsers, FaRegLightbulb, FaProjectDiagram, FaBook, FaSuitcase, FaFileAlt } from 'react-icons/fa';
import { MdQuiz } from 'react-icons/md';
import { HiOutlineDocumentText } from 'react-icons/hi';

interface SidebarProps {
  selectedMenu: number;
  onMenuSelect: (index: number) => void;
}

const menu = [
  { icon: <div><FaRegLightbulb size={20} /></div>, label: 'Active Recall' },
  { icon: <div><FaProjectDiagram size={20} /></div>, label: 'Mind Mapping' },
  { icon: <div><FaMicrophone size={20} /></div>, label: 'Audio Mode' },
  { icon: <div><FaUsers size={20} /></div>, label: 'Study Room' },
  { icon: <div><MdQuiz size={20} /></div>, label: 'Exam Simulation' },
  { icon: <div><HiOutlineDocumentText size={20} /></div>, label: 'Problem Generator' },
  { icon: <div><FaBook size={20} /></div>, label: 'Study Journal' },
  { icon: <div><FaSuitcase size={20} /></div>, label: 'Career Guidance' },
  { icon: <div><FaFileAlt size={20} /></div>, label: 'Dokumenti' },
];

export default function Sidebar({ selectedMenu, onMenuSelect }: SidebarProps) {
  return (
    <aside className="flex flex-col justify-between h-full w-64 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-2xl p-4 shadow-lg border border-[var(--border-color)]">
      <div>
        <div className="flex items-center gap-2 mb-8 mt-2">
          <div className="text-[var(--accent-blue)]"><FaGraduationCap size={28} /></div>
          <span className="text-xl font-bold tracking-wide">AI Study Assistant</span>
        </div>
        <nav className="flex flex-col gap-2">
          {menu.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => onMenuSelect(idx)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-base font-medium hover:bg-[var(--accent-blue)]/20 ${idx === selectedMenu ? 'bg-[var(--accent-blue)]/30' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 p-2 mt-8">
        <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="avatar" className="w-10 h-10 rounded-full border-2 border-[var(--accent-blue)]" />
        <span className="font-semibold">Korisnik</span>
      </div>
    </aside>
  );
} 