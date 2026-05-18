const TTL = 5 * 60 * 1000; // 5 minutes

interface Entry<T> { data: T; ts: number; }

const store = new Map<string, Entry<any>>();

export const adminCache = {
  get<T>(key: string): T | null {
    const e = store.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > TTL) { store.delete(key); return null; }
    return e.data as T;
  },
  set<T>(key: string, data: T): void {
    store.set(key, { data, ts: Date.now() });
  },
  update<T>(key: string, updater: (prev: T) => T): void {
    const e = store.get(key);
    if (e) store.set(key, { data: updater(e.data as T), ts: e.ts });
  },
  invalidate(...keys: string[]): void {
    keys.forEach(k => store.delete(k));
  },
  clear(): void { store.clear(); },
};
