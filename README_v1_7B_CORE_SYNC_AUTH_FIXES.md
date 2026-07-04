# BHM Stable v1.7B — Core Sync + Auth Fixes

Fixes:
- Adds Supabase config file used by customer and ops apps.
- Restores real Supabase sign-up verification flow from Customer Portal.
- Stops Customer Portal from sending new accounts directly into Ecosystem before property setup.
- After verified login, customer goes to Property Setup first.
- Ops Portal syncs Customers and Work Orders from Supabase into the Customers and Work Orders tabs.
- Replaces placeholder internal portal bear icon with the official BHM logo asset.
- Save button now attempts a cloud sync.

Test URLs after deploy:
- /customer.html?fresh=17b
- /app.html?fresh=17b

If the installed PWA still shows old data, remove the home screen app and reinstall after deploy.
