BearOps Cloud v1

Files:
- app.html
- app.css
- app.js
- config.js
- SUPABASE_RLS_SETUP.sql

Before upload:
1. Open config.js.
2. Replace PASTE_YOUR_PUBLISHABLE_KEY_HERE with your Supabase publishable key.
3. Save.

Supabase setup:
1. Run SUPABASE_RLS_SETUP.sql in Supabase SQL Editor.
2. Go to Supabase Authentication > Users.
3. Create your first user with email and password.

Upload to GitHub:
Upload these files to your repository.
After Netlify deploys, open:
https://bearhomemanagement.com/app.html

Important:
This is the first cloud-connected BearOps application.
Data saves to Supabase, not browser local storage.
