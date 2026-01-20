# Chrome Web Store Submission Checklist

## Prerequisites

- [ ] Google Developer account ($5 one-time fee)
  - Sign up at: https://chrome.google.com/webstore/devconsole/register

## Before Submission

### Code Ready
- [x] Manifest V3 compliant
- [x] All required icon sizes (16, 32, 48, 128)
- [x] Privacy policy URL set
- [x] Homepage URL set
- [x] Permissions minimized and justified

### Assets Ready
- [x] Privacy policy page live at https://chuckbox.app/privacy
- [x] Store listing description written (see STORE_LISTING.md)
- [ ] Screenshots captured (see below)

### Screenshots to Capture (1280x800 or 640x400)

1. **Connected State**
   - Open extension on Scoutbook
   - Show "Connected to [Unit Name]" with green Ready status
   - Sync button enabled

2. **Syncing State**
   - Click Sync and capture mid-progress
   - Show progress bar and "Extracting roster data..." or similar

3. **Success State**
   - After successful sync
   - Show summary: "X new scouts, Y updates"
   - Show "Review changes in ChuckBox" link

4. **Token Entry** (optional)
   - Show the not-connected state with token input
   - Demonstrates the setup flow

## Submission Steps

1. **Create ZIP package**
   ```bash
   cd chuckbox-extension
   npm run build
   cd dist
   zip -r ../chuckbox-sync-v1.0.0.zip .
   ```

2. **Go to Chrome Developer Dashboard**
   https://chrome.google.com/webstore/devconsole

3. **Click "New Item"**

4. **Upload ZIP file**
   Upload `chuckbox-sync-v1.0.0.zip`

5. **Fill in Store Listing**
   - Copy content from STORE_LISTING.md
   - Upload screenshots
   - Set category to "Productivity"
   - Set language to "English"

6. **Privacy Tab**
   - Enter privacy policy URL: `https://chuckbox.app/privacy`
   - Answer data handling questions:
     - "Does your extension collect user data?" → Yes
     - Data types: Authentication tokens, User activity (roster sync)
     - Certify you comply with Developer Program Policies

7. **Permissions Justification**
   - Copy justifications from STORE_LISTING.md
   - Be specific about why each permission is needed

8. **Submit for Review**
   - Click "Submit for Review"
   - Review typically takes 1-3 business days

## After Submission

- [ ] Monitor email for approval or feedback
- [ ] If rejected, address feedback and resubmit
- [ ] Once approved, test installation from Web Store
- [ ] Update ChuckBox settings page with Web Store link

## Post-Launch

- [ ] Add Web Store link to ChuckBox settings/integrations page
- [ ] Add installation instructions to help docs
- [ ] Monitor reviews and respond to feedback

## Version Updates

For future updates:
1. Bump version in `manifest.json`
2. Build and create new ZIP
3. Upload to Developer Dashboard
4. Updates auto-deploy to existing users
