// Storage Manager - Handles chrome.storage.local and IndexedDB operations

const DB_NAME = 'TradePlanSaverDB';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const DIRECTORY_HANDLE_KEY = 'saveDirectory';

/**
 * Open IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save directory handle to IndexedDB
 */
export async function saveDirectoryHandle(handle) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put(handle, DIRECTORY_HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    console.log('Directory handle saved to IndexedDB');
    return true;
  } catch (error) {
    console.error('Failed to save directory handle:', error);
    throw error;
  }
}

/**
 * Get directory handle from IndexedDB
 */
export async function getDirectoryHandle() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const handle = await new Promise((resolve, reject) => {
      const request = store.get(DIRECTORY_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return handle || null;
  } catch (error) {
    console.error('Failed to get directory handle:', error);
    return null;
  }
}

/**
 * Save settings to chrome.storage.local
 */
export async function saveSettings(settings) {
  try {
    await chrome.storage.local.set(settings);
    console.log('Settings saved:', settings);
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get settings from chrome.storage.local
 */
export async function getSettings() {
  const defaults = {
    isEnabled: false,
    hasDirectoryAccess: false,
    directoryPath: null
  };

  try {
    const stored = await chrome.storage.local.get(Object.keys(defaults));
    return { ...defaults, ...stored };
  } catch (error) {
    console.error('Failed to get settings:', error);
    return defaults;
  }
}

/**
 * Clear all storage (for testing/debugging)
 */
export async function clearAllStorage() {
  try {
    // Clear chrome.storage
    await chrome.storage.local.clear();

    // Clear IndexedDB
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('All storage cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}
