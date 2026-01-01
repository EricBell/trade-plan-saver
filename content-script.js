// Content Script - Intercepts fetch and XMLHttpRequest to capture trade plan responses

(function() {
  'use strict';

  const TARGET_URL_PATTERN = 'ttghg.onrender.com/api/v1/trade-plan';

  console.log('[Trade Plan Saver] Content script loaded');

  /**
   * Check if URL matches the trade plan endpoint
   */
  function isTargetUrl(url) {
    if (!url) return false;

    // Handle both string URLs and Request objects
    const urlString = typeof url === 'string' ? url : url.url;
    return urlString.includes(TARGET_URL_PATTERN);
  }

  /**
   * Send captured data to background script
   */
  function sendToBackground(data, url) {
    try {
      chrome.runtime.sendMessage({
        type: 'TRADE_PLAN_CAPTURED',
        data: data,
        url: url,
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Trade Plan Saver] Message send error:', chrome.runtime.lastError);
        } else if (response) {
          console.log('[Trade Plan Saver] Background response:', response);
        }
      });
    } catch (error) {
      console.error('[Trade Plan Saver] Failed to send message:', error);
    }
  }

  // ========== Intercept Fetch API ==========

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];

    // Check if this is our target URL
    if (isTargetUrl(url)) {
      console.log('[Trade Plan Saver] Trade plan request detected (fetch):', url);

      try {
        // Clone response to avoid consuming the original
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        console.log('[Trade Plan Saver] Trade plan data captured:', data);
        sendToBackground(data, typeof url === 'string' ? url : url.url);

      } catch (error) {
        console.error('[Trade Plan Saver] Failed to parse response:', error);
      }
    }

    return response;
  };

  // ========== Intercept XMLHttpRequest ==========

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (isTargetUrl(this._url)) {
      console.log('[Trade Plan Saver] Trade plan request detected (XHR):', this._url);

      this.addEventListener('load', function() {
        if (this.status >= 200 && this.status < 300) {
          try {
            const data = JSON.parse(this.responseText);
            console.log('[Trade Plan Saver] Trade plan data captured:', data);
            sendToBackground(data, this._url);
          } catch (error) {
            console.error('[Trade Plan Saver] Failed to parse XHR response:', error);
          }
        }
      });
    }

    return originalSend.apply(this, args);
  };

  console.log('[Trade Plan Saver] Fetch and XMLHttpRequest interceptors installed');

})();
