# BearTrack app.html fix

Use `index.html` for the public website and `app.html` for BearTrack.

- Public website BearTrack button now points to `app.html`.
- `portal.html` redirects to `app.html` for old links.
- Customer intake, work order requests, membership requests, and Ops dashboard are now inside `app.html`.
- Ops access code: `BHMOPS`.
- Records save to Supabase if `supabase-config.js` has the project URL, otherwise they save only in the browser local storage for testing.
