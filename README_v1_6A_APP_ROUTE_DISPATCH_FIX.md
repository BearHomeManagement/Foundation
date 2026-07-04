# BHM Stable v1.6A — App Route / Dispatch Fix

Purpose:
- Ensures /app and /app.html serve the same Bear Home Management Ops Center.
- Adds Netlify redirects for /app and /app/.
- Adds app/index.html as a fallback route.
- Updates service worker cache to v1.6A and forces app route network-first so old dashboards do not remain cached.

Test:
- Open https://bearhomemanagement.com/app?fresh=16a
- Open https://bearhomemanagement.com/app.html?fresh=16a
- Both should show Bear Home Management Ops Center with Live Schedule Board.
