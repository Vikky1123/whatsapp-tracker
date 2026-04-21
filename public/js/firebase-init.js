// REPLACE placeholders with your Firebase project's config from:
// Firebase Console -> Project settings -> General -> Your apps -> Web app config
// This config is intentionally public; security is enforced by rules + (optional App Check) + auth.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey:            "AIzaSyAhO8A6Xd42pnqju5l_Z6yg5tXH_1S-5F8",
  authDomain:        "whatsapp-tracker-vikky.firebaseapp.com",
  databaseURL:       "https://whatsapp-tracker-vikky-default-rtdb.firebaseio.com",
  projectId:         "whatsapp-tracker-vikky",
  storageBucket:     "whatsapp-tracker-vikky.firebasestorage.app",
  messagingSenderId: "684161835299",
  appId:             "1:684161835299:web:a0ac436b50d429fddbac96"
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
