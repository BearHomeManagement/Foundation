# BHM Stable v1.7 - Customer + Ops Stability

## Ops / Bear Home Management Portal
- Customer create/edit now includes Street Address, City, State, and ZIP.
- Work Orders now include Open, Edit, Start, Pause, Complete, Duplicate, and Archive actions.
- Work Order Open view shows customer, property, service, schedule, technician, notes, status, and payment support reference.
- Completed and archived work orders move to History and stay linked to the customer profile.
- Customer profile view now shows active and completed/history work records.
- Technician assignment now uses a role/team dropdown:
  - Robert Richardson — Management
  - Heather (Harley) Richardson — Operations
  - Travis — Lead Technician
  - Technician 2 — Technician
  - Unassigned

## Customer Portal / Mobile App
- Login and Create Account are separate flows.
- Create Account includes password requirements, password confirmation, and show/hide controls.
- Forgot/Reset Password triggers Supabase recovery email.
- Password reset screen supports new password + confirmation.
- Customer access fields reset after create/login/logout.
- Added Log Out / Switch Customer.
- Property setup includes Street Address, City, State, and ZIP.
- Customer nickname/header contrast improved.

## Website
- Call button shows (904) 424-9092.
- On desktop it copies the number to clipboard.
- On mobile it opens the phone dialer.

## Important Supabase note
For reset password email links, add the deployed customer URL to Supabase Auth Redirect URLs, such as:
https://bearhomemanagement.com/customer.html
