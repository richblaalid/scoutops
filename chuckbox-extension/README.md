# Chuckbox Sync Extension

Chrome browser extension for syncing Scoutbook rosters to Chuckbox.

## Development

### Setup

```bash
cd chuckbox-extension
npm install
```

### Build

```bash
npm run build
```

This creates a `dist/` folder with the built extension.

### Watch Mode (for development)

```bash
npm run dev
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist/` folder

## Usage

1. **Get an Extension Token**
   - Log into Chuckbox
   - Go to Settings > Scoutbook Sync
   - Click "Generate Extension Token"
   - Copy the token

2. **Configure the Extension**
   - Click the Chuckbox extension icon
   - Paste your token in the Settings section

3. **Sync Your Roster**
   - Navigate to your Scoutbook roster page at `advancements.scouting.org`
   - Click the extension icon
   - Click "Sync Roster"
   - Review the changes in Chuckbox

## Project Structure

```
chuckbox-extension/
├── manifest.json           # Chrome extension manifest (V3)
├── src/
│   ├── content/
│   │   └── content-script.ts   # Runs on Scoutbook pages
│   ├── popup/
│   │   ├── popup.html          # Extension popup UI
│   │   └── popup.ts            # Popup logic
│   ├── background/
│   │   └── service-worker.ts   # Background API communication
│   └── lib/
│       ├── api.ts              # Chuckbox API client
│       └── extractor.ts        # DOM extraction utilities
├── public/
│   └── icons/                  # Extension icons
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Icons

Place PNG icons in `public/icons/`:
- `icon16.png` - 16x16 pixels
- `icon32.png` - 32x32 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Security

- Extension tokens are hashed before storage in the database
- Tokens expire after 60 days
- Users can revoke tokens at any time from Chuckbox settings
- The extension never stores or transmits Scoutbook credentials
