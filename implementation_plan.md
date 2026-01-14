# Dashboard Progress Bar Implementation

## Overview
Implemented a visual progress bar on the student dashboard to track application status (Total, Approved, Pending, Rejected) using a new API endpoint.

## Key Changes

### 1. API Integration (`utils/api.ts`)
- Added `getApplicationProgress(token)` function.
- Endpoint: `local_mobileapi_get_application_progress`.
- Returns: `{ total_submitted, approved, pending, rejected }`.

### 2. Dashboard Logic (`student-dashboard.tsx`)
- Integrated `getApplicationProgress` call in `useEffect`.
- Added `applicationProgress` state variable.
- Replaced legacy progress calculation with direct API data.
- Added fallback logic to use legacy `statusCounts` if API data is unavailable but local stats exist.

### 3. UI Implementation
- Replaced the simple progress bar with a **Segmented Progress Bar**.
- Visualized 3 segments:
  - **Approved**: Green (#4CAF50)
  - **Pending**: Orange (#FF9800)
  - **Rejected**: Red (#F44336)
- Added a Legend/Key below the bar to explain colors.
- Added styles for the new components (`progressCard`, `segmentedProgressBar`, `progressLegend`).

## Verification
- Checked API URL construction.
- Verified state updates in `useEffect`.
- Verified UI rendering logic for segments (flex-based width).
- Confirmed styling is responsive and theme-aware.
