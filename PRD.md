# Trade Plan Saver Chrome Extension - PRD

## Overview
Build a Chrome extension to capture JSON responses from `https://ttghg.onrender.com/api/v1/trade-plan` and save them to a user-selected directory with automatic filename generation.

## Architecture

### Files to Create
```
/home/eric/workspace/original/trade-plan-saver/
├── manifest.json                 # Manifest V3 configuration
├── background.js                 # Service worker for coordination
├── content-script.js            # Intercepts network requests
├── popup.html                    # User interface
├── popup.js                      # UI logic
├── popup.css                     # Styling
├── storage-manager.js           # Settings & IndexedDB for handles
├── file-saver.js                # File System Access API logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Key Technical Decisions

### 1. Network Interception Strategy
**Challenge**: Manifest V3's `declarativeNetRequest` cannot read response bodies.

**Solution**: Inject content script that intercepts `fetch()` and `XMLHttpRequest` to capture the JSON response:
- Override native fetch/XHR in page context
- Match URL: `https://ttghg.onrender.com/api/v1/trade-plan`
- Send captured JSON to background service worker via `chrome.runtime.sendMessage()`

### 2. File Saving Strategy
**File System Access API** for directory persistence:
- Use `window.showDirectoryPicker()` in popup for directory selection
- Store `FileSystemDirectoryHandle` in **IndexedDB** (cannot use chrome.storage)
- Verify permissions with `queryPermission()`/`requestPermission()` before each save
- Store simple settings (isEnabled, hasDirectoryAccess) in **chrome.storage.local**

### 3. Filename Generation
Format: `trade-plan-<TICKER>-<YYMMDD>-<HHMM>.json`

```javascript
const ticker = data.ticker;  // Extract from JSON
const date = new Date(timestamp);  // Uses local timezone automatically

// YYMMDD
const year = date.getFullYear().toString().slice(-2);
const month = (date.getMonth() + 1).toString().padStart(2, '0');
const day = date.getDate().toString().padStart(2, '0');

// HHMM (24-hour)
const hours = date.getHours().toString().padStart(2, '0');
const minutes = date.getMinutes().toString().padStart(2, '0');

// Example: trade-plan-SPY-260101-0940.json
```

## Implementation Flow

### User Workflow
1. User clicks extension icon → popup opens
2. User clicks "Select Save Directory" → picks folder
3. User enables "Enable Capture" toggle
4. When `trade-plan` API request occurs → JSON automatically saved to directory
5. Notification shows: "Trade Plan Saved - trade-plan-SPY-260101-0940.json"

### Technical Flow
```
Page makes API request
    ↓
Content script intercepts fetch/XHR response
    ↓
Sends {type: 'TRADE_PLAN_CAPTURED', data, timestamp} to background
    ↓
Background checks if enabled
    ↓
Background retrieves directory handle from IndexedDB
    ↓
Background verifies/requests file permissions
    ↓
Background generates filename from ticker + timestamp
    ↓
Background writes JSON file using File System Access API
    ↓
Shows success notification
```

## Manifest V3 Configuration

### Required Permissions
```json
{
  "permissions": [
    "storage",              // chrome.storage.local for settings
    "notifications"         // Success/error notifications
  ],
  "host_permissions": [
    "https://ttghg.onrender.com/*"  // Access target domain
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "run_at": "document_start",
    "all_frames": true
  }]
}
```

Note: `declarativeNetRequest` not needed - content script handles interception.

## Storage Architecture

### Two-Tier Approach

**chrome.storage.local**:
```javascript
{
  isEnabled: true/false,
  hasDirectoryAccess: true/false,
  directoryPath: "dirname"  // Display only
}
```

**IndexedDB** (`TradePlanSaverDB`):
```javascript
objectStore('handles') {
  'saveDirectory': FileSystemDirectoryHandle
}
```

**Why**: FileSystemHandle is a complex object that cannot be serialized to chrome.storage, requiring IndexedDB.

## Critical Implementation Details

### 1. Content Script Interception
Must intercept BEFORE page scripts run to catch all requests:
```javascript
// manifest.json
"run_at": "document_start"

// Override both fetch and XMLHttpRequest
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = args[0];

  if (url.includes('ttghg.onrender.com/api/v1/trade-plan')) {
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    chrome.runtime.sendMessage({
      type: 'TRADE_PLAN_CAPTURED',
      data: data,
      timestamp: Date.now()
    });
  }

  return response;
};
```

### 2. Permission Verification
File permissions may expire - always verify before saving:
```javascript
const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
if (permission !== 'granted') {
  await dirHandle.requestPermission({ mode: 'readwrite' });
}
```

