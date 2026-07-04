# BHM Stable v1.7A — Customer Portal Auth + Call Button Fix

Targets the files Robert tested directly:

- `customer.html`
  - Log In and Create Account are separate views.
  - Forgot / Reset Password remains on Log In.
  - Password show/hide buttons are visible.
  - Password requirements remain visible during account creation.
  - Access forms reset sensitive values.

- `index.html`
  - Call button displays `(904) 424-9092` instead of generic CALL text.

- `service-worker.js`
  - Cache version bumped to `bhm-ecosystem-v1-7a`.
  - HTML files use network-first fetching so the installed mobile app sees updates.

Test URLs:
- `/customer.html?fresh=17a`
- `/index.html?fresh=17a`

If the installed phone app still shows old screens, remove the old home-screen app icon and reinstall from Chrome/Safari after this deploy.
