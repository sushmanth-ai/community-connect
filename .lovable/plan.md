

## Analysis

**Problem 1 - Citizen Dashboard**: The recent issues query uses `.limit(5)`, only showing the last 5 issues. Users expect to see all their reported issues.

**Problem 2 - Authority Dashboard**: After updating an issue's status (e.g., "Start Work" or "Resolve"), only the local `issues` array is updated but the stats (total, resolved, escalated, avg time) are NOT recalculated. The stats only refresh when `effectiveDeptId` or `filter` changes.

## Fix

### File: `src/pages/citizen/CitizenDashboard.tsx`
- Remove `.limit(5)` from the recent issues query so all citizen issues appear
- Optionally increase or remove the limit to show all issues

### File: `src/pages/authority/AuthorityDashboard.tsx`
- Add a `refreshKey` state counter
- After `updateStatus` succeeds, increment `refreshKey` to trigger a re-fetch
- Add `refreshKey` to the useEffect dependency array so stats and issues list both refresh after any status change

### File: `src/pages/authority/AuthorityQueue.tsx`
- Same fix: add `refreshKey` state and trigger re-fetch after status updates

