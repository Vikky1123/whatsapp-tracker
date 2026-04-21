import { requireAuth, watchSessionTimeout } from './auth.js';
import {
  subscribeProject, updateProject, deleteProject,
  addMessage, addNote, deleteNote,
} from './db.js';
import { setText, createLinkifiedFragment } from './sanitize.js';
import { formatDate, relativeTime } from './utils.js';
import { parseWhatsApp } from './parser.js';
import { logAudit } from './audit.js';

const params = new URLSearchParams(window.location.search);
const PROJECT_ID = params.get('id');
if (!PROJECT_ID) {
  alert('Missing project id in URL.');
  window.location.href = 'dashboard.html';
}

let currentProject = null;

requireAuth({ onReady: init });
watchSessionTimeout();

function init() {
  subscribeProject(PROJECT_ID, (p) => {
    if (!p) {
      alert('This project was deleted or does not exist.');
      window.location.href = 'dashboard.html';
      return;
    }
    currentProject = p;
    renderHeader(p);
    renderSummary(p);
    renderConversation(p);
    renderNotes(p);
    renderDetails(p);
    renderLinks(p);
  });
  bindTabs();
  bindStatusDropdown();
  bindPasteFlow();
  bindDelete();
  bindNotesForm();
  bindDetailsForm();
  bindLinksForm();

  window.addEventListener('online',  () => { document.getElementById('offlinePill').hidden = true; });
  window.addEventListener('offline', () => { document.getElementById('offlinePill').hidden = false; });
}

function renderHeader(p) {
  setText(document.getElementById('projectTitle'), p.title || '(untitled)');
  document.title = `${p.title || 'Project'} - Project Tracker`;
  document.getElementById('statusDropdown').value = p.status || 'new';
}

function renderSummary(p) {
  const el = document.getElementById('summaryRow');
  el.replaceChildren();
  const parts = [
    ['Client',    p.clientName],
    ['Platform',  p.platform],
    ['Price',     p.price],
    ['Deadline',  p.deadline],
    ['Assignee',  p.assignee],
  ].filter(([, v]) => Boolean(v));
  for (const [label, value] of parts) {
    const chip = document.createElement('span');
    chip.className = 'summary-chip';
    setText(chip, `${label}: ${value}`);
    el.appendChild(chip);
  }
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab');
  for (const t of tabs) {
    t.addEventListener('click', () => {
      for (const other of tabs) other.classList.remove('tab-active');
      t.classList.add('tab-active');
      for (const panel of document.querySelectorAll('.tab-panel')) panel.hidden = true;
      document.getElementById('tab-' + t.dataset.tab).hidden = false;
    });
  }
}

function bindStatusDropdown() {
  document.getElementById('statusDropdown').addEventListener('change', async (e) => {
    try {
      await updateProject(PROJECT_ID, { status: e.target.value });
    } catch (err) {
      alert('Could not change status: ' + (err && err.message ? err.message : err));
      e.target.value = currentProject.status;
    }
  });
}

function renderConversation(p) {
  const list = document.getElementById('messagesList');
  list.replaceChildren();
  const msgs = messagesAsSortedArray(p.messages || {});
  if (msgs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    setText(empty, 'No messages yet. Click "+ Paste WhatsApp messages" to import some.');
    list.appendChild(empty);
    return;
  }
  for (const m of msgs) {
    list.appendChild(renderMessageBubble(m));
  }
}

function messagesAsSortedArray(obj) {
  return Object.entries(obj).map(([id, m]) => ({ id, ...m })).sort((a, b) => {
    return String(a.timestamp).localeCompare(String(b.timestamp));
  });
}

function renderMessageBubble(m) {
  const wrap = document.createElement('article');
  wrap.className = 'msg-bubble' + (m.isAttachment ? ' msg-attachment' : '');

  const head = document.createElement('div');
  head.className = 'msg-head';
  const who = document.createElement('strong');
  setText(who, m.sender || '(unknown)');
  const when = document.createElement('span');
  when.className = 'msg-time';
  setText(when, formatDate(m.timestamp));
  head.appendChild(who);
  head.appendChild(when);
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'msg-body';
  body.appendChild(createLinkifiedFragment(m.text || ''));
  wrap.appendChild(body);

  return wrap;
}

