# Trade Plan Saver

A Chrome extension that automatically captures and saves trade plan JSON responses from a trading platform API to your Downloads folder.

## What It Does

When you generate a trade plan on the target platform, this extension automatically:
- Intercepts the API response in the background
- Saves the JSON data to your Downloads folder
- Names files using the format: `trade-plan-{TICKER}-{YYMMDD}-{HHMM}.json`

Example filename: `trade-plan-SPY-260101-0940.json`

## Who It's For

Traders using a compatible trading platform who want to automatically archive their trade plans for later reference.

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select this repository's folder
6. The extension icon will appear in your toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Toggle "Enable Capture" to ON
3. Visit your trading platform and generate trade plans as normal
4. Files are automatically saved to your Downloads folder
5. A notification confirms each successful save

## Requirements

- Chrome 102 or higher
- Developer mode enabled (for unpacked extensions)

## Technical Notes

This is a Manifest V3 extension that uses content script injection to intercept network responses from the trade plan API endpoint. Files are saved using the Chrome Downloads API without requiring directory picker permissions.

## License

GNU General Public License v3.0
