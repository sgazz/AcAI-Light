'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaEdit, FaSave, FaTimes, FaCamera, FaCrown, FaCog, FaSignOutAlt, FaUpload } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useErrorToast } from './ErrorToastProvider';
import UserSettings from './UserSettings';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  bio: string;
  avatar_url: string;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, updateProfile, logout } = useAuth();
  const { showError, showSuccess } = useErrorToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    bio: '',
    avatar_url: '',
  });

  // Inicijalizuj form data kada se otvori modal
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user, isOpen]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Ime je obavezno', 'Validacija');
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateProfile({
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        avatar_url: formData.avatar_url.trim(),
      });

      if (success) {
        showSuccess('Profil uspešno ažuriran', 'Ažuriranje');
        setIsEditing(false);
      } else {
        showError('Greška pri ažuriranju profila', 'Greška');
      }
    } catch (error) {
      showError('Greška pri ažuriranju profila', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Resetuj form data na originalne vrednosti
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    if (confirm('Da li ste sigurni da želite da se odjavite?')) {
      await logout();
      onClose();
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Za sada samo simuliraj upload - u realnoj aplikaciji bi se upload-ovao na server
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleInputChange('avatar_url', result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <FaUser className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Korisnički Profil</h2>
                <p className="text-slate-300">Upravljajte svojim podacima</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Profile Content */}
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={formData.avatar_url || "https://randomuser.me/api/portraits/men/32.jpg"} 
                  alt="avatar" 
                  className="w-24 h-24 rounded-2xl border-4 border-blue-500/50 shadow-lg" 
                />
                {isEditing && (
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                    <FaCamera className="text-white" size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">
                    {formData.name || 'Korisnik'}
                  </h3>
                  {user?.is_premium && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                      <FaCrown className="text-white" size={12} />
                      <span className="text-white text-xs font-medium">Premium</span>
                    </div>
                  )}
                </div>
                <p className="text-slate-300">{formData.email}</p>
                {formData.bio && (
                  <p className="text-slate-400 text-sm mt-2">{formData.bio}</p>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Ime i prezime
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Unesite ime i prezime"
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {formData.name || 'Nije postavljeno'}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Email adresa
                </label>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  {formData.email}
                </div>
                <p className="text-slate-400 text-xs mt-1">Email se ne može menjati</p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  O meni
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Napišite nešto o sebi..."
                  />
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white min-h-[60px]">
                    {formData.bio || 'Nije postavljeno'}
                  </div>
                )}
              </div>

              {/* Avatar URL */}
              {isEditing && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaSave size={16} />
                      {isLoading ? 'Čuvanje...' : 'Sačuvaj'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaTimes size={16} />
                      Otkaži
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                  >
                    <FaEdit size={16} />
                    Uredi profil
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
                  title="Podešavanja"
                >
                  <FaCog size={16} />
                  <span className="hidden sm:inline">Podešavanja</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                  title="Odjavi se"
                >
                  <FaSignOutAlt size={16} />
                  <span className="hidden sm:inline">Odjavi se</span>
                </button>
              </div>
            </div>

            {/* Premium Upgrade Section */}
            {!user?.is_premium && (
              <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                    <FaCrown className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">Upgrade na Premium</h4>
                    <p className="text-slate-300 text-sm">Otključajte napredne funkcionalnosti</p>
                  </div>
                  <button className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300">
                    Upgrade
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Settings Modal */}
      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
} 