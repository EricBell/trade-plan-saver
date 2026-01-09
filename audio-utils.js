// Audio Utilities - Web Audio API implementation for service worker

// Singleton AudioContext (lazy initialized)
let audioContext = null;

/**
 * Get or create AudioContext
 * @returns {AudioContext}
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    console.log('[Audio Utils] AudioContext created');
  }
  return audioContext;
}

/**
 * Play a beep sound at the specified volume
 * @param {number} volume - Volume level (0-1.0)
 * @returns {Promise<void>}
 */
export async function playBeep(volume = 0.7) {
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

    console.log(`[Audio Utils] Beep played at ${Math.round(volume * 100)}% volume`);

    // Return promise that resolves when beep finishes
    return new Promise((resolve) => {
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        resolve();
      };
    });

  } catch (error) {
    console.error('[Audio Utils] Beep playback error:', error);
    throw new Error(`Audio playback failed: ${error.message}`);
  }
}
