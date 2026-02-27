

## Problem

The admin login succeeds (200 response, admin user exists with correct role in database), but the page doesn't redirect. This is caused by a race condition in `AuthContext.tsx`:

1. `onAuthStateChange` fires after sign-in
2. Inside the callback, it makes async Supabase queries (`fetchUserData`) which can fail or deadlock because the auth token may not be fully propagated yet
3. The Supabase docs warn against making async Supabase calls inside `onAuthStateChange`

## Fix

Refactor `AuthContext.tsx` to:
1. Keep `onAuthStateChange` synchronous — only set session/user state, no async DB calls
2. Use a separate `useEffect` that watches `user` and triggers `fetchUserData` when user changes
3. Properly manage `loading` state: set it to `true` when user changes, then `false` after data is fetched

### Changes to `src/contexts/AuthContext.tsx`:

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (!session?.user) {
      setRole(null);
      setDepartmentId(null);
      setProfile(null);
      setLoading(false);
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    if (!session?.user) {
      setLoading(false);
    }
  });

  return () => subscription.unsubscribe();
}, []);

// Separate effect to fetch user data when user changes
useEffect(() => {
  if (user) {
    setLoading(true);
    fetchUserData(user.id).finally(() => setLoading(false));
  }
}, [user?.id]);
```

This ensures:
- Auth state changes are handled synchronously (no deadlock)
- User data is fetched reactively when user changes
- Loading state properly gates the redirect until role is available

