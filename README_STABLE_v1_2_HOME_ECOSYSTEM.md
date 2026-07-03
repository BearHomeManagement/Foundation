# BHM STABLE v1.2 — Customer Home Ecosystem App

This patch does not rebuild the public website or the internal BearTrack/Ops app.

Changed files:
- customer.html
- manifest.webmanifest
- service-worker.js

Adds:
- Customer onboarding
- Adult-present required acknowledgement
- Property profile
- HVAC filter size / filter photo input
- Home Ecosystem app after setup
- Live customer tiles pulling from the customer profile and local BearTrack queue
- Add Work Order from the ecosystem
- Mobile/PWA support for Add to Home Screen

Data storage for testing:
- Customer profile: localStorage key `bhm_customer_profile`
- Ops/BearTrack queue: localStorage key `bhm_records`

Test paths:
- Website: /index.html
- Customer Portal / Home Ecosystem: /customer.html
- Internal BearTrack/Ops: /app.html