### 3. Service Worker Lifecycle
- Service workers are ephemeral (can terminate anytime)
- Load `isEnabled` state on startup/install
- Save files immediately on capture (no queuing)

## Browser Requirements
- Chrome 102+ (File System Access API in service workers)
- Cannot test in Incognito mode (API restrictions)

## Testing Plan
1. Load unpacked extension via `chrome://extensions/` (Developer mode)
2. Open popup → select directory → verify success
3. Enable toggle → verify status badge changes
4. Navigate to page using the API
5. Trigger API request → verify file saved
6. Check filename format and JSON content
7. Test browser restart → verify settings persist
8. Test error cases (no directory, disabled state)

## Critical Files

1. **manifest.json** - Extension configuration and permissions
2. **content-script.js** - Network request interception
3. **background.js** - Event coordination and file saving
4. **storage-manager.js** - Settings + IndexedDB handle persistence
5. **file-saver.js** - File System Access API implementation

## Next Steps
1. Create placeholder icons (16x16, 48x48, 128x128 PNG)
2. Implement manifest.json with all permissions
3. Build content-script.js for fetch/XHR interception
4. Implement storage-manager.js with IndexedDB
5. Build file-saver.js with filename generation
6. Create background.js service worker
7. Build popup UI (HTML/CSS/JS)
8. Load and test in Chrome

## Change Log

### 2026-01-01 - Initial Implementation
- Initial PRD created
- Defined architecture with Manifest V3, content script interception, and File System Access API
- Established two-tier storage approach (chrome.storage.local + IndexedDB)
- **Implementation completed**:
  - Created extension icons (16x16, 48x48, 128x128 PNG) with blue color theme
  - Implemented manifest.json v3 with all required permissions
  - Built storage-manager.js for chrome.storage.local and IndexedDB operations
  - Built file-saver.js with File System Access API and filename generation logic
  - Built content-script.js to intercept fetch() and XMLHttpRequest
  - Built background.js service worker for coordination and file saving
  - Built popup UI with HTML/CSS/JS for directory selection and toggle control
- Extension ready for testing in Chrome Developer mode

### 2026-01-01 - v1.0.1 - Enhanced Debugging
- Added detailed console logging to content-script.js to debug capture issues:
  - Logs every fetch and XHR request with numbered tracking
  - Logs all requests containing 'trade-plan' or 'ttghg' patterns
  - Enhanced visibility with ✅ markers for successful detection
  - Added timestamp logging for interceptor initialization
- Updated version to 1.0.1 in manifest.json and popup.html
- Updated CLAUDE.md with versioning requirement:
  - Added requirement to increment patch version after code modifications
  - Documented that both manifest.json and popup.html must be updated
  - Integrated versioning requirement into Documentation Maintenance section

### 2026-01-01 - v1.0.2 - Fix Content Script World
- **CRITICAL FIX**: Added `"world": "MAIN"` to content_scripts in manifest.json
  - Content scripts were running in isolated world, not intercepting page's fetch/XHR
  - Now injects into MAIN world (page context) to properly override fetch/XMLHttpRequest
  - This allows interception of requests made by page JavaScript bundles
- Updated version to 1.0.2 in manifest.json and popup.html

### 2026-01-01 - v1.0.3 - Two-Script Bridge Architecture
- **CRITICAL FIX**: Implemented two-script approach to communicate between MAIN and ISOLATED worlds
  - Created `content-script-main.js` - runs in MAIN world, intercepts fetch/XHR
  - Created `content-script-isolated.js` - runs in ISOLATED world, has Chrome API access
  - Bridge communication via `window.postMessage` between the two worlds
  - Fixes "Cannot read properties of undefined (reading 'sendMessage')" error
  - MAIN world intercepts requests → posts message → ISOLATED world forwards to background
- Updated manifest.json to include both content scripts with different world contexts
- Updated version to 1.0.3 in manifest.json and popup.html

### 2026-01-01 - v1.0.4 - Fix State Sync Issue
- **CRITICAL FIX**: Fixed service worker state synchronization issue
  - Background script was using stale in-memory `isEnabled` variable
  - Changed to check `chrome.storage.local` directly on each capture attempt
  - Prevents "disabled" responses when extension is actually enabled
  - Ensures state is always current even after service worker restart
- Updated version to 1.0.4 in manifest.json and popup.html

### 2026-01-01 - v1.0.5 - Improved Permission Error Handling
- **FIX**: Improved handling of expired File System Access permissions
  - Removed auto-request permission from background (only works from user gesture)
  - Added automatic clearing of stale directory state when permission denied
  - Enhanced notification messages to guide user to reselect directory
  - Background script now clears `hasDirectoryAccess` flag on permission errors
  - More helpful error notifications with clear next steps for user
