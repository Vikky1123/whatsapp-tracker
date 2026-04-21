// REPLACE placeholders with your Firebase project's config from:
// Firebase Console -> Project settings -> General -> Your apps -> Web app config
// This config is intentionally public; security is enforced by rules + (optional App Check) + auth.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey:            "REPLACE_ME",
  authDomain:        "REPLACE_ME.firebaseapp.com",
  databaseURL:       "https://REPLACE_ME-default-rtdb.firebaseio.com",
  projectId:         "REPLACE_ME",
  storageBucket:     "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME"
};

// OPTIONAL: reCAPTCHA v3 site key for App Check. Leave as-is to skip App Check entirely.
// If you set this, also enable App Check in the Firebase console.
const RECAPTCHA_SITE_KEY = "REPLACE_ME_RECAPTCHA_V3_SITE_KEY";

export const app = initializeApp(firebaseConfig);

// Only initialize App Check if a real site key is configured.
export let appCheck = null;
if (RECAPTCHA_SITE_KEY && !RECAPTCHA_SITE_KEY.startsWith('REPLACE_ME')) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

export const db = getDatabase(app);
