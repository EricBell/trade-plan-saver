# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) that captures JSON responses from `https://ttghg.onrender.com/api/v1/trade-plan` network requests and saves them to a user-selected directory with automatic filename generation.

**Target API Response Structure:**
```json
{
  "status": "success",
  "ticker": "SPY",
  "requested_ticker": null,
  "resolved_ticker": null,
  "resolved_ticker_method": null,
  "asset_type": "OPTIONS",
  "trade_style": "DAY",
  ...
}
```

**Filename Format:** `trade-plan-<TICKER>-<YYMMDD>-<HHMM>.json`
- TICKER: From `data.ticker` field (e.g., "SPY")
- YYMMDD: Local timezone date (e.g., 260101 for 2026-01-01)
- HHMM: Local timezone 24-hour time (e.g., 0940 for 9:40 AM)

## Documentation Maintenance

**IMPORTANT**: Whenever you make changes to this Chrome extension or project:

1. **Increment the version number**: Increase the patch value (third number) in both `manifest.json` and `popup.html`
   - Example: `1.0.1` → `1.0.2`
   - For major features or breaking changes, increment minor or major version accordingly

2. **Update PRD.md**: Add a note about the change(s) in the "Change Log" section at the bottom of the file
   - Include the new version number in the changelog entry
   - This ensures the PRD stays synchronized with the actual implementation

3. **Bump minor version after completion**: After every change you announce to the user as complete, bump up the minor version number (second number)
   - Example: `1.2.0` → `1.3.0`
   - This applies to all completed work announcements
   - Update both `manifest.json` and `popup.html` with the new version

## Development Setup

### Loading Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this repository's root directory
5. Extension will load with ID and icon

### Reloading After Changes
1. Go to `chrome://extensions/`
2. Click the refresh icon on the extension card
3. For manifest changes, may need to remove and reload unpacked

### Debugging
- **Background service worker**: `chrome://extensions/` → click "service worker" link
- **Popup**: Right-click extension icon → Inspect
- **Content script**: Open DevTools on target page → Console tab
- **Storage inspection**: DevTools → Application tab → Storage section → chrome.storage.local and IndexedDB

## Architecture

### Network Interception Strategy

**Challenge**: Manifest V3's `declarativeNetRequest` API cannot read response bodies.

**Solution**: Content script injection that intercepts both `fetch()` and `XMLHttpRequest` before page scripts execute:
- Content script runs at `document_start` to intercept before page code
- Overrides native `window.fetch` and `XMLHttpRequest.prototype`
- Clones responses to avoid consuming original streams
- Sends captured JSON to background service worker via `chrome.runtime.sendMessage()`

### Storage Architecture

**Two-tier approach required** because `FileSystemDirectoryHandle` cannot be serialized to chrome.storage:

1. **chrome.storage.local** - Simple settings:
   - `isEnabled`: boolean - Toggle state for capture functionality
   - `hasDirectoryAccess`: boolean - Whether user has selected directory
   - `directoryPath`: string - Display name only (not for file operations)

2. **IndexedDB** (`TradePlanSaverDB`) - Complex objects:
   - Object store: `'handles'`
   - Key: `'saveDirectory'`
   - Value: `FileSystemDirectoryHandle` instance

**Rationale**: FileSystemHandle is a complex object with internal state that chrome.storage cannot serialize. IndexedDB natively supports structured clone algorithm which preserves these objects.

### File System Access API

**Permission Lifecycle:**
1. User clicks "Select Save Directory" in popup
2. `window.showDirectoryPicker({ mode: 'readwrite' })` shows OS dialog
3. Handle stored in IndexedDB, settings updated in chrome.storage.local
4. Before each file save:
   - Retrieve handle from IndexedDB
   - Call `handle.queryPermission({ mode: 'readwrite' })`
   - If not granted, call `handle.requestPermission({ mode: 'readwrite' })`
   - Permissions may expire and must be re-verified

**File Writing Process:**
```javascript
const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
const writable = await fileHandle.createWritable();
await writable.write(JSON.stringify(data, null, 2));
await writable.close();
```

### Service Worker Lifecycle (Manifest V3)

- Service workers are **ephemeral** - Chrome terminates them after ~30 seconds of inactivity
- Cannot use long-lived background pages (Manifest V2 feature)
- Must reload settings on startup via `chrome.runtime.onStartup` and `chrome.runtime.onInstalled`
- All operations must be event-driven, no polling
- Save files immediately on capture (no queuing/batching)

## Critical Implementation Details

### Filename Generation with Timezone

All dates/times use **local browser timezone** (not UTC):

```javascript
function generateFilename(ticker, timestamp) {
  const date = new Date(timestamp); // Browser's local timezone

  // YYMMDD
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // HHMM (24-hour format)
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  // Sanitize ticker for filesystem
  const sanitizedTicker = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return `trade-plan-${sanitizedTicker}-${year}${month}${day}-${hours}${minutes}.json`;
}
```

### Content Script Message Flow

```
Page executes fetch('https://ttghg.onrender.com/api/v1/trade-plan')
    ↓
Content script intercepts via overridden fetch
    ↓
Response cloned: const cloned = response.clone()
    ↓
JSON parsed: const data = await cloned.json()
    ↓
Message sent: chrome.runtime.sendMessage({
  type: 'TRADE_PLAN_CAPTURED',
  data: data,
  timestamp: Date.now()
})
    ↓
Original response returned to page (unaffected)
```

### Background Service Worker Message Handling

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRADE_PLAN_CAPTURED') {
    handleTradePlanCapture(message.data, message.timestamp)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async sendResponse
  }
  return false;
});
```

**Important**: Must return `true` to keep message channel open for async `sendResponse()`.

## Browser Requirements

- Chrome 102+ (File System Access API in service workers)
- Cannot test in Incognito mode (File System Access API restrictions)
- Extension must be loaded as "unpacked" for development

## Common Pitfalls

1. **Forgetting to verify permissions** before file operations → Always call `queryPermission()` first
2. **Not cloning fetch responses** → Content script must clone to avoid consuming stream
3. **Not returning true from message listeners** → Async responses require `return true`
4. **Trying to store FileSystemHandle in chrome.storage** → Use IndexedDB instead
5. **Assuming service worker stays alive** → Always reload state on startup events
6. **Testing in Incognito** → File System Access API won't work

## Extension Permissions Explained

- `storage`: Required for chrome.storage.local settings persistence
- `notifications`: Shows success/error notifications after file saves
- `https://ttghg.onrender.com/*`: Host permission to intercept network requests from this domain
- Content scripts injected into `<all_urls>`: Required because trade-plan API could be called from any page

## License

GNU General Public License v3.0 - See LICENSE file
