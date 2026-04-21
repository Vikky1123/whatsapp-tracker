import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { setText } from './sanitize.js';

const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
const SESSION_KEY = 'tracker_session_start';

export function bindLoginForm({ formEl, emailEl, passwordEl, errorEl, onSuccessRedirect = 'dashboard.html' }) {
  formEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setText(errorEl, '');
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) {
      setText(errorEl, 'Email and password are required.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem(SESSION_KEY, String(Date.now()));
      window.location.href = onSuccessRedirect;
    } catch (err) {
      setText(errorEl, mapAuthError(err));
    }
  });
}

function mapAuthError(err) {
  const code = err && err.code;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Wrong email or password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Try again in a few minutes.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your connection.';
  }
  return 'Sign-in failed. Try again.';
}

export async function doSignOut() {
  localStorage.removeItem(SESSION_KEY);
  try { await signOut(auth); } catch (_) { /* ignore */ }
  window.location.href = 'index.html';
}

export function requireAuth({ onReady } = {}) {
  console.log('[tracker] requireAuth waiting for Firebase auth state…');
  onAuthStateChanged(auth, (user) => {
    console.log('[tracker] auth state:', user ? `signed in as ${user.email} (${user.uid})` : 'signed out');
    if (!user) {
      const path = window.location.pathname;
      if (path.endsWith('index.html') || path === '/' || path.endsWith('/public/')) {
        return;
      }
      window.location.href = 'index.html';
      return;
    }
    const started = Number(localStorage.getItem(SESSION_KEY) || Date.now());
    const elapsed = Date.now() - started;
    if (elapsed > SESSION_MAX_MS) {
      console.log('[tracker] session expired, signing out');
      doSignOut();
      return;
    }
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, String(Date.now()));
    }
    if (onReady) onReady(user);
  });
}

export function watchSessionTimeout() {
  setInterval(() => {
    const started = Number(localStorage.getItem(SESSION_KEY) || 0);
    if (!started) return;
    if (Date.now() - started > SESSION_MAX_MS) doSignOut();
  }, 60_000);
}
