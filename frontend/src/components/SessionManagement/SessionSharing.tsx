'use client';

import { useState, useEffect } from 'react';
import { FaShare, FaCopy, FaLink, FaTimes, FaSave, FaUser, FaEnvelope, FaCalendar, FaClock, FaEye, FaDownload, FaQrcode, FaGlobe } from 'react-icons/fa';
import { formatDate } from '../../utils/dateUtils';
import { useErrorToast } from '../ErrorToastProvider';
import { useClipboard } from '../../utils/clipboard';

interface ShareLink {
  id: string;
  url: string;
  created_at: string;
  expires_at?: string;
  access_count: number;
  is_active: boolean;
  permissions: 'read' | 'read_write' | 'admin';
}

interface ShareSettings {
  allowComments: boolean;
  allowExport: boolean;
  allowDownload: boolean;
  requirePassword: boolean;
  password?: string;
  expiresIn: 'never' | '1h' | '24h' | '7d' | '30d' | 'custom';
  customExpiry?: string;
  maxAccesses?: number;
}

interface SessionSharingProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName?: string;
  onShare?: (settings: ShareSettings) => Promise<ShareLink>;
  onRevoke?: (linkId: string) => Promise<void>;
}

export default function SessionSharing({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  onShare,
  onRevoke
}: SessionSharingProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    allowComments: true,
    allowExport: true,
    allowDownload: false,
    requirePassword: false,
    expiresIn: '7d',
    maxAccesses: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'links' | 'settings' | 'analytics'>('links');
  const { showError, showSuccess } = useErrorToast();
  const { copyToClipboard } = useClipboard();

  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen]);

  const loadShareLinks = async () => {
    try {
      // Simuliramo učitavanje linkova - u realnoj aplikaciji bi ovo bilo API poziv
      const mockLinks: ShareLink[] = [
        {
          id: 'link-001',
          url: 'https://acaia.app/share/session/abc123',
          created_at: '2024-01-20T10:00:00Z',
          expires_at: '2024-01-27T10:00:00Z',
          access_count: 5,
          is_active: true,
          permissions: 'read'
        },
        {
          id: 'link-002',
          url: 'https://acaia.app/share/session/def456',
          created_at: '2024-01-18T14:30:00Z',
          expires_at: undefined,
          access_count: 12,
          is_active: true,
          permissions: 'read_write'
        }
      ];
      setShareLinks(mockLinks);
    } catch (error: any) {
      showError('Greška pri učitavanju linkova za deljenje', 'Greška');
    }
  };

  const handleCreateLink = async () => {
    if (!onShare) return;

    setIsLoading(true);
    try {
      const newLink = await onShare(shareSettings);
      setShareLinks(prev => [newLink, ...prev]);
      setShowCreateLink(false);
      showSuccess('Link za deljenje uspešno kreiran', 'Deljenje');
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju linka', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!onRevoke) return;

    if (!confirm('Da li ste sigurni da želite da opozovete ovaj link?')) return;

    setIsLoading(true);
    try {
      await onRevoke(linkId);
      setShareLinks(prev => prev.filter(link => link.id !== linkId));
      showSuccess('Link uspešno opozvan', 'Opozivanje');
    } catch (error: any) {
      showError(error.message || 'Greška pri opozivanju linka', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };



  const generateQRCode = (url: string) => {
    // U realnoj aplikaciji bi ovo generisalo QR kod
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    window.open(qrUrl, '_blank');
  };

  const getPermissionLabel = (permissions: string) => {
    switch (permissions) {
      case 'read': return 'Samo čitanje';
      case 'read_write': return 'Čitanje i pisanje';
      case 'admin': return 'Administrator';
      default: return permissions;
    }
  };

  const getPermissionColor = (permissions: string) => {
    switch (permissions) {
      case 'read': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'read_write': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isLinkExpired = (link: ShareLink) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <FaShare className="inline mr-2" />
            Deljenje sesije
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Sesija:</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {sessionName || sessionId}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ID: {sessionId}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'links'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <FaLink className="inline mr-2" />
            Linkovi za deljenje
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <FaUser className="inline mr-2" />
            Podešavanja
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <FaEye className="inline mr-2" />
            Analitika
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Aktivni linkovi ({shareLinks.filter(l => l.is_active).length})
              </h3>
              <button
                onClick={() => setShowCreateLink(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <FaShare />
                <span>Kreiraj novi link</span>
              </button>
            </div>

            {shareLinks.length === 0 ? (
              <div className="text-center py-8">
                <FaShare className="mx-auto text-gray-400 text-4xl mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Nema aktivnih linkova za deljenje
                </p>
                <button
                  onClick={() => setShowCreateLink(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Kreiraj prvi link
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map(link => (
                  <div
                    key={link.id}
                    className={`p-4 border rounded-lg transition-all ${
                      !link.is_active || isLinkExpired(link)
                        ? 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                {link.url}
                              </span>
                              {!link.is_active && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs rounded">
                                  Neaktivan
                                </span>
                              )}
                              {isLinkExpired(link) && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs rounded">
                                  Istekao
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${getPermissionColor(link.permissions)}`}>
                            {getPermissionLabel(link.permissions)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <FaCalendar />
                            <span>Kreiran: {formatDate(link.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaEye />
                            <span>{link.access_count} pristupa</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaClock />
                            <span>
                              {link.expires_at 
                                ? `Ističe: ${formatDate(link.expires_at)}`
                                : 'Ne ističe'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(link.url)}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Kopiraj link"
                        >
                          <FaCopy />
                        </button>
                        <button
                          onClick={() => generateQRCode(link.url)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Generiši QR kod"
                        >
                          <FaQrcode />
                        </button>
                        {onRevoke && (
                          <button
                            onClick={() => handleRevokeLink(link.id)}
                            disabled={isLoading}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Opozovi link"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Podešavanja za deljenje
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permissions */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Dozvole</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowComments}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Dozvoli komentare
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowExport}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, allowExport: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Dozvoli export
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowDownload}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, allowDownload: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Dozvoli preuzimanje
                    </span>
                  </label>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Sigurnost</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareSettings.requirePassword}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, requirePassword: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Zahtevaj lozinku
                    </span>
                  </label>
                  {shareSettings.requirePassword && (
                    <input
                      type="password"
                      placeholder="Unesite lozinku"
                      value={shareSettings.password || ''}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Expiry Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Isticanje</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vreme isticanja:
                  </label>
                  <select
                    value={shareSettings.expiresIn}
                    onChange={(e) => setShareSettings(prev => ({ ...prev, expiresIn: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="never">Nikad</option>
                    <option value="1h">1 sat</option>
                    <option value="24h">24 sata</option>
                    <option value="7d">7 dana</option>
                    <option value="30d">30 dana</option>
                    <option value="custom">Prilagođeno</option>
                  </select>
                </div>
                {shareSettings.expiresIn === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prilagođeni datum:
                    </label>
                    <input
                      type="datetime-local"
                      value={shareSettings.customExpiry || ''}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, customExpiry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Access Limits */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Ograničenja pristupa</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maksimalan broj pristupa (opciono):
                </label>
                <input
                  type="number"
                  placeholder="Neograničeno"
                  value={shareSettings.maxAccesses || ''}
                  onChange={(e) => setShareSettings(prev => ({ 
                    ...prev, 
                    maxAccesses: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Analitika deljenja
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {shareLinks.length}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Ukupno linkova</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {shareLinks.filter(l => l.is_active).length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Aktivni linkovi</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {shareLinks.reduce((sum, l) => sum + l.access_count, 0)}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Ukupno pristupa</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {shareLinks.filter(l => isLinkExpired(l)).length}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Istekli linkovi</div>
              </div>
            </div>

            {/* Most Accessed Links */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Najviše korišćeni linkovi
              </h4>
              <div className="space-y-2">
                {shareLinks
                  .sort((a, b) => b.access_count - a.access_count)
                  .slice(0, 5)
                  .map(link => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {link.url.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Kreiran: {formatDate(link.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {link.access_count} pristupa
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getPermissionLabel(link.permissions)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Link Modal */}
        {showCreateLink && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Kreiraj novi link za deljenje
                </h3>
                <button
                  onClick={() => setShowCreateLink(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Kreiraće se novi link sa trenutnim podešavanjima za deljenje.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateLink}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    <FaShare />
                    <span>Kreiraj link</span>
                  </button>
                  <button
                    onClick={() => setShowCreateLink(false)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
} 