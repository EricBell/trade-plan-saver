// Background Service Worker - Coordinates trade plan capture and file saving

import { getSettings, saveSettings } from './storage-manager.js';
import { saveTradePlan } from './file-saver.js';

// Track current state (loaded from storage on startup)
let isEnabled = false;

console.log('[Trade Plan Saver] Background service worker starting...');

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Trade Plan Saver] Extension installed:', details.reason);

  const settings = await getSettings();
  isEnabled = settings.isEnabled;

  console.log('[Trade Plan Saver] Initial settings loaded:', settings);
});

/**
 * Load state on browser startup
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Trade Plan Saver] Browser started, loading settings...');

  const settings = await getSettings();
  isEnabled = settings.isEnabled;

  console.log('[Trade Plan Saver] Settings loaded on startup:', settings);
});

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Trade Plan Saver] Message received:', message.type, message);

  // Handle toggle capture from popup
  if (message.type === 'TOGGLE_CAPTURE') {
    isEnabled = message.enabled;
    console.log(`[Trade Plan Saver] Capture ${isEnabled ? 'enabled' : 'disabled'}`);

    sendResponse({ success: true, enabled: isEnabled });
    return false;
  }

  // Handle trade plan capture from content script
  if (message.type === 'TRADE_PLAN_CAPTURED') {
    handleTradePlanCapture(message.data, message.timestamp)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error('[Trade Plan Saver] Capture handler error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  // Handle get status from popup
  if (message.type === 'GET_STATUS') {
    getSettings()
      .then(settings => {
        sendResponse({
          success: true,
          settings: settings,
          enabled: isEnabled
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  return false;
});

/**
 * Handle captured trade plan data
 */
async function handleTradePlanCapture(data, timestamp) {
  console.log('[Trade Plan Saver] Processing trade plan capture...');

  // Check if capture is enabled (check storage directly to avoid stale state)
  const settings = await getSettings();
  console.log('[Trade Plan Saver] Current settings:', settings);

  if (!settings.isEnabled) {
    console.log('[Trade Plan Saver] Capture disabled, ignoring');
    return { success: false, reason: 'disabled' };
  }

  // Validate data structure
  if (!data || typeof data !== 'object') {
    console.error('[Trade Plan Saver] Invalid trade plan data');
    return { success: false, error: 'Invalid data structure' };
  }

  // Check if we have required fields
  if (!data.ticker) {
    console.warn('[Trade Plan Saver] Trade plan missing ticker field');
  }

  console.log('[Trade Plan Saver] Saving trade plan for ticker:', data.ticker);

  // Save the file
  const result = await saveTradePlan(data, timestamp);

  // Show notification based on result
  if (result.success) {
    showNotification('success', result.filename);
  } else {
    showNotification('error', result.error);
  }

  return result;
}

/**
 * Show notification to user
 */
function showNotification(type, message) {
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: type === 'success' ? 'Trade Plan Saved' : 'Save Failed',
    message: message,
    priority: 1
  };

  chrome.notifications.create('', notificationOptions, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('[Trade Plan Saver] Notification error:', chrome.runtime.lastError);
    } else {
      console.log('[Trade Plan Saver] Notification shown:', notificationId);
    }
  });
}

console.log('[Trade Plan Saver] Background service worker initialized');
