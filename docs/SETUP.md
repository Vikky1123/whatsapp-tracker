# Setup guide

Step-by-step Firebase + Netlify setup for the WhatsApp Project Tracker. Estimated time: 30 minutes.

## Prerequisites

- A Google account (for Firebase).
- A GitHub/GitLab/Bitbucket account.
- A Netlify account (free).

## 1. Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. Name it (e.g. `whatsapp-tracker`). Disable Google Analytics to keep it simple.
3. **Enable MFA on your Google account** (https://myaccount.google.com/security → 2-Step Verification). This protects the Firebase project from takeover if your Google password leaks.

### Realtime Database

1. **Build → Realtime Database → Create Database** → pick a region (e.g. `us-central1`) → **Start in locked mode**.
2. **Rules tab** → paste contents of `firebase.rules.json` → **Publish**.
   - Don't worry about the `REPLACE_WITH_SHARED_UID` placeholder yet — we'll replace it after creating the shared user.

### Authentication

1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**. Do NOT enable any other sign-in methods.
2. **Users tab → Add user** → use a shared email (e.g. `tracker-shared@yourdomain.com`) and a strong 20+ character password.
3. Copy the new user's **UID** (click the user row, UID is at the top).

### Fill the UID into rules

1. In `firebase.rules.json`, replace both `REPLACE_WITH_SHARED_UID` occurrences with the real UID.
2. Paste the updated rules back into Firebase Console → Rules tab → **Publish**.
3. Commit:
   ```
   git add firebase.rules.json
   git commit -m "chore(security): set shared UID in rules"
   ```

### App Check with reCAPTCHA v3

1. **Build → App Check → Register app → reCAPTCHA v3**.
2. Follow the link to create a reCAPTCHA v3 site in Google Cloud.
3. Add `localhost` + your future Netlify domain to the allowed domains.
4. Copy the **site key**.
5. Paste the site key into the Firebase App Check setup → **Save**.
6. **Enable Enforcement** for Realtime Database (click the toggle).

### Web app config

1. **Project settings (gear icon) → General → Your apps → Add app → Web**.
2. Register with a name like `tracker-web` → skip Hosting → **Continue**.
3. Copy the `firebaseConfig` object that appears.
4. Paste it into `public/js/firebase-init.js`, replacing the `REPLACE_ME` values.
5. Paste the reCAPTCHA site key into `RECAPTCHA_SITE_KEY`.

## 2. Push repo to GitHub

```bash
git remote add origin https://github.com/YOUR_USER/whatsapp-tracker.git
git branch -M main
git push -u origin main
```

## 3. Netlify

1. Sign up at https://app.netlify.com.
2. **Sites → Add new → Import an existing project** → choose your Git provider → authorize → pick the repo.
3. Netlify will read `netlify.toml`. Confirm **Publish directory = `public`**, build command empty. Click **Deploy site**.
4. Copy the generated URL (like `https://sparkly-unicorn-a1b2c3.netlify.app`).

## 4. Wire them together

1. Firebase Console → **Authentication → Settings → Authorized domains → Add domain** → paste the Netlify URL (without `https://`).
2. Google Cloud → reCAPTCHA Enterprise → edit your site key → add the Netlify domain → save.

## 5. Smoke test

Visit the Netlify URL:

1. Try wrong password → error shown.
2. Sign in with the shared credentials → dashboard loads.
3. Click **+ New project** → fill a title → Create → project detail page loads.
4. Click **+ Paste WhatsApp messages** → paste a sample block:
   ```
   [4/20/26, 2:14 PM] Tomi: test message
   [4/20/26, 2:17 PM] Bayo: another one
   ```
   → Preview shows "Parsed 2 messages" → Import → both bubbles appear.
5. Change status dropdown → refresh → status persists.
6. Open a second incognito tab → sign in → open same project → add a note in tab 1 → tab 2 shows it within 1 second (real-time sync check).
7. Dashboard → gear icon → Export backup → JSON downloads.
8. Sign out → redirects to login.
9. Delete the test project (Details tab → Delete → type title → confirm) → returns to dashboard clean.

## 6. Share credentials

Send the Netlify URL and the shared email/password to your teammates via a **secure channel** — NOT the WhatsApp group itself. Use Signal, encrypted email, or an in-person hand-off.

## Troubleshooting

- **"Permission denied" on read/write** — UID in `firebase.rules.json` doesn't match the shared user's UID. Re-check step "Fill the UID into rules".
- **reCAPTCHA errors in DevTools** — domain not added to the reCAPTCHA key. Google Cloud → edit key → add domain.
- **CSP violations in DevTools Console** — `_headers` file not picked up. Ensure it's copied into `public/_headers` (Netlify publishes from there).
- **"Auth domain not authorized"** — Firebase Authentication → Settings → Authorized domains → add your domain.
- **Firebase config still shows `REPLACE_ME`** — you forgot step "Web app config". Open `public/js/firebase-init.js` and paste your real config.
