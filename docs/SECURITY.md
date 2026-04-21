# Security runbook

## Threat model

- **3-person trusted group** shares one login. No per-user accountability.
- Data stored is **project coordination** (titles, statuses, pasted WhatsApp discussions, notes). **Not** secrets, payment info, or client passwords.
- Weakest links: the shared password; the Google account that owns the Firebase project.

## What NOT to store

- ❌ Client passwords, OTPs, API keys
- ❌ Payment card numbers, bank details
- ❌ Personal ID numbers, NDAs, legal documents

If any of the above leaks into the tracker, delete the entry and create a new, sanitized one.

## Rotating the shared password

1. Firebase Console → **Authentication → Users** → click the shared user → **Reset password**.
2. Set a new strong password (20+ chars).
3. Tell the team via a secure channel (NOT the WhatsApp group).

## Revoking all active sessions

1. Firebase Console → **Authentication → Users** → delete the user.
2. Recreate with the same email and a new password.
3. Copy the **new UID**.
4. Update `firebase.rules.json` with the new UID.
5. Publish rules in the Firebase console.
6. Commit the file.

## Restoring from a backup

1. Dashboard → settings gear → **Export backup** (do this weekly as maintenance).
2. If data is corrupted or deleted: Firebase Console → **Realtime Database → three-dot menu → Import JSON**.
3. Upload the `data` field of your backup (strip the `exportedAt` and `projectCount` wrapper — Firebase expects the raw tree).

## Emergency kill-switch

If you suspect a compromise, freeze all reads/writes instantly:

1. Firebase Console → **Realtime Database → Rules tab**.
2. Replace with:
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
3. Click **Publish**.
4. Investigate, rotate credentials, restore rules, resume.

## Rule test cases

Use the Firebase Rules simulator (Realtime Database → Rules tab → **Simulator**):

1. **Unauth read blocked**
   - Location: `/projects` · Authenticated: off · Read → **Denied**.

2. **Unauth write blocked**
   - Location: `/projects/test` · Data: `{"title":"x","status":"new","createdAt":{".sv":"timestamp"}}` · Authenticated: off · Write → **Denied**.

3. **Auth as random UID blocked**
   - Same payload, Authenticated: on with UID `random123` · Write → **Denied**.

4. **Auth as shared UID allowed**
   - Same payload, Authenticated: on with the shared UID · Write → **Allowed**.

5. **Invalid status rejected**
   - Location: `/projects/test` · `{"title":"x","status":"bogus","createdAt":{".sv":"timestamp"}}` · Shared UID · Write → **Denied**.

6. **Extra field rejected**
   - `/projects/test` · `{"title":"x","status":"new","createdAt":{".sv":"timestamp"},"evil":"x"}` · Shared UID · Write → **Denied**.

7. **Audit immutability**
   - Write `/audit/event1` with valid data → **Allowed**.
   - Write to same path again → **Denied** (data already exists).

## Regular maintenance

- **Weekly:** export a backup (Dashboard → settings → Export backup) and save to Google Drive.
- **Monthly:** test that a backup actually restores (import into a separate test Firebase project and verify).
- **Quarterly:** rotate the shared password as a discipline, not just on compromise.
