# Chrome Web Store Listing

## Extension Name
Chuckbox Sync

## Short Description (132 characters max)
Sync your Scoutbook roster directly to Chuckbox - the financial management app for Scout troops, packs, and crews.

## Detailed Description
Chuckbox Sync makes it easy to keep your Scout unit roster up-to-date in Chuckbox without manual data entry.

**How it works:**
1. Log into Scoutbook (advancements.scouting.org)
2. Click the Chuckbox Sync extension icon
3. Click "Sync Roster" - the extension automatically navigates to your roster and imports all scouts and adults

**Features:**
• One-click roster sync from Scoutbook to Chuckbox
• Automatically detects new scouts, adults, and roster changes
• Handles multi-page rosters automatically
• Secure token-based authentication
• No Scoutbook credentials stored

**What gets synced:**
• Scout names and BSA member IDs
• Patrol assignments
• Leadership positions (SPL, PL, etc.)
• Adult leaders and their positions
• Member status (active, inactive)

**Requirements:**
• A Chuckbox account with admin or treasurer access
• Access to your unit's Scoutbook roster

**About Chuckbox:**
Chuckbox is a financial management application designed specifically for Scout units. It helps you track scout accounts, manage billing, collect payments, and generate financial reports.

Learn more at https://chuckbox.app

## Category
Productivity

## Language
English

## Privacy Policy URL
https://chuckbox.app/privacy

## Screenshots Needed
1. Extension popup showing "Connected to [Unit Name]" with Ready status
2. Extension popup during sync showing progress
3. Extension popup after successful sync with summary
4. (Optional) The Chuckbox settings page showing synced roster

## Promotional Images (Optional)
- Small tile: 440x280 pixels
- Marquee: 1400x560 pixels

## Single Purpose Description (for Chrome Web Store review)
This extension syncs Scout unit roster data from Scoutbook (advancements.scouting.org) to Chuckbox, a financial management application for Scout units. It reads roster HTML from Scoutbook pages and sends it to the Chuckbox API for processing.

## Permissions Justification

### storage
Used to store the user's authentication token locally so they don't need to re-enter it each time they open the extension.

### activeTab
Required to read the current tab's URL to determine if the user is on a Scoutbook page, and to inject the content script that extracts roster data.

### scripting
Used to programmatically inject the content script when the user opens the extension on a Scoutbook page that was loaded before the extension was installed.

### Host Permissions (advancements.scouting.org, *.scouting.org)
Required to run content scripts on Scoutbook pages to extract roster data and navigate to the roster page when the user initiates a sync.
