import { Platform } from 'react-native';

function encrypted() {
  if (Platform.OS === 'web') return null;
  return require('react-native-encrypted-storage').default as {
    getItem: (k: string) => Promise<string | null>;
    setItem: (k: string, v: string) => Promise<void>;
    removeItem: (k: string) => Promise<void>;
  };
}

/** Key–value storage: encrypted on iOS/Android; localStorage on web. */
export const secureKV = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    const ES = encrypted();
    if (!ES) return null;
    try {
      return await ES.getItem(key);
    } catch {
      return null;
    }
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const ES = encrypted();
    if (!ES) return;
    await ES.setItem(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const ES = encrypted();
    if (!ES) return;
    try {
      await ES.removeItem(key);
    } catch { /* ignore */ }
  },
};
