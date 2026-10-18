POS CARE V6.3 - NATURAL CONVERSATION

1. Backup your existing C:\Users\LENOVO\zalo-pos-care-v5 folder.
2. Copy files from this package into that folder, replacing existing files.
3. Keep your existing node_modules, environment and ALLOWED_GROUP_IDS.
4. Run: node test-v6.js
5. Run: node test-social.js
6. Test with AUTO_REPLY=false first, then AUTO_REPLY=true.

Optional environment variables (PowerShell):
$env:REPLY_DELAY_MIN_MS="1000"
$env:REPLY_DELAY_MAX_MS="2000"

Changes:
- Greeting once per group+user per day when the first support request is recognized.
- Friendly closure for 'ok roi', 'cam on' and related short messages.
- 1-2 second delay before sending a reply.
- Standalone greetings/closures in group are not responded to unless the sender has an active session or explicitly addresses POS Care, to avoid interrupting others.
- No typing indicator: not implemented; zca-js API support must be verified separately.
- Does not guess gender or real name from sender ID.

Warning: This uses unofficial Zalo personal account automation. Test only with consent, avoid sensitive merchant data and keep AUTO_REPLY disabled until reviewed.
