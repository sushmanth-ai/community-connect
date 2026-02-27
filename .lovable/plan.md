

## Problem Analysis

**Issue 1: Authority dashboard shows no data.** The current user has role `admin` with `department_id = NULL`. The `AuthorityDashboard` and `AuthorityQueue` both filter issues by `departmentId` (`if (!departmentId) return;`), so when an admin visits these pages, nothing loads.

**Issue 2: Authority login with Mobile + Aadhaar.** Need a separate login flow for authority users using mobile number and Aadhaar number instead of email/password. Admin creates authority accounts with these credentials.

---

## Implementation Plan

### Task 1: Fix Authority Dashboard for Admin Users

**Files:** `src/pages/authority/AuthorityDashboard.tsx`, `src/pages/authority/AuthorityQueue.tsx`, `src/pages/authority/AuthorityStats.tsx`

- Remove the `if (!departmentId) return;` guard
- When `departmentId` is null (admin user), fetch ALL issues instead of filtering by department
- Add a department filter dropdown so admins can optionally filter by department
- Stats should aggregate across all departments when no department is set

### Task 2: Database Migration — Add mobile_number and aadhaar_hash to profiles

**Migration SQL:**
- Add `mobile_number TEXT UNIQUE` to `profiles` table
- Add `aadhaar_hash TEXT` to `profiles` table
- Create a database function `authority_login(mobile TEXT, aadhaar TEXT)` that:
  - Looks up a profile with matching mobile_number
  - Checks the user has role = 'authority'
  - Verifies aadhaar using `crypt()` / `pgcrypto` extension
  - Returns the user_id if valid, null otherwise

### Task 3: Edge Function — `authority-login`

**File:** `supabase/functions/authority-login/index.ts`

- Accepts POST with `{ mobile_number, aadhaar_number }`
- Validates: mobile format (10 digits), aadhaar format (12 digits)
- Rate limiting via simple in-memory counter (per IP)
- Queries profiles for matching mobile_number
- Verifies aadhaar_hash using bcrypt comparison via database function
- Checks user_roles for role = 'authority'
- On match: generates a Supabase session using admin API (`supabase.auth.admin.getUserById` + custom token)
- Returns session token or error message

### Task 4: Admin Panel — Create Authority Account Form

**File:** `src/pages/admin/AdminDepartments.tsx` (extend) or new `src/pages/admin/ManageAuthorities.tsx`

- Form with: Name, Mobile Number, Aadhaar Number (12 digits), Department selection, Email, Password
- Admin creates a Supabase auth user via edge function
- Edge function hashes aadhaar with bcrypt, stores mobile_number and aadhaar_hash in profiles
- Sets user_role to 'authority' with selected department_id
- Add nav link in admin sidebar

### Task 5: Authority Login Tab on Auth Page

**File:** `src/pages/Auth.tsx`

- Add a third tab: "Authority Login"
- Form fields: Mobile Number (10-digit validation), Aadhaar Number (12-digit validation, masked input)
- Calls `authority-login` edge function
- Shows loading state during request
- On success: stores session, redirects to `/authority`
- On error: shows "Invalid credentials" toast
- Input validation with proper error messages

### Task 6: Auth Context Updates

**File:** `src/contexts/AuthContext.tsx`

- Add `authorityLogin(mobile: string, aadhaar: string)` method
- This calls the edge function and sets the session using `supabase.auth.setSession()`

### Task 7: Update config.toml

- Add `[functions.authority-login]` with `verify_jwt = false`
- Add `[functions.create-authority]` with `verify_jwt = false`

---

## Technical Details

### Database changes:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE profiles ADD COLUMN mobile_number TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN aadhaar_hash TEXT;

CREATE OR REPLACE FUNCTION verify_authority_credentials(
  _mobile TEXT, _aadhaar TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
  _stored_hash TEXT;
BEGIN
  SELECT p.id, p.aadhaar_hash INTO _user_id, _stored_hash
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.mobile_number = _mobile AND ur.role = 'authority';
  
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  IF _stored_hash = crypt(_aadhaar, _stored_hash) THEN
    RETURN _user_id;
  END IF;
  RETURN NULL;
END;
$$;
```

### Edge function flow:
1. `authority-login`: validate inputs → call `verify_authority_credentials` RPC → if valid, use service role to generate a custom session
2. `create-authority`: admin-only → create auth user → update profile with mobile + hashed aadhaar → insert user_role as authority

### Security:
- Aadhaar stored as bcrypt hash (never plaintext)
- Mobile number validated as exactly 10 digits
- Aadhaar validated as exactly 12 digits
- Edge function uses service role key for admin operations
- Rate limiting on login endpoint

