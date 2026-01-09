// Audio Utilities - Offscreen document approach for service worker audio

/**
 * Create offscreen document for audio playback
 * Service workers don't have access to AudioContext, so we use an offscreen document
 */
async function createOffscreenDocument() {
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      console.log('[Audio Utils] Offscreen document already exists');
      return; // Already exists
    }

    console.log('[Audio Utils] Creating new offscreen document...');

    // Create new offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play audio beep notification when trade plans are saved'
    });

    console.log('[Audio Utils] Offscreen document created successfully');

    // Give it a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    // Document might already exist from a previous call
    console.log('[Audio Utils] Offscreen document creation warning:', error.message);
  }
}

/**
 * Play a beep sound at the specified volume
 * @param {number} volume - Volume level (0-1.0)
 * @returns {Promise<void>}
 */
export async function playBeep(volume = 0.7) {
  try {
    console.log(`[Audio Utils] playBeep called with volume: ${volume}`);

    // Ensure offscreen document exists
    await createOffscreenDocument();
    console.log('[Audio Utils] Offscreen document ready');

    // Send message to offscreen document to play beep
    const response = await chrome.runtime.sendMessage({
      type: 'PLAY_BEEP_OFFSCREEN',
      volume: volume
    });

    console.log(`[Audio Utils] Beep request sent at ${Math.round(volume * 100)}% volume, response:`, response);

    if (!response || !response.success) {
      console.warn('[Audio Utils] Beep may not have played successfully');
    }

  } catch (error) {
    console.error('[Audio Utils] Beep playback error:', error);
    throw new Error(`Audio playback failed: ${error.message}`);
  }
}
