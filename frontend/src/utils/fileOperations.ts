import { useState } from 'react';

/**
 * Custom hook za file operations funkcionalnost
 * Centralizuje logiku za download, preview, delete i upload fajlova
 */
export const useFileOperations = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Download fajla sa URL-a
   */
  const downloadFile = async (url: string, filename: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Fajl uspešno preuzet:', filename);
      return true;
    } catch (error) {
      console.error('Greška pri preuzimanju fajla:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Download fajla sa API endpoint-a
   */
  const downloadFromAPI = async (endpoint: string, filename: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Fajl uspešno preuzet sa API-ja:', filename);
      return true;
    } catch (error) {
      console.error('Greška pri preuzimanju fajla sa API-ja:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Preview fajla (otvaranje u novom tab-u)
   */
  const previewFile = async (url: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const previewUrl = window.URL.createObjectURL(blob);
      window.open(previewUrl, '_blank');
      
      // Cleanup nakon nekog vremena
      setTimeout(() => {
        window.URL.revokeObjectURL(previewUrl);
      }, 60000); // 1 minut
      
      console.log('Fajl uspešno otvoren za preview:', url);
      return true;
    } catch (error) {
      console.error('Greška pri otvaranju preview-a:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Preview fajla sa API endpoint-a
   */
  const previewFromAPI = async (endpoint: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const previewUrl = window.URL.createObjectURL(blob);
      window.open(previewUrl, '_blank');
      
      // Cleanup nakon nekog vremena
      setTimeout(() => {
        window.URL.revokeObjectURL(previewUrl);
      }, 60000); // 1 minut
      
      console.log('Fajl uspešno otvoren za preview sa API-ja:', endpoint);
      return true;
    } catch (error) {
      console.error('Greška pri otvaranju preview-a sa API-ja:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete fajla sa potvrdom
   */
  const deleteFile = async (
    deleteFunction: () => Promise<boolean>, 
    confirmMessage: string = 'Da li ste sigurni da želite da obrišete ovaj fajl?'
  ): Promise<boolean> => {
    if (!confirm(confirmMessage)) {
      return false;
    }

    try {
      setIsLoading(true);
      const success = await deleteFunction();
      
      if (success) {
        console.log('Fajl uspešno obrisan');
      } else {
        console.error('Greška pri brisanju fajla');
      }
      
      return success;
    } catch (error) {
      console.error('Greška pri brisanju fajla:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upload fajla sa progress tracking-om
   */
  const uploadFile = async (
    file: File, 
    uploadEndpoint: string, 
    onProgress?: (progress: number) => void,
    additionalParams?: Record<string, string>
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Dodaj dodatne parametre
      if (additionalParams) {
        Object.entries(additionalParams).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Fajl uspešno uploadovan:', file.name);
              resolve({ success: true, data: response });
            } catch (error) {
              console.error('Greška pri parsiranju odgovora:', error);
              resolve({ success: false, error: 'Greška pri parsiranju odgovora' });
            }
          } else {
            console.error('Greška pri upload-u:', xhr.statusText);
            resolve({ success: false, error: xhr.statusText });
          }
        });

        xhr.addEventListener('error', () => {
          console.error('Greška pri upload-u:', xhr.statusText);
          resolve({ success: false, error: xhr.statusText });
        });

        xhr.open('POST', uploadEndpoint);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Greška pri upload-u fajla:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Nepoznata greška' };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    downloadFile,
    downloadFromAPI,
    previewFile,
    previewFromAPI,
    deleteFile,
    uploadFile
  };
};

/**
 * Standalone funkcije za file operations (bez state-a)
 */
export const downloadFile = async (url: string, filename: string): Promise<boolean> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log('Fajl uspešno preuzet:', filename);
    return true;
  } catch (error) {
    console.error('Greška pri preuzimanju fajla:', error);
    return false;
  }
};

export const previewFile = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const previewUrl = window.URL.createObjectURL(blob);
    window.open(previewUrl, '_blank');
    
    // Cleanup nakon nekog vremena
    setTimeout(() => {
      window.URL.revokeObjectURL(previewUrl);
    }, 60000); // 1 minut
    
    console.log('Fajl uspešno otvoren za preview:', url);
    return true;
  } catch (error) {
    console.error('Greška pri otvaranju preview-a:', error);
    return false;
  }
}; 