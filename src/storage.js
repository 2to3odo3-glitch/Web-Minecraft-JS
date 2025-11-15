const STORAGE_KEY = 'web-minecraft-js.save';

function getLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    if (!('localStorage' in window)) return null;
    const testKey = '__web_mc_js_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    console.warn('[storage] localStorage unavailable', error);
    return null;
  }
}

export function loadWorld() {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[storage] Failed to parse world save', error);
    return null;
  }
}

export function saveWorld(data) {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[storage] Failed to save world', error);
    return false;
  }
}

export function clearWorld() {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
