import { db, auth } from './firebase-init.js';
import { ref, push, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

export async function logAudit(action, { targetId = null, authorName = null } = {}) {
  try {
    const user = auth.currentUser;
    const author = authorName || (user && user.email) || 'unknown';
    await push(ref(db, 'audit'), {
      action: String(action).slice(0, 100),
      author: String(author).slice(0, 100),
      targetId: targetId ? String(targetId).slice(0, 200) : '',
      at: serverTimestamp(),
    });
  } catch (_) {
    // audit failures are non-fatal
  }
}