- Updated version to 1.0.5 in manifest.json and popup.html

### 2026-01-01 - v1.0.6 - Enhanced Permission Verification
- **FIX**: Added detailed permission verification and logging in popup
  - Double-check permission status after requesting to ensure it's actually granted
  - Added comprehensive logging of permission states at each step
  - Validate that permission is persisted before saving handle
  - Better error messages if permission cannot be persisted
- Updated version to 1.0.6 in manifest.json and popup.html

### 2026-01-01 - v1.0.7 - Debug Handle Retrieval
- **DEBUG**: Added detailed logging for IndexedDB handle retrieval in background
  - Logs handle object type, kind, and name when retrieved
  - Helps diagnose permission degradation between popup and background contexts
  - Investigating why permission shows "granted" in popup but "prompt" in background
- Updated version to 1.0.7 in manifest.json and popup.html

### 2026-01-01 - v1.0.8 - MAJOR: Switch to Chrome Downloads API
- **BREAKING CHANGE**: Switched from File System Access API to Chrome Downloads API
  - Solves permission degradation issues between popup and background contexts
  - Files now save to user's Downloads folder (not custom directory)
  - No permission dialogs or persistent permission issues
  - Simpler, more reliable implementation
- **Changes**:
  - Rewrote `file-saver.js` to use `chrome.downloads.download()` API
  - Added `downloads` permission to manifest.json
  - Removed File System Access API code (directory selection, IndexedDB storage)
  - Simplified `storage-manager.js` - removed IndexedDB, only stores `isEnabled` flag
  - Simplified popup UI - removed directory selection button
  - Updated popup to show "Downloads Folder" as save location
  - Updated notification message to indicate "Saved to Downloads"
  - Removed all directory permission error handling
- **User Impact**: Files automatically save to Downloads folder with proper naming
- Updated version to 1.0.8 in manifest.json and popup.html

### 2026-01-01 - v1.0.9 - Fix Service Worker Data URL
- **CRITICAL FIX**: Fixed `URL.createObjectURL is not a function` error in service worker
  - Service workers don't support `URL.createObjectURL()` for blob URLs
  - Changed to use base64-encoded data URLs instead
  - Uses `btoa(unescape(encodeURIComponent(jsonContent)))` for proper UTF-8 encoding
  - Data URLs work reliably in service worker context for chrome.downloads API
- Updated version to 1.0.9 in manifest.json and popup.html

### 2026-01-09 - v1.1.0 - Audio Beep Notifications
- **NEW FEATURE**: Added configurable audio beep notification when trade plans are successfully saved
  - Plays a 440Hz (A4 note) sine wave beep for 500ms using Web Audio API
  - Adjustable volume slider (0-100%) in popup settings
  - Enable/disable toggle for audio notifications
  - "Test Beep" button to preview sound and volume before capture
  - Beep plays in service worker context using AudioContext and GainNode
  - Non-blocking implementation - audio errors don't affect file saving
- **Implementation**:
  - Created `audio-utils.js` - Web Audio API utilities with programmatic tone generation
  - Extended `storage-manager.js` with `audioBeepEnabled` (default: true) and `audioBeepVolume` (default: 0.7)
  - Updated `background.js` to play beep after successful save with proper error handling
  - Added `PLAY_TEST_BEEP` message handler in background for testing audio
  - Added "Audio Notifications" section to popup UI with toggle, volume slider, and test button
  - Added CSS styling for audio controls with custom slider styling
- Updated version to 1.1.0 in manifest.json and popup.html

### 2026-01-09 - v1.2.0 - Fix Audio Playback in Service Worker
- **CRITICAL FIX**: Fixed "AudioContext is not defined" error in service worker
  - Service workers don't have access to AudioContext API
  - Implemented offscreen document approach using chrome.offscreen API
  - Audio now plays in an offscreen DOM context where Web Audio API is available
- **Implementation**:
  - Updated `audio-utils.js` to create and manage offscreen document
  - Created `offscreen.html` - Minimal HTML document for offscreen context
  - Created `offscreen.js` - Contains Web Audio API implementation (moved from audio-utils.js)
  - Background service worker sends `PLAY_BEEP_OFFSCREEN` message to offscreen document
  - Offscreen document handles actual audio playback with AudioContext
  - Added `"offscreen"` permission to manifest.json
- Updated version to 1.2.0 in manifest.json and popup.html

### 2026-01-09 - v1.3.0 - Documentation Update
- **DOCUMENTATION**: Updated CLAUDE.md versioning guidelines
  - Added new rule: Bump minor version after every completed change announcement
  - Ensures consistent version increments for all completed work
  - Example: 1.2.0 → 1.3.0 after work completion
- Updated version to 1.3.0 in manifest.json and popup.html
