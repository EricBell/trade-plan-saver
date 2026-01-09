// Audio Utilities - Offscreen document approach for service worker audio

/**
 * Create offscreen document for audio playback
 * Service workers don't have access to AudioContext, so we use an offscreen document
 */
async function createOffscreenDocument() {
  // Check if offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  // Create new offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play audio beep notification when trade plans are saved'
  });

  console.log('[Audio Utils] Offscreen document created');
}

/**
 * Play a beep sound at the specified volume
 * @param {number} volume - Volume level (0-1.0)
 * @returns {Promise<void>}
 */
export async function playBeep(volume = 0.7) {
  try {
    // Ensure offscreen document exists
    await createOffscreenDocument();

    // Send message to offscreen document to play beep
    await chrome.runtime.sendMessage({
      type: 'PLAY_BEEP_OFFSCREEN',
      volume: volume
    });

    console.log(`[Audio Utils] Beep request sent at ${Math.round(volume * 100)}% volume`);

  } catch (error) {
    console.error('[Audio Utils] Beep playback error:', error);
    throw new Error(`Audio playback failed: ${error.message}`);
  }
}
