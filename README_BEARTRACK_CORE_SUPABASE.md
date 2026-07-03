# BHM Stable v1.3 - BearTrack Core Supabase Test

This patch connects the Customer Ecosystem and BearTrack Ops dashboard to Supabase.

## Important
Before testing, run `supabase-schema.sql` in Supabase SQL Editor.

## Files added/updated
- `supabase-config.js` - public Supabase URL and anon/publishable key
- `supabase-schema.sql` - database tables and testing policies
- `customer.html` - real create/login fields and cloud work order writes
- `app.html` - BearTrack Ops reads/syncs cloud work orders

## Test flow
1. Deploy all files to GitHub/Netlify.
2. In Supabase, run `supabase-schema.sql` once.
3. Open `/customer.html` from the phone/PWA.
4. Create a new account with email/password.
5. Complete property/service/work order setup.
6. Open `/app.html` on computer.
7. Click Refresh/let records load.
8. Confirm the phone request appears in BearTrack.

## Note
The SQL policies are permissive for testing. Before launch, tighten RLS policies and add proper role-based auth.
