import { FaCheckCircle, FaSpinner, FaExclamationTriangle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';

export type StatusType = 'success' | 'loading' | 'error' | 'warning' | 'info';

/**
 * Centralizovana logika za status ikone
 * Koristi se u više komponenti za konzistentan prikaz statusa
 */
export const getStatusIcon = (status: StatusType, size: number = 16, className?: string) => {
  const baseClassName = className || '';
  
  switch (status) {
    case 'success':
      return <FaCheckCircle className={`text-green-400 ${baseClassName}`} size={size} />;
    
    case 'loading':
      return <FaSpinner className={`text-blue-400 animate-spin ${baseClassName}`} size={size} />;
    
    case 'error':
      return <FaExclamationTriangle className={`text-red-400 ${baseClassName}`} size={size} />;
    
    case 'warning':
      return <FaTimesCircle className={`text-yellow-400 ${baseClassName}`} size={size} />;
    
    case 'info':
      return <FaInfoCircle className={`text-blue-400 ${baseClassName}`} size={size} />;
    
    default:
      return <FaInfoCircle className={`text-gray-400 ${baseClassName}`} size={size} />;
  }
};

/**
 * Hook za status ikone sa dodatnim funkcionalnostima
 */
export const useStatusIcons = () => {
  const getStatusIconWithTooltip = (status: StatusType, size: number = 16, tooltip?: string) => {
    const icon = getStatusIcon(status, size);
    
    if (tooltip) {
      return (
        <div className="relative group" title={tooltip}>
          {icon}
        </div>
      );
    }
    
    return icon;
  };

  const getStatusColor = (status: StatusType): string => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'loading':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status: StatusType): string => {
    switch (status) {
      case 'success':
        return 'Uspešno';
      case 'loading':
        return 'Učitava se...';
      case 'error':
        return 'Greška';
      case 'warning':
        return 'Upozorenje';
      case 'info':
        return 'Informacija';
      default:
        return 'Nepoznato';
    }
  };

  return {
    getStatusIcon,
    getStatusIconWithTooltip,
    getStatusColor,
    getStatusText
  };
}; 