import { useTranslation } from 'react-i18next';
import { RTL_LANGUAGES } from '../../i18n';
import { cn } from '../../lib/utils';
import React from 'react';

interface DirectionalIconProps {
  icon: React.ElementType;
  className?: string;
  /**
   * When true, flips the icon horizontally in RTL mode.
   * Use for directional icons like arrows, chevrons, and back/forward indicators.
   * Do NOT flip for symmetric icons like close (X), settings, etc.
   */
  flip?: boolean;
}

/**
 * Wraps directional icons (arrows, chevrons) and mirrors them in RTL mode.
 *
 * Usage:
 *   <DirectionalIcon icon={ChevronRight} flip />  → flips to ChevronLeft in Arabic
 *   <DirectionalIcon icon={ArrowRight} flip />
 *   <DirectionalIcon icon={X} />                  → never flips (symmetric)
 */
export default function DirectionalIcon({ icon: Icon, className, flip = false }: DirectionalIconProps) {
  const { i18n } = useTranslation();
  const isRtl = RTL_LANGUAGES.includes(i18n.language);

  return (
    <Icon
      className={cn(
        className,
        flip && isRtl && 'scale-x-[-1]'
      )}
    />
  );
}
