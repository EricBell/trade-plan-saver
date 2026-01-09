// Storage Manager - Handles chrome.storage.local operations

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
    audioBeepEnabled: true,
    audioBeepVolume: 0.7
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
    await chrome.storage.local.clear();
    console.log('All storage cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}
