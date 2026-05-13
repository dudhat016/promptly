import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '../i18n';

interface LanguageGuardProps {
  children: React.ReactNode;
}

/**
 * LanguageGuard
 * Synchronizes the URL language prefix with i18next state.
 * If no prefix is present, it redirects to the detected/default language.
 */
export default function LanguageGuard({ children }: LanguageGuardProps) {
  const { lng } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isSupported = SUPPORTED_LANGUAGES.some(l => l.code === lng);

    if (!lng || !isSupported) {
      // No valid language in URL — redirect to current i18n language or default
      const currentLng = SUPPORTED_LANGUAGES.some(l => l.code === i18n.language) ? i18n.language : 'en';
      
      // Strip the existing invalid language prefix if it exists
      const pathParts = location.pathname.split('/').filter(Boolean);
      let remainingPath = location.pathname;
      
      if (pathParts.length > 0 && (pathParts[0] === lng || !SUPPORTED_LANGUAGES.some(l => l.code === pathParts[0]))) {
        // If the first segment is the current (invalid) lng OR not any supported lng, strip it
        remainingPath = '/' + pathParts.slice(1).join('/');
      }
      
      const targetPath = `${remainingPath}${location.search}`.replace(/\/+$/, '') || '/';
      navigate(`/${currentLng}${targetPath === '/' ? '' : targetPath}`, { replace: true });
      return;
    }

    if (lng !== i18n.language) {
      i18n.changeLanguage(lng);
    }

    // Set document direction
    const isRtl = lng ? RTL_LANGUAGES.includes(lng) : false;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  }, [lng, i18n, navigate, location]);

  return <>{children}</>;
}
