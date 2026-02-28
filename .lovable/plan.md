

## Plan: Fix Password Redirect, Replace Resend with EmailJS

### 1. Fix ChangePassword redirect issue

**Root cause**: After setting `first_login = false` in the database, `AuthContext.firstLogin` state remains `true` in memory. When navigating to `/authority`, `ProtectedRoute` sees `firstLogin === true` and redirects back to `/authority/change-password`.

**Fix**: 
- Add a `setFirstLogin` setter (or `refreshProfile` method) to `AuthContext` 
- In `ChangePassword.tsx`, call it after the DB update so the in-memory state is synced before navigating

**Files**: `src/contexts/AuthContext.tsx`, `src/pages/authority/ChangePassword.tsx`

### 2. Remove Resend, add EmailJS

**What changes**:
- Replace the Resend API call in `create-authority/index.ts` with EmailJS REST API (`https://api.emailjs.com/api/v1.0/email/send`)
- Remove `RESEND_API_KEY` usage
- Request 3 new secrets: `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`
- Update `ManageAuthorities.tsx` retry logic to use the same EmailJS path

**Edge function (`create-authority/index.ts`)**:
- Replace `sendCredentialsEmail` to call EmailJS REST API with template parameters (authority name, email, password, mandal, department, login URL)
- The EmailJS template should be configured by the user on emailjs.com with matching template variables

**Admin UI (`ManageAuthorities.tsx`)**: No structural changes needed -- the retry button already calls the `_action: "resend_email"` path which will now use EmailJS internally.

### Required Secrets (user will need to provide)
| Secret | Where to find |
|--------|--------------|
| `EMAILJS_SERVICE_ID` | EmailJS Dashboard → Email Services |
| `EMAILJS_TEMPLATE_ID` | EmailJS Dashboard → Email Templates |
| `EMAILJS_PUBLIC_KEY` | EmailJS Dashboard → Account → Public Key |

### File Changes Summary

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Expose `setFirstLogin` in context |
| `src/pages/authority/ChangePassword.tsx` | Call `setFirstLogin(false)` after DB update, before navigate |
| `supabase/functions/create-authority/index.ts` | Replace Resend with EmailJS REST API |

