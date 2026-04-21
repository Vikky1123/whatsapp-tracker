// REPLACE placeholders with your Firebase project's config from:
// Firebase Console -> Project settings -> General -> Your apps -> Web app config
// This config is intentionally public; security is enforced by rules + App Check + auth.
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

const RECAPTCHA_SITE_KEY = "REPLACE_ME_RECAPTCHA_V3_SITE_KEY";

export const app = initializeApp(firebaseConfig);

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

export const db = getDatabase(app);
