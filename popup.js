// Popup UI Logic - Handles user interactions

import { getSettings, saveSettings } from './storage-manager.js';

// State
let currentSettings = null;

// DOM Elements
const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggle-btn');

/**
 * Initialize popup
 */
async function init() {
  console.log('[Trade Plan Saver Popup] Initializing...');

  try {
    // Load settings
    currentSettings = await getSettings();

    console.log('[Trade Plan Saver Popup] Settings loaded:', currentSettings);

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
  // Update status badge and button
  if (currentSettings.isEnabled) {
    statusEl.textContent = 'Enabled';
    statusEl.className = 'status-badge status-enabled';
    toggleBtn.textContent = 'Disable Capture';
    toggleBtn.classList.remove('btn-primary');
    toggleBtn.classList.add('btn-secondary', 'enabled');
  } else {
    statusEl.textContent = 'Disabled';
    statusEl.className = 'status-badge status-disabled';
    toggleBtn.textContent = 'Enable Capture';
    toggleBtn.className = 'btn btn-primary';
  }
}

/**
 * Attach event listeners to buttons
 */
function attachEventListeners() {
  toggleBtn.addEventListener('click', handleToggleCapture);
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
      showSuccess('Capture enabled - trade plans will be saved to Downloads folder');
    } else {
      showSuccess('Capture disabled');
    }

  } catch (error) {
    console.error('[Trade Plan Saver Popup] Toggle error:', error);
    showError('Failed to toggle capture: ' + error.message);
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  console.log('[Trade Plan Saver Popup] SUCCESS:', message);
}

/**
 * Show error message
 */
function showError(message) {
  console.error('[Trade Plan Saver Popup] ERROR:', message);
  alert(message);
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', init);
