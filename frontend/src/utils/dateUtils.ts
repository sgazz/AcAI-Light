/**
 * Formatira datum u srpski format
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sr-RS', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatira datum u kratki format (bez vremena)
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sr-RS', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
} 