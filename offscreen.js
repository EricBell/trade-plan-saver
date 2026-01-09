// Offscreen document for audio playback
// This runs in a DOM context where AudioContext is available

// Singleton AudioContext (lazy initialized)
let audioContext = null;

/**
 * Get or create AudioContext
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    console.log('[Offscreen] AudioContext created');
  }
  return audioContext;
}

/**
 * Play a beep sound at the specified volume
 * @param {number} volume - Volume level (0-1.0)
 * @returns {Promise<void>}
 */
async function playBeep(volume = 0.7) {
  try {
    const context = getAudioContext();

    // Resume context if suspended (required in some cases)
    if (context.state === 'suspended') {
      await context.resume();
    }

    // Create oscillator for beep tone (440Hz = A4 note)
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // A4 note

    // Create gain node for volume control
    const gainNode = context.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1.0, volume)); // Clamp 0-1.0

    // Connect nodes: oscillator -> gain -> destination
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Schedule beep: 500ms duration with fade in/out to avoid clicks
    const now = context.currentTime;
    const duration = 0.5; // 500ms
    const fadeTime = 0.01; // 10ms fade

    // Fade in
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + fadeTime);

    // Fade out
    gainNode.gain.setValueAtTime(volume, now + duration - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + duration);

    console.log(`[Offscreen] Beep played at ${Math.round(volume * 100)}% volume`);

    // Return promise that resolves when beep finishes
    return new Promise((resolve) => {
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        resolve();
      };
    });

  } catch (error) {
    console.error('[Offscreen] Beep playback error:', error);
    throw error;
  }
}

/**
 * Listen for messages from service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Message received:', message.type, 'from:', sender);

  if (message.type === 'PLAY_BEEP_OFFSCREEN') {
    console.log('[Offscreen] Received beep request, volume:', message.volume);

    playBeep(message.volume)
      .then(() => {
        console.log('[Offscreen] Beep playback completed successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] Playback failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }

  console.log('[Offscreen] Message not handled:', message.type);
  return false;
});

console.log('[Offscreen] Audio offscreen document initialized');
