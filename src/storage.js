// localStorage can throw (private mode, blocked storage), so every access is guarded.
const PREFIX = 'dollfighters.';

export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore: settings just won't persist
    }
  },
};
