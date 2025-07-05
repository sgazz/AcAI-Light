import { useState } from 'react';

/**
 * Custom hook za copy to clipboard funkcionalnost
 * Centralizuje logiku za kopiranje teksta u clipboard
 */
export const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string, successMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
      
      // Log success (kasnije ćemo dodati toast)
      console.log('Kopirano u clipboard:', text);
      if (successMessage) {
        console.log('Success message:', successMessage);
      }
      
      return true;
    } catch (error) {
      console.error('Greška pri kopiranju u clipboard:', error);
      return false;
    }
  };

  return { 
    copyToClipboard, 
    copied 
  };
};

/**
 * Standalone funkcija za copy to clipboard (bez state-a)
 * Koristi se kada ne treba da pratimo copied state
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Kopirano u clipboard:', text);
    return true;
  } catch (error) {
    console.error('Greška pri kopiranju u clipboard:', error);
    return false;
  }
}; 