function bindPasteFlow() {
  const dlg = document.getElementById('pasteDialog');
  const rawEl = document.getElementById('pasteRaw');
  const previewBtn = document.getElementById('previewBtn');
  const previewEl = document.getElementById('pastePreview');
  const importBtn = document.getElementById('pasteImport');
  const cancelBtn = document.getElementById('pasteCancel');

  let lastParsed = null;

  document.getElementById('pasteBtn').addEventListener('click', () => {
    rawEl.value = '';
    previewEl.hidden = true;
    previewEl.replaceChildren();
    importBtn.disabled = true;
    lastParsed = null;
    dlg.showModal();
  });

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    dlg.close('cancel');
  });

  previewBtn.addEventListener('click', () => {
    lastParsed = parseWhatsApp(rawEl.value);
    renderParsePreview(previewEl, lastParsed);
    previewEl.hidden = false;
    importBtn.disabled = lastParsed.messages.length === 0;
  });

  importBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!lastParsed) return;
    await importMessages(lastParsed.messages);
    dlg.close('imported');
  });
}

function renderParsePreview(el, parsed) {
  el.replaceChildren();
  const p = document.createElement('p');
  setText(p, `Parsed ${parsed.stats.messageCount} messages.`);
  el.appendChild(p);

  if (parsed.stats.senders.length > 0) {
    const pp = document.createElement('p');
    setText(pp, `Senders: ${parsed.stats.senders.join(', ')}`);
    el.appendChild(pp);
  }
  if (parsed.stats.dateRange) {
    const pp = document.createElement('p');
    setText(pp, `Dates: ${formatDate(parsed.stats.dateRange.from)} -> ${formatDate(parsed.stats.dateRange.to)}`);
    el.appendChild(pp);
  }
  if (parsed.stats.attachments > 0) {
    const pp = document.createElement('p');
    setText(pp, `Attachments: ${parsed.stats.attachments} (shown as placeholders)`);
    el.appendChild(pp);
  }
  if (parsed.stats.skippedSystem > 0) {
    const pp = document.createElement('p');
    setText(pp, `Skipped system messages: ${parsed.stats.skippedSystem}`);
    el.appendChild(pp);
  }
  if (parsed.unparseable.length > 0) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    setText(summary, `${parsed.unparseable.length} unparseable line(s) - click to view`);
    details.appendChild(summary);
    const pre = document.createElement('pre');
    setText(pre, parsed.unparseable.join('\n'));
    details.appendChild(pre);
    el.appendChild(details);
  }
}

async function importMessages(incoming) {
  const existing = messagesAsSortedArray(currentProject.messages || {});
  const existingKeys = new Set(existing.map(m => `${m.sender}|${m.timestamp}|${m.text}`));
  let imported = 0, skipped = 0;
  for (const m of incoming) {
    const key = `${m.sender}|${m.timestamp}|${m.text}`;
    if (existingKeys.has(key)) { skipped++; continue; }
    try {
      await addMessage(PROJECT_ID, m);
      imported++;
    } catch (_) {
      skipped++;
    }
  }
  await logAudit('import_messages', { targetId: PROJECT_ID });
  alert(`Imported ${imported} message(s). Skipped ${skipped} duplicate(s)/errors.`);
}

function renderNotes(p) {
  const list = document.getElementById('notesList');
  list.replaceChildren();
  const notes = Object.entries(p.notes || {})
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    setText(empty, 'No notes yet.');
    list.appendChild(empty);
    return;
  }
  for (const n of notes) {
    const card = document.createElement('article');
    card.className = 'note-card';

    const head = document.createElement('div');
    head.className = 'note-head';
    const who = document.createElement('strong');
    setText(who, n.author || '(unknown)');
    const when = document.createElement('span');
    setText(when, relativeTime(n.createdAt));
    head.appendChild(who);
    head.appendChild(when);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'note-body';
    body.appendChild(createLinkifiedFragment(n.content || ''));
    card.appendChild(body);

    const del = document.createElement('button');
    del.className = 'btn-tiny-danger';
    setText(del, 'Delete');
    del.addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return;
      await deleteNote(PROJECT_ID, n.id);
    });
    card.appendChild(del);

    list.appendChild(card);
  }
}

