# BHM Stable v1.7C - Auth Email and Recovery Fix

Focus: customer portal authentication only.

## Fixes
- Customer account creation uses Supabase Auth sign-up again.
- Customer is not sent directly to the Ecosystem after account creation.
- After account creation, customer sees a verify-email instruction.
- After verified login/redirect, customer is routed to Property Setup before Ecosystem.
- Reset password uses Supabase recovery email with a customer.html reset redirect.
- Reset link opens a Set New Password panel.
- Customer portal cache bumped to v1.7C.

## Required Supabase Settings
In Supabase Dashboard -> Authentication -> URL Configuration:
- Site URL: https://bearhomemanagement.com
- Redirect URLs should include:
  - https://bearhomemanagement.com/customer.html
  - https://bearhomemanagement.com/customer.html?verified=1
  - https://bearhomemanagement.com/customer.html?reset=1
  - https://bearhomemanagement.com/**

In Supabase Dashboard -> Authentication -> Providers -> Email:
- Confirm email should be enabled if you want verification emails required.
- If no verification email arrives, check Supabase Auth logs and spam/junk folder.
