// Content Script (MAIN World) - Intercepts fetch/XHR and posts to isolated world

(function() {
  'use strict';

  const TARGET_URL_PATTERN = 'ttghg.onrender.com/api/v1/trade-plan';

  console.log('[Trade Plan Saver MAIN] Content script loaded at:', window.location.href);
  console.log('[Trade Plan Saver MAIN] Looking for URL pattern:', TARGET_URL_PATTERN);

  /**
   * Check if URL matches the trade plan endpoint
   */
  function isTargetUrl(url) {
    if (!url) return false;
    const urlString = typeof url === 'string' ? url : url.url;
    const matches = urlString.includes(TARGET_URL_PATTERN);

    if (urlString.includes('trade-plan') || urlString.includes('ttghg')) {
      console.log('[Trade Plan Saver MAIN] Checking URL:', urlString, '- Matches:', matches);
    }

    return matches;
  }

  /**
   * Send captured data to isolated world via postMessage
   */
  function sendToIsolatedWorld(data, url) {
    try {
      window.postMessage({
        source: 'trade-plan-saver-main',
        type: 'TRADE_PLAN_CAPTURED',
        data: data,
        url: url,
        timestamp: Date.now()
      }, '*');
      console.log('[Trade Plan Saver MAIN] Posted message to isolated world');
    } catch (error) {
      console.error('[Trade Plan Saver MAIN] Failed to post message:', error);
    }
  }

  // ========== Intercept Fetch API ==========

  const originalFetch = window.fetch;
  let fetchCount = 0;

  window.fetch = async function(...args) {
    fetchCount++;
    const url = args[0];
    const urlString = typeof url === 'string' ? url : url.url;

    console.log(`[Trade Plan Saver MAIN] Fetch #${fetchCount}:`, urlString);

    const response = await originalFetch.apply(this, args);

    if (isTargetUrl(url)) {
      console.log('[Trade Plan Saver MAIN] ✅ TRADE PLAN REQUEST DETECTED (fetch):', url);

      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();

        console.log('[Trade Plan Saver MAIN] ✅ TRADE PLAN DATA CAPTURED:', data);
        sendToIsolatedWorld(data, typeof url === 'string' ? url : url.url);

      } catch (error) {
        console.error('[Trade Plan Saver MAIN] Failed to parse response:', error);
      }
    }

    return response;
  };

  // ========== Intercept XMLHttpRequest ==========

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  let xhrCount = 0;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    xhrCount++;
    this._url = url;
    this._method = method;
    this._xhrId = xhrCount;
    console.log(`[Trade Plan Saver MAIN] XHR #${xhrCount} open:`, method, url);
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (isTargetUrl(this._url)) {
      console.log('[Trade Plan Saver MAIN] ✅ TRADE PLAN REQUEST DETECTED (XHR):', this._url);

      this.addEventListener('load', function() {
        console.log(`[Trade Plan Saver MAIN] XHR #${this._xhrId} load event - status:`, this.status);
        if (this.status >= 200 && this.status < 300) {
          try {
            const data = JSON.parse(this.responseText);
            console.log('[Trade Plan Saver MAIN] ✅ TRADE PLAN DATA CAPTURED:', data);
            sendToIsolatedWorld(data, this._url);
          } catch (error) {
            console.error('[Trade Plan Saver MAIN] Failed to parse XHR response:', error);
          }
        }
      });
    }

    return originalSend.apply(this, args);
  };

  console.log('[Trade Plan Saver MAIN] ✅ Fetch and XMLHttpRequest interceptors installed');
  console.log('[Trade Plan Saver MAIN] Interceptors ready at:', new Date().toISOString());

})();
