import { useState, useEffect } from 'react';

/**
 * Responsive breakpoint hook using Tailwind v4's default breakpoints.
 * Returns the current active breakpoint and boolean helpers.
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop, breakpoint } = useBreakpoint();
 *   {isMobile && <MobileNav />}
 */

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

export function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    let rafId: number;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const breakpoint: Breakpoint =
    width >= breakpoints['2xl'] ? '2xl' :
    width >= breakpoints.xl ? 'xl' :
    width >= breakpoints.lg ? 'lg' :
    width >= breakpoints.md ? 'md' :
    'sm';

  return {
    breakpoint,
    width,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    isAbove: (bp: Breakpoint) => width >= breakpoints[bp],
    isBelow: (bp: Breakpoint) => width < breakpoints[bp],
  };
}
