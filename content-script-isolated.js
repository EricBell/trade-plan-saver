// Content Script (ISOLATED World) - Receives messages from MAIN world and sends to background

(function() {
  'use strict';

  console.log('[Trade Plan Saver ISOLATED] Bridge script loaded');

  /**
   * Listen for messages from MAIN world
   */
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) {
      return;
    }

    // Only process our messages
    if (event.data.source !== 'trade-plan-saver-main') {
      return;
    }

    console.log('[Trade Plan Saver ISOLATED] Received message from MAIN world:', event.data);

    if (event.data.type === 'TRADE_PLAN_CAPTURED') {
      // Forward to background script
      try {
        chrome.runtime.sendMessage({
          type: 'TRADE_PLAN_CAPTURED',
          data: event.data.data,
          url: event.data.url,
          timestamp: event.data.timestamp
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Trade Plan Saver ISOLATED] Message send error:', chrome.runtime.lastError);
          } else if (response) {
            console.log('[Trade Plan Saver ISOLATED] Background response:', response);
          }
        });
      } catch (error) {
        console.error('[Trade Plan Saver ISOLATED] Failed to send message to background:', error);
      }
    }
  });

  console.log('[Trade Plan Saver ISOLATED] Message listener installed');

})();
