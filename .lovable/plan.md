

## Plan: Authority Assignment System with Mandal Support

### Database Changes (Migration)

1. **Create `mandals` table** with columns: `id`, `name`, `district`, `state`, `status`, `created_at`
2. **Seed 40 Nellore district mandals** into the table
3. **Add `mandal_id` column** to `issues` table (nullable FK to mandals)
4. **Add `mandal_id` column** to `profiles` table (to track authority's assigned mandal)
5. **Add `gov_id` column** to `profiles` table
6. **Add `first_login` boolean** to `profiles` table (default true)
7. **Add `active_status` boolean** to `profiles` table (default true)
8. **RLS policies** for mandals (public read, admin manage)
9. **Unique constraint**: one active authority per mandal+department combination

### Edge Function Changes

**Update `create-authority`** to:
- Accept `mandal_id` and `gov_id` 
- Generate a cryptographically secure 12+ character password (no AI needed — crypto random is standard)
- Store mandal_id, gov_id, first_login, active_status on profile
- Return the generated password to admin for display/email

**Update `authority-login`** to use **email + password** (standard Supabase auth) instead of mobile+aadhaar. Check `active_status` before allowing login. Track `last_login`.

### Auth Page Changes

- **Replace** AuthorityLoginForm from mobile+aadhaar to **email + password** fields
- After login, if `first_login === true`, redirect to a **password reset flow** (force change password page)
- Update `last_login` on profiles after successful login

### New Page: Force Password Change

- `/authority/change-password` — shown on first login
- Updates password via `supabase.auth.updateUser({ password })`
- Sets `first_login = false` on profile

### ManageAuthorities Page Overhaul

- **Mandal dropdown** (fetched from mandals table, filtered by district="Nellore", sorted alphabetically)
- **Department dropdown** (from existing departments table)
- **Authority details**: Name, Email, Phone, Gov ID, Active toggle
- **Auto-generate password** button (client-side crypto random, 12+ chars, upper/lower/numbers/special)
- **Assign Authority** button → calls updated `create-authority` edge function
- On success: display credentials in a dialog (email + generated password) with copy button
- **Management table** below form: Mandal, Department, Name, Email, Phone, Status, Last Login, Reset Password button, Deactivate button
- **Search** by mandal or department name

### Authority Dashboard Filtering

- Update `AuthorityDashboard` and `AuthorityQueue` to also filter by `mandal_id` from the authority's profile
- Issues query: `department_id = authority.department_id AND mandal_id = authority.mandal_id`
- Update `AuthContext` to expose `mandalId` from profile

### Issue Submission

- Add **Mandal dropdown** to `SubmitIssue` page so citizens select which mandal the issue is in
- Pass `mandal_id` to the `submit-issue` edge function
- Update edge function to store `mandal_id` on created issues

### Security Notes

- Passwords are never stored in plaintext (Supabase auth handles bcrypt hashing)
- Rate limiting already exists on authority-login edge function
- Active status check prevents deactivated authorities from logging in
- Email sending is noted but **not automatically supported** — credentials will be displayed to admin for manual sharing (Lovable only supports auth emails, not arbitrary transactional emails)

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/new.sql` | Create mandals table, seed data, alter profiles & issues |
| `supabase/functions/create-authority/index.ts` | Add mandal, password gen, gov_id |
| `supabase/functions/authority-login/index.ts` | Switch to email+password auth |
| `src/pages/admin/ManageAuthorities.tsx` | Full overhaul with mandal, management table |
| `src/pages/Auth.tsx` | Authority login → email+password |
| `src/pages/authority/ChangePassword.tsx` | New: force password change |
| `src/contexts/AuthContext.tsx` | Add mandalId, active_status, first_login |
| `src/pages/authority/AuthorityDashboard.tsx` | Filter by mandal_id |
| `src/pages/authority/AuthorityQueue.tsx` | Filter by mandal_id |
| `src/pages/citizen/SubmitIssue.tsx` | Add mandal selection |
| `src/App.tsx` | Add change-password route, update ProtectedRoute logic |
| `src/components/ProtectedRoute.tsx` | Redirect to change-password if first_login |