function bindNotesForm() {
  const form = document.getElementById('noteForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const author = document.getElementById('noteAuthor').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!content) return;
    await addNote(PROJECT_ID, { author, content });
    document.getElementById('noteContent').value = '';
  });
}

function renderDetails(p) {
  document.getElementById('dTitle').value         = p.title || '';
  document.getElementById('dClientName').value    = p.clientName || '';
  document.getElementById('dPlatform').value      = p.platform || '';
  document.getElementById('dPrice').value         = p.price || '';
  document.getElementById('dDeadline').value      = p.deadline || '';
  document.getElementById('dAssignee').value      = p.assignee || '';
  document.getElementById('dClientRequest').value = p.clientRequest || '';
  document.getElementById('dOurApproach').value   = p.ourApproach || '';
  document.getElementById('dDeliverables').value  = p.deliverables || '';
  document.getElementById('dOutcome').value       = p.outcome || '';
}

function bindDetailsForm() {
  document.getElementById('detailsForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const patch = {
      title:         document.getElementById('dTitle').value.trim(),
      clientName:    document.getElementById('dClientName').value.trim(),
      platform:      document.getElementById('dPlatform').value.trim(),
      price:         document.getElementById('dPrice').value.trim(),
      deadline:      document.getElementById('dDeadline').value,
      assignee:      document.getElementById('dAssignee').value.trim(),
      clientRequest: document.getElementById('dClientRequest').value.trim(),
      ourApproach:   document.getElementById('dOurApproach').value.trim(),
      deliverables:  document.getElementById('dDeliverables').value.trim(),
      outcome:       document.getElementById('dOutcome').value.trim(),
    };
    try {
      await updateProject(PROJECT_ID, patch);
      alert('Saved.');
    } catch (err) {
      alert('Save failed: ' + (err && err.message ? err.message : err));
    }
  });
}

function renderLinks(p) {
  const ul = document.getElementById('linksList');
  ul.replaceChildren();
  const links = Array.isArray(p.links) ? p.links : [];
  if (links.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    setText(li, 'No links yet.');
    ul.appendChild(li);
    return;
  }
  links.forEach((link, idx) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.setAttribute('href', link.url);
    a.setAttribute('rel', 'noopener noreferrer');
    a.setAttribute('target', '_blank');
    setText(a, link.label || link.url);
    li.appendChild(a);

    const rm = document.createElement('button');
    rm.className = 'btn-tiny-danger';
    setText(rm, 'Remove');
    rm.addEventListener('click', async () => {
      const next = links.filter((_, i) => i !== idx);
      await updateProject(PROJECT_ID, { links: next });
      await logAudit('remove_link', { targetId: PROJECT_ID });
    });
    li.appendChild(rm);
    ul.appendChild(li);
  });
}

function bindLinksForm() {
  document.getElementById('linkForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const label = document.getElementById('linkLabel').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { alert('URL must start with http:// or https://'); return; }
    const currentLinks = Array.isArray(currentProject.links) ? currentProject.links : [];
    const next = currentLinks.concat({ label: label || url, url });
    await updateProject(PROJECT_ID, { links: next });
    await logAudit('add_link', { targetId: PROJECT_ID });
    document.getElementById('linkForm').reset();
  });
}

function bindDelete() {
  const dlg = document.getElementById('deleteDialog');
  const echo = document.getElementById('delTitleEcho');
  const input = document.getElementById('delConfirmInput');
  const confirmBtn = document.getElementById('delConfirmBtn');
  const cancelBtn = document.getElementById('delCancelBtn');

  document.getElementById('deleteBtn').addEventListener('click', () => {
    setText(echo, currentProject.title || '(untitled)');
    input.value = '';
    confirmBtn.disabled = true;
    dlg.showModal();
  });

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value.trim() !== (currentProject.title || '(untitled)').trim();
  });

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    dlg.close('cancel');
  });

  confirmBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await deleteProject(PROJECT_ID);
      dlg.close();
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Delete failed: ' + (err && err.message ? err.message : err));
    }
  });
}
