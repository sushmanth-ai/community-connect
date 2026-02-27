

## Plan: Auto-send Authority Credentials via Resend

### Step 1: Add RESEND_API_KEY secret
- Use `add_secret` tool to request the Resend API key from the user

### Step 2: Update `create-authority` edge function
- After successfully creating the authority account, call Resend's API to send an email
- Email contains: authority name, mandal, department, login email, temporary password, login URL
- If email fails, still return success but include `email_sent: false` in the response

### Step 3: Update ManageAuthorities UI
- Show email delivery status in the credentials dialog (sent vs failed)
- Add a "Resend Email" button if the initial send failed
- Show toast notification on successful email delivery

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/create-authority/index.ts` | Add Resend email sending after account creation |
| `src/pages/admin/ManageAuthorities.tsx` | Show email status, add resend button |

