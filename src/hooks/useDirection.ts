import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RTL_LANGUAGES } from '../i18n';

/**
 * Manages the `dir` attribute on <html> based on the current i18n language.
 * Call this once at the app root (e.g., inside App.tsx or a layout wrapper).
 *
 * Returns the current direction ('ltr' | 'rtl') for conditional logic.
 */
export function useDirection() {
  const { i18n } = useTranslation();

  const isRtl = RTL_LANGUAGES.includes(i18n.language);
  const dir = isRtl ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [dir, i18n.language]);

  return { dir, isRtl };
}
