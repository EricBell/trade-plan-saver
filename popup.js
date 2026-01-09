// Popup UI Logic - Handles user interactions

import { getSettings, saveSettings } from './storage-manager.js';

// State
let currentSettings = null;

// DOM Elements
const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggle-btn');
const audioBeepToggle = document.getElementById('audio-beep-toggle');
const volumeSlider = document.getElementById('volume-slider');
const volumeDisplay = document.getElementById('volume-display');
const testBeepBtn = document.getElementById('test-beep-btn');

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

  // Update audio settings UI
  audioBeepToggle.checked = currentSettings.audioBeepEnabled;
  const volumePercent = Math.round(currentSettings.audioBeepVolume * 100);
  volumeSlider.value = volumePercent;
  volumeDisplay.textContent = volumePercent + '%';
}

/**
 * Attach event listeners to buttons
 */
function attachEventListeners() {
  toggleBtn.addEventListener('click', handleToggleCapture);
  audioBeepToggle.addEventListener('change', handleAudioBeepToggle);
  volumeSlider.addEventListener('input', handleVolumeChange);
  testBeepBtn.addEventListener('click', handleTestBeep);
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

/**
 * Handle audio beep toggle
 */
async function handleAudioBeepToggle() {
  console.log('[Trade Plan Saver Popup] Audio beep toggle changed');

  try {
    const newState = audioBeepToggle.checked;
    await saveSettings({ audioBeepEnabled: newState });
    currentSettings.audioBeepEnabled = newState;

    console.log('[Trade Plan Saver Popup] Audio beep:', newState ? 'enabled' : 'disabled');
  } catch (error) {
    console.error('[Trade Plan Saver Popup] Audio toggle error:', error);
    showError('Failed to update audio setting');
  }
}

/**
 * Handle volume slider change
 */
async function handleVolumeChange() {
  const volumePercent = parseInt(volumeSlider.value);
  volumeDisplay.textContent = volumePercent + '%';

  // Convert 0-100 to 0-1.0
  const volumeValue = volumePercent / 100;

  try {
    await saveSettings({ audioBeepVolume: volumeValue });
    currentSettings.audioBeepVolume = volumeValue;

    console.log('[Trade Plan Saver Popup] Volume updated:', volumePercent + '%');
  } catch (error) {
    console.error('[Trade Plan Saver Popup] Volume update error:', error);
  }
}

/**
 * Handle test beep button
 */
async function handleTestBeep() {
  console.log('[Trade Plan Saver Popup] Test beep clicked');

  testBeepBtn.disabled = true;
  testBeepBtn.textContent = 'Playing...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PLAY_TEST_BEEP'
    });

    if (response.success) {
      console.log('[Trade Plan Saver Popup] Test beep played successfully');
    } else {
      showError('Test beep failed: ' + response.error);
    }
  } catch (error) {
    console.error('[Trade Plan Saver Popup] Test beep error:', error);
    showError('Failed to play test beep');
  } finally {
    setTimeout(() => {
      testBeepBtn.disabled = false;
      testBeepBtn.textContent = 'Test Beep';
    }, 600);
  }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', init);
