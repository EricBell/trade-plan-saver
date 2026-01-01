// File Saver - Handles File System Access API and filename generation

import { getDirectoryHandle } from './storage-manager.js';

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
 * Verify and request file system permissions
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<boolean>} True if permission granted
 */
async function verifyPermission(dirHandle) {
  try {
    const permission = await dirHandle.queryPermission({ mode: 'readwrite' });

    if (permission === 'granted') {
      return true;
    }

    // Request permission if not granted
    const requestResult = await dirHandle.requestPermission({ mode: 'readwrite' });
    return requestResult === 'granted';
  } catch (error) {
    console.error('Permission verification failed:', error);
    return false;
  }
}

/**
 * Save trade plan JSON to file
 * @param {Object} data - Trade plan JSON data
 * @param {number} timestamp - Timestamp when data was captured
 * @returns {Promise<Object>} Result object with success status and filename
 */
export async function saveTradePlan(data, timestamp) {
  try {
    // Get the stored directory handle
    const dirHandle = await getDirectoryHandle();

    if (!dirHandle) {
      throw new Error('No directory handle available. Please select a save directory first.');
    }

    // Verify we still have permission
    const hasPermission = await verifyPermission(dirHandle);

    if (!hasPermission) {
      throw new Error('Directory access denied. Please select the directory again.');
    }

    // Extract ticker from data
    const ticker = data.ticker || 'UNKNOWN';

    // Generate filename
    const filename = generateFilename(ticker, timestamp);

    // Create file handle (will create or overwrite)
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });

    // Create writable stream
    const writable = await fileHandle.createWritable();

    // Write JSON data (pretty printed)
    const jsonContent = JSON.stringify(data, null, 2);
    await writable.write(jsonContent);
    await writable.close();

    console.log(`Trade plan saved successfully: ${filename}`);

    return {
      success: true,
      filename: filename,
      ticker: ticker,
      timestamp: timestamp
    };

  } catch (error) {
    console.error('Failed to save trade plan:', error);

    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}
