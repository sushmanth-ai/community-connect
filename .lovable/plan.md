

## Problem

There are **no admin users** in the database. The `user_roles` table has zero admin entries, so no one can log in and access the admin dashboard or any admin sub-pages.

## Root Cause

No admin account was ever created. The signup flow creates "citizen" roles by default, and there's no mechanism to create an admin account.

## Plan

### 1. Create a seeded admin account via edge function

Create a new edge function `seed-admin` that:
- Creates an admin user with fixed credentials (e.g., `admin@resolvit.com` / `admin123456`)
- Creates the profile entry
- Assigns the `admin` role in `user_roles`
- Is idempotent (safe to call multiple times)

### 2. Add an "Admin Login" quick-access option on the Auth page

Add a clearly visible section or button on the Auth page that pre-fills the admin credentials (email: `admin@resolvit.com`, password: `admin123456`) so the user can log in with one click, or simply document the credentials.

### 3. Call the seed function on app startup or provide a setup button

Either:
- Call the `seed-admin` function automatically when the Auth page loads (once), or
- Add a "Setup Admin" button that invokes it

### Implementation Steps

1. **Create `supabase/functions/seed-admin/index.ts`** - Edge function that uses the service role key to create the admin user via `supabase.auth.admin.createUser()`, then inserts into `profiles` and `user_roles` with role `admin`.

2. **Update `src/pages/Auth.tsx`** - Call the seed-admin function on mount (silently, idempotently). Pre-fill or display the admin credentials so the user knows how to log in.

3. **Verify all 6 admin routes work** - Dashboard, Map, Departments, Authorities, Escalations, Leaderboard are all already wired in `App.tsx` and the sidebar nav.

### Technical Details

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` (already available in edge functions) to call `auth.admin.createUser` with `email_confirm: true`
- Fixed credentials: `admin@resolvit.com` / `admin123456`
- The function checks if the user already exists before creating

