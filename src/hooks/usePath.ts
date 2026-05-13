import { useParams } from 'react-router-dom';

/**
 * usePath hook
 * Provides a helper function to prefix any path with the current language code.
 * This ensures that navigation remains within the current locale.
 */
export function usePath() {
  const { lng } = useParams();
  
  const prefix = (path: string) => {
    if (!lng) return path;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `/${lng}${cleanPath}`;
  };

  return { prefix, lng };
}
