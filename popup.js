// Popup UI Logic - Handles user interactions and directory selection

import { getSettings, saveSettings, getDirectoryHandle, saveDirectoryHandle } from './storage-manager.js';

// State
let currentSettings = null;
let directoryHandle = null;

// DOM Elements
const statusEl = document.getElementById('status');
const directoryPathEl = document.getElementById('directory-path');
const toggleBtn = document.getElementById('toggle-btn');
const selectDirBtn = document.getElementById('select-dir-btn');

/**
 * Initialize popup
 */
async function init() {
  console.log('[Trade Plan Saver Popup] Initializing...');

  try {
    // Load settings and directory handle
    currentSettings = await getSettings();
    directoryHandle = await getDirectoryHandle();

    console.log('[Trade Plan Saver Popup] Settings loaded:', currentSettings);
    console.log('[Trade Plan Saver Popup] Directory handle:', directoryHandle ? 'Available' : 'Not available');

    // Update UI
    updateUI();

    // Attach event listeners
    attachEventListeners();

  } catch (error) {
    console.error('[Trade Plan Saver Popup] Initialization error:', error);
    showError('Failed to initialize popup');
  }
}

/**
 * Update UI based on current state
 */
function updateUI() {
  // Update status badge
  if (currentSettings.isEnabled) {
    statusEl.textContent = 'Enabled';
    statusEl.className = 'status-badge status-enabled';
    toggleBtn.textContent = 'Disable Capture';
    toggleBtn.classList.remove('btn-secondary');
    toggleBtn.classList.add('btn-secondary', 'enabled');
  } else {
    statusEl.textContent = 'Disabled';
    statusEl.className = 'status-badge status-disabled';
    toggleBtn.textContent = 'Enable Capture';
    toggleBtn.className = 'btn btn-secondary';
  }

  // Update directory path
  if (currentSettings.hasDirectoryAccess && directoryHandle) {
    directoryPathEl.textContent = directoryHandle.name || 'Selected';
    directoryPathEl.title = directoryHandle.name || 'Directory selected';
    toggleBtn.disabled = false;
  } else {
    directoryPathEl.textContent = 'None selected';
    directoryPathEl.title = 'Please select a directory first';
    toggleBtn.disabled = true;
  }
}

/**
 * Attach event listeners to buttons
 */
function attachEventListeners() {
  selectDirBtn.addEventListener('click', handleSelectDirectory);
  toggleBtn.addEventListener('click', handleToggleCapture);
}

/**
 * Handle directory selection
 */
async function handleSelectDirectory() {
  console.log('[Trade Plan Saver Popup] Select directory clicked');

  try {
    // Disable button during selection
    selectDirBtn.disabled = true;
    selectDirBtn.textContent = 'Selecting...';
    selectDirBtn.classList.add('pulsing');

    // Request directory access
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads'
    });

    console.log('[Trade Plan Saver Popup] Directory selected:', handle.name);

    // Verify we have permission
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    console.log('[Trade Plan Saver Popup] Initial permission:', permission);

    if (permission !== 'granted') {
      const request = await handle.requestPermission({ mode: 'readwrite' });
      console.log('[Trade Plan Saver Popup] Requested permission:', request);

      if (request !== 'granted') {
        throw new Error('Directory access denied');
      }
    }

    // Save the handle and update settings
    directoryHandle = handle;
    await saveDirectoryHandle(handle);
    await saveSettings({
      hasDirectoryAccess: true,
      directoryPath: handle.name
    });

    currentSettings.hasDirectoryAccess = true;
    currentSettings.directoryPath = handle.name;

    console.log('[Trade Plan Saver Popup] Directory saved successfully');

    // Update UI
    updateUI();

    // Show success feedback
    showSuccess('Directory selected successfully');

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Trade Plan Saver Popup] Directory selection cancelled');
    } else {
      console.error('[Trade Plan Saver Popup] Directory selection error:', error);
      showError('Failed to select directory: ' + error.message);
    }
  } finally {
    // Re-enable button
    selectDirBtn.disabled = false;
    selectDirBtn.textContent = 'Select Save Directory';
    selectDirBtn.classList.remove('pulsing');
  }
}

/**
 * Handle toggle capture button
 */
async function handleToggleCapture() {
  console.log('[Trade Plan Saver Popup] Toggle capture clicked');

  try {
    // Toggle the enabled state
    const newEnabledState = !currentSettings.isEnabled;

    // Save to storage
    await saveSettings({ isEnabled: newEnabledState });
    currentSettings.isEnabled = newEnabledState;

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TOGGLE_CAPTURE',
      enabled: newEnabledState
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Trade Plan Saver Popup] Toggle message error:', chrome.runtime.lastError);
      } else {
        console.log('[Trade Plan Saver Popup] Toggle response:', response);
      }
    });

    // Update UI
    updateUI();

    // Show feedback
    if (newEnabledState) {
      showSuccess('Capture enabled - trade plans will be saved automatically');
    } else {
      showSuccess('Capture disabled');
    }

  } catch (error) {
    console.error('[Trade Plan Saver Popup] Toggle error:', error);
    showError('Failed to toggle capture: ' + error.message);
  }
}

/**
 * Show success message (simple console log for now)
 */
function showSuccess(message) {
  console.log('[Trade Plan Saver Popup] SUCCESS:', message);
  // Could add visual feedback here (e.g., toast notification)
}

/**
 * Show error message
 */
function showError(message) {
  console.error('[Trade Plan Saver Popup] ERROR:', message);
  alert(message); // Simple alert for now
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', init);
