// File Saver - Handles Chrome Downloads API and filename generation

/**
 * Generate filename from trade plan data
 * Format: trade-plan-<TICKER>-<YYMMDD>-<HHMM>.json
 * @param {string} ticker - Stock ticker symbol
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Generated filename
 */
export function generateFilename(ticker, timestamp) {
  const date = new Date(timestamp);

  // Format: YYMMDD (local timezone)
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Format: HHMM (24-hour, local timezone)
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}${minutes}`;

  // Sanitize ticker (remove special characters, uppercase)
  const sanitizedTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return `trade-plan-${sanitizedTicker}-${dateStr}-${timeStr}.json`;
}

/**
 * Save trade plan JSON to Downloads folder using Chrome Downloads API
 * @param {Object} data - Trade plan JSON data
 * @param {number} timestamp - Timestamp when data was captured
 * @returns {Promise<Object>} Result object with success status and filename
 */
export async function saveTradePlan(data, timestamp) {
  try {
    // Extract ticker from data
    const ticker = data.ticker || 'UNKNOWN';

    // Generate filename
    const filename = generateFilename(ticker, timestamp);

    // Convert JSON to blob
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    // Create object URL for the blob
    const url = URL.createObjectURL(blob);

    console.log('[File Saver] Downloading file:', filename);

    // Download using Chrome Downloads API
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: false, // Auto-save to Downloads folder
          conflictAction: 'uniquify' // Add (1), (2), etc. if file exists
        },
        (id) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(id);
          }
        }
      );
    });

    console.log('[File Saver] Download initiated with ID:', downloadId);

    // Wait a moment then revoke the object URL to free memory
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    console.log(`[File Saver] Trade plan saved successfully: ${filename}`);

    return {
      success: true,
      filename: filename,
      ticker: ticker,
      timestamp: timestamp,
      downloadId: downloadId
    };

  } catch (error) {
    console.error('[File Saver] Failed to save trade plan:', error);

    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}
