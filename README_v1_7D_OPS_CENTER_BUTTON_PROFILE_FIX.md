# BHM Stable v1.7D - Ops Center Button/Profile Fix

Targets only the internal Bear Home Management portal (`app.html`).

Changes:
- Restores official Bear Home Management bear logo in the upper-left portal header.
- Updates header wording to `Operations Portal • Powered by BearTrack™`.
- Makes `+ Customer` create a full customer profile, save locally, attempt Supabase profile sync, attempt property sync, refresh Customers, and open the new profile.
- Makes `+ Work Order` open a real work order creation form.
- New work orders save locally, attempt Supabase sync, refresh Work Orders/Schedule/Ops views, and open the full work order view.
- If no customers exist, `+ Work Order` prompts Ops to create a customer profile first.
- No changes to the public website or customer portal.

Test:
- `/app.html?fresh=17d`
- Ops Center: click `+ Customer`, save, confirm it opens a profile and appears in Customers.
- Ops Center: click `+ Work Order`, save, confirm it appears in Work Orders and schedule areas.
