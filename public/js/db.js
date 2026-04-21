import { db } from './firebase-init.js';
import {
  ref, push, update, remove, onValue, get, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { logAudit } from './audit.js';

const VALID_STATUSES = new Set([
  'new','quoted','awaiting_client','approved','in_progress','review','revisions','delivered','paid',
]);

export const DEFAULT_PROJECT = {
  title: '', clientName: '', platform: '', price: '', deadline: '', assignee: '',
  clientRequest: '', ourApproach: '', deliverables: '', outcome: '',
  status: 'new', links: [],
};

export function subscribeProjects(callback) {
  const projectsRef = ref(db, 'projects');
  return onValue(projectsRef, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, p]) => ({ id, ...p }));
    callback(list);
  });
}

export function subscribeProject(projectId, callback) {
  const r = ref(db, `projects/${projectId}`);
  return onValue(r, (snap) => {
    const val = snap.val();
    callback(val ? { id: projectId, ...val } : null);
  });
}

export async function createProject(fields) {
  const projectsRef = ref(db, 'projects');
  const safe = mergeProject(DEFAULT_PROJECT, fields);
  safe.createdAt = serverTimestamp();
  safe.updatedAt = serverTimestamp();
  if (!VALID_STATUSES.has(safe.status)) safe.status = 'new';
  const p = await push(projectsRef, safe);
  await logAudit('create_project', { targetId: p.key });
  return p.key;
}

export async function updateProject(projectId, patch) {
  const updates = { ...patch, updatedAt: serverTimestamp() };
  if (patch.status && !VALID_STATUSES.has(patch.status)) {
    throw new Error(`Invalid status: ${patch.status}`);
  }
  await update(ref(db, `projects/${projectId}`), updates);
  const auditAction = patch.status ? 'change_status' : 'update_project';
  await logAudit(auditAction, { targetId: projectId });
}

export async function deleteProject(projectId) {
  await remove(ref(db, `projects/${projectId}`));
  await logAudit('delete_project', { targetId: projectId });
}

export async function addMessage(projectId, message) {
  const r = ref(db, `projects/${projectId}/messages`);
  const clean = {
    text:      String(message.text || '').slice(0, 10000),
    sender:    String(message.sender || '').slice(0, 100),
    timestamp: String(message.timestamp || '').slice(0, 50),
    addedAt:   serverTimestamp(),
  };
  if (message.isAttachment) clean.isAttachment = true;
  const p = await push(r, clean);
  return p.key;
}

export async function deleteMessage(projectId, messageId) {
  await remove(ref(db, `projects/${projectId}/messages/${messageId}`));
  await logAudit('delete_message', { targetId: `${projectId}/${messageId}` });
}

export async function addNote(projectId, { content, author }) {
  const r = ref(db, `projects/${projectId}/notes`);
  const p = await push(r, {
    content: String(content || '').slice(0, 10000),
    author:  String(author || '').slice(0, 100),
    createdAt: serverTimestamp(),
  });
  await logAudit('add_note', { targetId: `${projectId}/${p.key}` });
  return p.key;
}

export async function deleteNote(projectId, noteId) {
  await remove(ref(db, `projects/${projectId}/notes/${noteId}`));
  await logAudit('delete_note', { targetId: `${projectId}/${noteId}` });
}

export async function snapshotEverything() {
  const snap = await get(ref(db, '/'));
  return snap.val() || {};
}

function mergeProject(base, patch) {
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) continue;
    out[k] = patch[k];
  }
  return out;
}

export { VALID_STATUSES };
