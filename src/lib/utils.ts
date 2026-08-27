import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Timestamp } from 'firebase/firestore';

/**
 * Shared className merger — replaces 4 duplicate cn() definitions across the codebase.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safe date formatter that handles Firestore Timestamps, plain objects, and ISO strings.
 * Used across PromptDetailPage, BlogPage, and admin pages.
 */
export function formatDate(date: any): string {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    if (typeof date === 'object' && typeof date.toMillis === 'function') return new Date(date.toMillis()).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch {
    return 'N/A';
  }
}

/**
 * Convert a human-readable string to a URL-safe slug.
 * Used across ExploreSidebar, BlogSidebar, ExplorePage for filter matching.
 */
export function toSlug(text: string): string {
  if (!text) return '';
  try {
    text = decodeURIComponent(text);
  } catch {}
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Convert a slug back to Title Case for display.
 * Used in ExplorePage for dynamic page titles.
 */
export function toTitleCase(str: string): string {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
