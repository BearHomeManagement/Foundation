# BearTrack Cloud/Ops Patch

- Public website design remains unchanged.
- `portal.html` is customer-facing login/intake.
- `ops.html` is internal Ops Dashboard. Temporary ops code: `BHMOPS`.
- Customer profile, work order, and membership requests save locally immediately.
- To save to Supabase cloud, add your Supabase Project URL in `supabase-config.js` and run `SUPABASE_SETUP.sql` in Supabase SQL Editor.
- Work order photos upload to the `beartrack-photos` storage bucket when Supabase is configured.

