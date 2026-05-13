/**
 * Mock data utilities for UI development without live APIs.
 * Use `delay()` to simulate network latency.
 * Use `randomBetween()` for realistic stat variations.
 */

/** Simulate network latency */
export const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

/** Random number between min and max */
export const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Random item from array */
export const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Generate a fake ID */
export const fakeId = () => Math.random().toString(36).substring(2, 11);

/** Generate a realistic date within the last N days */
export const recentDate = (days = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(0, days));
  return d.toISOString();
};
