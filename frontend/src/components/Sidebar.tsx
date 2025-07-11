'use client';

import { FaGraduationCap, FaMicrophone, FaUsers, FaRegLightbulb, FaProjectDiagram, FaBook, FaSuitcase, FaFileAlt, FaTachometerAlt, FaHome, FaShareAlt } from 'react-icons/fa';
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
  { icon: <div><FaShareAlt size={20} /></div>, label: 'File Sharing' },
  // Uklonjen Performance Test
];

export default function Sidebar({ selectedMenu, onMenuSelect }: SidebarProps) {
  return (
    <aside className="flex flex-col justify-between h-full w-full lg:w-80 relative overflow-hidden">
      {/* Premium Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10"></div>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      <div className="relative flex flex-col h-full p-3 lg:p-4 overflow-y-auto">
        {/* Premium Header - Hidden on mobile since we have mobile header */}
        <div className="hidden lg:flex items-center gap-3 mb-8 mt-2 flex-shrink-0">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <FaGraduationCap className="text-white" size={28} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              AI Study Assistant
            </h1>
            <p className="text-xs text-slate-400 font-medium">Premium Learning Experience</p>
          </div>
        </div>

        {/* Premium Navigation */}
        <nav className="flex flex-col gap-2 flex-1 min-h-0">
          {/* Welcome Button */}
          <button
            onClick={() => onMenuSelect(-1)}
            className={`group relative p-3 lg:p-4 rounded-xl lg:rounded-2xl card-hover-profi flex-shrink-0 ${
              -1 === selectedMenu 
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-xl shadow-blue-500/20' 
                : 'hover-border-subtle hover-bg-subtle border border-white/10'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative flex items-center gap-2 lg:gap-3">
              <div className={`p-2 rounded-lg lg:rounded-xl icon-hover-profi ${
                -1 === selectedMenu 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'text-slate-400 group-hover:text-white group-hover:bg-slate-700/50'
              }`}>
                <FaHome size={18} className="lg:w-5 lg:h-5" />
              </div>
              <span className={`font-medium link-hover-profi text-sm lg:text-base ${
                -1 === selectedMenu 
                  ? 'text-white font-semibold' 
                  : 'text-slate-300 group-hover:text-white'
              }`}>
                Welcome
              </span>
            </div>
            
            { -1 === selectedMenu && (
              <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            )}
          </button>
          
          <div className="border-t border-white/10 my-2 flex-shrink-0"></div>

          {menu.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => onMenuSelect(idx)}
              className={`group relative p-3 lg:p-4 rounded-xl lg:rounded-2xl card-hover-profi flex-shrink-0 ${
                idx === selectedMenu 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-xl shadow-blue-500/20' 
                  : 'hover-border-subtle hover-bg-subtle border border-white/10'
              }`}
            >
              {/* Suptilni hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative flex items-center gap-2 lg:gap-3">
                <div className={`p-2 rounded-lg lg:rounded-xl icon-hover-profi ${
                  idx === selectedMenu 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-slate-400 group-hover:text-white group-hover:bg-slate-700/50'
                }`}>
                  <div className="w-4 h-4 lg:w-5 lg:h-5">
                    {item.icon}
                  </div>
                </div>
                <span className={`font-medium link-hover-profi text-sm lg:text-base ${
                  idx === selectedMenu 
                    ? 'text-white font-semibold' 
                    : 'text-slate-300 group-hover:text-white'
                }`}>
                  {item.label}
                </span>
              </div>
              
              {/* Active indicator */}
              {idx === selectedMenu && (
                <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Premium User Profile - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-3 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 backdrop-blur-sm flex-shrink-0 mt-4">
          <div className="relative">
            <img 
              src="https://randomuser.me/api/portraits/men/32.jpg" 
              alt="avatar" 
              className="w-12 h-12 rounded-2xl border-2 border-blue-500/50 shadow-lg" 
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white">Korisnik</div>
            <div className="text-xs text-slate-400">Premium Member</div>
          </div>
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
