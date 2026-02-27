

## Problem

The Auth page has a `useEffect` that calls `signOut()` whenever a user is detected. This creates an infinite loop: user signs in → `onAuthStateChange` fires → Auth component detects user → signs them out → repeat. The network logs confirm this: login succeeds (200), then immediately signs out (204), then logs in again, endlessly.

## Fix

**File: `src/pages/Auth.tsx`**

1. Remove the auto-signout `useEffect`
2. Restore the redirect logic: when a user is logged in and has a role, redirect them to their dashboard (`/citizen`, `/authority`, or `/admin`)
3. While loading, show nothing (or a spinner) to prevent flash

```
// Remove this:
useEffect(() => {
  if (!loading && user) {
    supabase.auth.signOut();
  }
}, [loading, user]);

// Replace with:
if (loading) return null;
if (user && role) {
  const redirectMap = { citizen: "/citizen", authority: "/authority", admin: "/admin" };
  return <Navigate to={redirectMap[role] || "/citizen"} replace />;
}
```

This ensures:
- Signing in as admin → redirects to `/admin`
- Signing in as citizen → redirects to `/citizen`
- Signing in as authority → redirects to `/authority`
- Visiting `/auth` while not logged in → shows the login forms

