'use client';

import { useState, useEffect } from 'react';
import { FaTags, FaPlus, FaEdit, FaTrash, FaTimes, FaSave, FaFolder, FaFolderOpen } from 'react-icons/fa';
import { useErrorToast } from '../ErrorToastProvider';

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string;
  sessionCount: number;
}

interface SessionCategoriesProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentCategories: string[];
  onUpdateCategories: (sessionId: string, categories: string[]) => Promise<void>;
}

const DEFAULT_CATEGORIES: Omit<Category, 'sessionCount'>[] = [
  { id: 'work', name: 'Posao', color: '#3B82F6', description: 'Sesije vezane za posao' },
  { id: 'study', name: 'Učenje', color: '#10B981', description: 'Sesije za učenje i edukaciju' },
  { id: 'personal', name: 'Lično', color: '#F59E0B', description: 'Lične sesije' },
  { id: 'research', name: 'Istraživanje', color: '#8B5CF6', description: 'Istraživačke sesije' },
  { id: 'project', name: 'Projekti', color: '#EF4444', description: 'Projektne sesije' },
  { id: 'meeting', name: 'Sastanci', color: '#06B6D4', description: 'Sesije sa sastancima' },
  { id: 'ideas', name: 'Ideje', color: '#84CC16', description: 'Sesije sa idejama' },
  { id: 'archive', name: 'Arhiva', color: '#6B7280', description: 'Arhivirane sesije' },
];

export default function SessionCategories({
  isOpen,
  onClose,
  sessionId,
  currentCategories,
  onUpdateCategories
}: SessionCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentCategories);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6', description: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setSelectedCategories(currentCategories);
    }
  }, [isOpen, currentCategories]);

  const loadCategories = async () => {
    try {
      // Simuliramo učitavanje kategorija - u realnoj aplikaciji bi ovo bilo API poziv
      const mockCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        sessionCount: Math.floor(Math.random() * 10) + 1
      }));
      setCategories(mockCategories);
    } catch (error: any) {
      showError('Greška pri učitavanju kategorija', 'Greška');
    }
  };

  const handleSaveCategories = async () => {
    setIsLoading(true);
    try {
      await onUpdateCategories(sessionId, selectedCategories);
      showSuccess('Kategorije uspešno ažurirane', 'Ažuriranje');
      onClose();
    } catch (error: any) {
      showError(error.message || 'Greška pri ažuriranju kategorija', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      showError('Naziv kategorije ne može biti prazan', 'Greška');
      return;
    }

    const categoryId = newCategory.name.toLowerCase().replace(/\s+/g, '-');
    const newCat: Category = {
      id: categoryId,
      name: newCategory.name.trim(),
      color: newCategory.color,
      description: newCategory.description.trim(),
      sessionCount: 1
    };

    setCategories(prev => [...prev, newCat]);
    setSelectedCategories(prev => [...prev, categoryId]);
    setNewCategory({ name: '', color: '#3B82F6', description: '' });
    setShowAddCategory(false);
    showSuccess('Kategorija uspešno dodata', 'Dodavanje');
  };

  const handleEditCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setNewCategory({
        name: category.name,
        color: category.color,
        description: category.description || ''
      });
      setEditingCategory(categoryId);
      setShowAddCategory(true);
    }
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategory.name.trim()) {
      showError('Naziv kategorije ne može biti prazan', 'Greška');
      return;
    }

    setCategories(prev => prev.map(cat => 
      cat.id === editingCategory 
        ? { ...cat, name: newCategory.name.trim(), color: newCategory.color, description: newCategory.description.trim() }
        : cat
    ));

    setNewCategory({ name: '', color: '#3B82F6', description: '' });
    setEditingCategory(null);
    setShowAddCategory(false);
    showSuccess('Kategorija uspešno ažurirana', 'Ažuriranje');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu kategoriju?')) return;

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    showSuccess('Kategorija uspešno obrisana', 'Brisanje');
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategoryColor = (color: string) => {
    return {
      backgroundColor: color,
      color: '#ffffff'
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <FaTags className="inline mr-2" />
            Kategorije sesije
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Sesija:</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{sessionId}</p>
          </div>

          {/* Current Categories */}
          {selectedCategories.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Izabrane kategorije:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId);
                  return category ? (
                    <span
                      key={categoryId}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                      style={getCategoryColor(category.color)}
                    >
                      {category.name}
                      <button
                        onClick={() => toggleCategory(categoryId)}
                        className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                      >
                        <FaTimes size={12} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Categories List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Dostupne kategorije:</h3>
              <button
                onClick={() => {
                  setShowAddCategory(true);
                  setEditingCategory(null);
                  setNewCategory({ name: '', color: '#3B82F6', description: '' });
                }}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
              >
                <FaPlus size={12} />
                <span>Dodaj kategoriju</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map(category => (
                <div
                  key={category.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedCategories.includes(category.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({category.sessionCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category.id);
                        }}
                        className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                      >
                        <FaEdit size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                  {category.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add/Edit Category Form */}
          {showAddCategory && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                {editingCategory ? 'Izmeni kategoriju' : 'Dodaj novu kategoriju'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Naziv:
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Unesite naziv kategorije..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Boja:
                  </label>
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Opis (opciono):
                  </label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Unesite opis kategorije..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <FaSave />
                    <span>{editingCategory ? 'Ažuriraj' : 'Dodaj'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCategory(false);
                      setEditingCategory(null);
                      setNewCategory({ name: '', color: '#3B82F6', description: '' });
                    }}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Otkaži
                  </button>
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
              Otkaži
            </button>
            <button
              onClick={handleSaveCategories}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <FaSave />
              <span>Sačuvaj kategorije</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 