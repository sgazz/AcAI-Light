import { FaFilePdf, FaFileWord, FaFileAlt, FaImage } from 'react-icons/fa';

/**
 * Formatira veličinu fajla u čitljiv format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Vraća ikonicu za tip fajla na osnovu ekstenzije
 */
export function getFileIcon(extension: string, size: number = 20) {
  const ext = extension.toLowerCase();
  switch (ext) {
    case '.pdf':
      return <FaFilePdf className="text-red-500" size={size} />;
    case '.docx':
      return <FaFileWord className="text-blue-500" size={size} />;
    case '.txt':
      return <FaFileAlt className="text-gray-500" size={size} />;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.bmp':
    case '.tiff':
    case '.tif':
      return <FaImage className="text-green-500" size={size} />;
    default:
      return <FaFileAlt className="text-gray-500" size={size} />;
  }
}

/**
 * Proverava da li je fajl slika na osnovu ekstenzije
 */
export function isImageFile(filename: string): boolean {
  const imageTypes = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'];
  const extension = '.' + filename.split('.').pop()?.toLowerCase();
  return imageTypes.includes(extension);
}

/**
 * Podržani tipovi fajlova
 */
export const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'];

/**
 * Maksimalna veličina fajla (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validira fajl na osnovu tipa i veličine
 */
export function validateFile(file: File): string | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!ALLOWED_FILE_TYPES.includes(extension)) {
    return `Format ${extension} nije podržan. Podržani formati: ${ALLOWED_FILE_TYPES.join(', ')}`;
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return `Fajl je prevelik. Maksimalna veličina: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }
  
  return null;
} 