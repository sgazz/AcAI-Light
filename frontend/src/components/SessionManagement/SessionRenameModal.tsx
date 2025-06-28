'use client';

import { useState, useEffect } from 'react';
import { FaEdit, FaTimes, FaSave, FaTrash } from 'react-icons/fa';
import { useErrorToast } from '../ErrorToastProvider';

interface SessionRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentName?: string;
  onRename: (sessionId: string, newName: string) => Promise<void>;
  onDelete?: (sessionId: string) => Promise<void>;
}

export default function SessionRenameModal({
  isOpen,
  onClose,
  sessionId,
  currentName = '',
  onRename,
  onDelete
}: SessionRenameModalProps) {
  const [newName, setNewName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, currentName]);

  const handleRename = async () => {
    if (!newName.trim()) {
      showError('Naziv sesije ne može biti prazan', 'Greška');
      return;
    }

    if (newName.trim() === currentName) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onRename(sessionId, newName.trim());
      showSuccess('Sesija uspešno preimenovana', 'Preimenovanje');
      onClose();
    } catch (error: any) {
      showError(error.message || 'Greška pri preimenovanju sesije', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsLoading(true);
    try {
      await onDelete(sessionId);
      showSuccess('Sesija uspešno obrisana', 'Brisanje');
      onClose();
    } catch (error: any) {
      showError(error.message || 'Greška pri brisanju sesije', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <FaEdit className="inline mr-2" />
            Preimenuj sesiju
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          {/* Session ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID sesije:
            </label>
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border">
              {sessionId}
            </div>
          </div>

          {/* Current Name */}
          {currentName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trenutni naziv:
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded border border-blue-200 dark:border-blue-800">
                {currentName}
              </div>
            </div>
          )}

          {/* New Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Novi naziv:
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Unesite novi naziv sesije..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <p>💡 Saveti za naziv:</p>
            <ul className="mt-1 space-y-1">
              <li>• Koristite opisne nazive (npr. "Pitanja o React-u")</li>
              <li>• Dodajte datum ako je potrebno</li>
              <li>• Maksimalno 100 karaktera</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2">
              <button
                onClick={handleRename}
                disabled={isLoading || !newName.trim() || newName.trim() === currentName}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <FaSave />
                <span>Sačuvaj</span>
              </button>
              
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Otkaži
              </button>
            </div>

            {/* Delete Button */}
            {onDelete && (
              <div className="relative">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                  >
                    <FaTrash />
                    <span>Obriši</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                    >
                      Da
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isLoading}
                      className="px-3 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                    >
                      Ne
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 