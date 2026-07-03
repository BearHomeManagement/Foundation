# BHM Stable v1.4B — Dashboard Dispatch Board

Targeted patch: Dashboard tab only.

Changes:
- Dashboard now opens as the Ops Dispatch Board.
- Added active schedule table for work orders and inspections across properties.
- Added technician status, incoming requests, alerts, and quick actions.
- Kept inspection-mode visual style.
- Existing tabs remain in place.

Test:
- Open /app.html
- Dashboard should show Dispatch Board first.
- Click rows to edit work orders.
- Drag cards between schedule lanes.
- Mark complete and confirm completed items move to History.
