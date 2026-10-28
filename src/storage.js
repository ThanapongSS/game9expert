// localStorage can throw (private mode, blocked storage), so every access is guarded.
export function createStorage(prefix) {
  return {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(prefix + key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false; // settings just won't persist
      }
    },
  };
}

export const storage = createStorage('dollfighters.');
