# BHM Live App Fix

This patch targets the real live BearTrack/Ops app path:

`app/index.html`

Upload/replace this file in GitHub:

`Foundation/app/index.html`

This fixes the issue where `/app` was serving a different app than `/app.html`.

## Included fixes

- Replaces the hardcoded emoji mark with a logo image fallback.
- Adds Supabase client support to the live Ops app.
- Keeps localStorage as a fallback cache.
- Loads customers, work orders, and technicians from Supabase when available.
- Saves Ops-created customers/work orders/technicians back to Supabase.
- Adds street/city/state/ZIP to customer profile creation.
- Adds Work Order Open, Edit, Pause, Duplicate, Complete, and Delete actions.
- Completed work orders remain in History.
- Website and Customer App buttons route out of `/app/` correctly.

## Important

Run `supabase/live-app-schema.sql` if the cloud tables do not already contain the required text ID columns.
