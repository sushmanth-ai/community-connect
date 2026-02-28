

## Plan: Fix EmailJS Server-Side API Call

**Root cause**: The edge function logs show `"API calls are disabled for non-browser applications"`. EmailJS requires a **private key** (not the public key) for server-side/REST API calls. The private key must be sent as `accessToken` instead of `user_id`.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/create-authority/index.ts` | Change `user_id: publicKey` to `user_id: publicKey, accessToken: privateKey` in the EmailJS payload |

### Secret needed
- `EMAILJS_PRIVATE_KEY` — Found in EmailJS Dashboard → Account → Private Key. This is required for server-side API calls.

### Implementation
In `sendCredentialsEmail`, add the private key to the request body:
```json
{
  "service_id": "...",
  "template_id": "...",
  "user_id": publicKey,
  "accessToken": privateKey,
  "template_params": { ... }
}
```

