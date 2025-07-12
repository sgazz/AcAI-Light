'use client';

import { useState, useEffect } from 'react';
import { FaCog, FaSave, FaTimes, FaPalette, FaBell, FaShieldAlt, FaGlobe, FaKeyboard, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useErrorToast } from './ErrorToastProvider';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsData {
  theme: 'light' | 'dark' | 'auto';
  language: 'sr' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    chat: boolean;
    study: boolean;
  };
  privacy: {
    profile_visible: boolean;
    activity_visible: boolean;
    data_collection: boolean;
  };
  accessibility: {
    high_contrast: boolean;
    large_text: boolean;
    reduced_motion: boolean;
  };
}

export default function UserSettings({ isOpen, onClose }: UserSettingsProps) {
  const { user, updateProfile } = useAuth();
  const { showError, showSuccess } = useErrorToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsData>({
    theme: 'dark',
    language: 'sr',
    notifications: {
      email: true,
      push: true,
      chat: true,
      study: true,
    },
    privacy: {
      profile_visible: true,
      activity_visible: false,
      data_collection: true,
    },
    accessibility: {
      high_contrast: false,
      large_text: false,
      reduced_motion: false,
    },
  });

  // Učitaj podešavanja iz user preferences
  useEffect(() => {
    if (user?.preferences && isOpen && typeof user.preferences === 'object') {
      const userPrefs = user.preferences as any;
      setSettings(prev => ({
        ...prev,
        theme: userPrefs.theme || prev.theme,
        language: userPrefs.language || prev.language,
        notifications: { 
          ...prev.notifications, 
          ...(userPrefs.notifications && typeof userPrefs.notifications === 'object' ? userPrefs.notifications : {})
        },
        privacy: { 
          ...prev.privacy, 
          ...(userPrefs.privacy && typeof userPrefs.privacy === 'object' ? userPrefs.privacy : {})
        },
        accessibility: { 
          ...prev.accessibility, 
          ...(userPrefs.accessibility && typeof userPrefs.accessibility === 'object' ? userPrefs.accessibility : {})
        },
      }));
    }
  }, [user, isOpen]);

  const handleSettingChange = (category: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await updateProfile({
        preferences: settings,
      });

      if (success) {
        showSuccess('Podešavanja uspešno sačuvana', 'Podešavanja');
      } else {
        showError('Greška pri čuvanju podešavanja', 'Greška');
      }
    } catch (error) {
      showError('Greška pri čuvanju podešavanja', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Opšta', icon: <FaCog size={16} /> },
    { id: 'notifications', label: 'Obaveštenja', icon: <FaBell size={16} /> },
    { id: 'privacy', label: 'Privatnost', icon: <FaShieldAlt size={16} /> },
    { id: 'accessibility', label: 'Pristupačnost', icon: <FaEye size={16} /> },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <FaCog className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Podešavanja</h2>
                <p className="text-slate-300">Prilagodite svoje iskustvo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-64 bg-white/5 border-r border-white/10">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Opšta podešavanja</h3>
                  
                  {/* Theme */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Tema
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', label: 'Svetla', icon: '☀️' },
                        { value: 'dark', label: 'Tamna', icon: '🌙' },
                        { value: 'auto', label: 'Automatski', icon: '🔄' },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => handleSettingChange('theme', 'theme', theme.value)}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            settings.theme === theme.value
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-2xl mb-2">{theme.icon}</div>
                          <div className="font-medium">{theme.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-white text-sm font-medium mb-3">
                      Jezik
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'sr', label: 'Српски', flag: '🇷🇸' },
                        { value: 'en', label: 'English', flag: '🇺🇸' },
                      ].map((lang) => (
                        <button
                          key={lang.value}
                          onClick={() => handleSettingChange('language', 'language', lang.value)}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            settings.language === lang.value
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-2xl mb-2">{lang.flag}</div>
                          <div className="font-medium">{lang.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Obaveštenja</h3>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email obaveštenja', description: 'Primajte obaveštenja na email' },
                      { key: 'push', label: 'Push obaveštenja', description: 'Primajte obaveštenja u browser-u' },
                      { key: 'chat', label: 'Chat obaveštenja', description: 'Obaveštenja o novim porukama' },
                      { key: 'study', label: 'Study obaveštenja', description: 'Podsetsi za učenje' },
                    ].map((notification) => (
                      <div key={notification.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <div className="font-medium text-white">{notification.label}</div>
                          <div className="text-sm text-slate-300">{notification.description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications[notification.key as keyof typeof settings.notifications]}
                            onChange={(e) => handleSettingChange('notifications', notification.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Privatnost</h3>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'profile_visible', label: 'Vidljivost profila', description: 'Dozvolite drugima da vide vaš profil' },
                      { key: 'activity_visible', label: 'Vidljivost aktivnosti', description: 'Prikažite svoju aktivnost' },
                      { key: 'data_collection', label: 'Sakupljanje podataka', description: 'Dozvolite sakupljanje anonimnih podataka' },
                    ].map((privacy) => (
                      <div key={privacy.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <div className="font-medium text-white">{privacy.label}</div>
                          <div className="text-sm text-slate-300">{privacy.description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.privacy[privacy.key as keyof typeof settings.privacy]}
                            onChange={(e) => handleSettingChange('privacy', privacy.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'accessibility' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Pristupačnost</h3>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'high_contrast', label: 'Visok kontrast', description: 'Povećajte kontrast za bolju vidljivost' },
                      { key: 'large_text', label: 'Veliki tekst', description: 'Povećajte veličinu teksta' },
                      { key: 'reduced_motion', label: 'Smanjena animacija', description: 'Smanjite animacije za bolju pristupačnost' },
                    ].map((accessibility) => (
                      <div key={accessibility.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <div className="font-medium text-white">{accessibility.label}</div>
                          <div className="text-sm text-slate-300">{accessibility.description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.accessibility[accessibility.key as keyof typeof settings.accessibility]}
                            onChange={(e) => handleSettingChange('accessibility', accessibility.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <div className="text-sm text-slate-400">
              Podešavanja se automatski čuvaju
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Zatvori
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSave size={16} />
                {isLoading ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 