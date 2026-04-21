import { requireAuth, watchSessionTimeout, doSignOut } from './auth.js';
import { subscribeProjects, createProject } from './db.js';
import { setText } from './sanitize.js';
import { formatDate, relativeTime, debounce } from './utils.js';
import { exportBackup } from './export.js';
import { ref, onValue, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { db } from './firebase-init.js';

const STATUS_LABELS = {
  new: 'New', quoted: 'Quoted', awaiting_client: 'Awaiting',
  approved: 'Approved', in_progress: 'In Progress', review: 'Review',
  revisions: 'Revisions', delivered: 'Delivered', paid: 'Paid',
};
const STATUS_ORDER = ['new','quoted','awaiting_client','approved','in_progress','review','revisions','delivered','paid'];

let allProjects = [];
let activeStatus = 'all';
let showArchived = false;
let searchText = '';
let sortMode = 'recent';

requireAuth({ onReady: init });
watchSessionTimeout();

function init() {
  subscribeProjects((list) => {
    allProjects = list;
    render();
  });
  bindUI();
}

function bindUI() {
  document.getElementById('search').addEventListener('input', debounce((e) => {
    searchText = e.target.value.toLowerCase();
    render();
  }, 150));

  document.getElementById('showArchived').addEventListener('change', (e) => {
    showArchived = e.target.checked;
    render();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
  });

  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('newProjectDialog').showModal();
  });

  document.getElementById('newProjectForm').addEventListener('submit', async (ev) => {
    const dlg = document.getElementById('newProjectDialog');
    if (dlg.returnValue === 'cancel') { dlg.returnValue = ''; return; }
    ev.preventDefault();
    const fields = {
      title:      document.getElementById('npTitle').value.trim(),
      clientName: document.getElementById('npClient').value.trim(),
      platform:   document.getElementById('npPlatform').value,
      price:      document.getElementById('npPrice').value.trim(),
      assignee:   document.getElementById('npAssignee').value.trim(),
      status:     'new',
    };
    if (!fields.title) return;
    try {
      const id = await createProject(fields);
      document.getElementById('newProjectForm').reset();
      dlg.close();
      window.location.href = `project.html?id=${encodeURIComponent(id)}`;
    } catch (err) {
      alert('Could not create: ' + (err && err.message ? err.message : err));
    }
  });

  const menu = document.getElementById('settingsMenu');
  document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target.id !== 'settingsBtn') menu.hidden = true;
  });

  document.getElementById('exportBtn').addEventListener('click', async () => {
    menu.hidden = true;
    try {
      const { projectCount } = await exportBackup();
      alert(`Backup downloaded (${projectCount} projects).`);
    } catch (err) {
      alert('Backup failed: ' + (err && err.message ? err.message : err));
    }
  });

  document.getElementById('signOutBtn').addEventListener('click', () => doSignOut());

  document.getElementById('changelogBtn').addEventListener('click', () => {
    menu.hidden = true;
    openChangelog();
  });

  document.getElementById('changelogClose').addEventListener('click', () => {
    document.getElementById('changelogDialog').close();
  });

  window.addEventListener('online',  () => { document.getElementById('offlinePill').hidden = true; });
  window.addEventListener('offline', () => { document.getElementById('offlinePill').hidden = false; });
}

function render() {
  renderChips();
  renderList();
}

function renderChips() {
  const container = document.getElementById('filterChips');
  container.replaceChildren();
  const counts = { all: allProjects.length };
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const p of allProjects) counts[p.status] = (counts[p.status] || 0) + 1;

  const chips = [{ key: 'all', label: 'All' }, ...STATUS_ORDER.map(k => ({ key: k, label: STATUS_LABELS[k] }))];
  for (const c of chips) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (activeStatus === c.key ? ' chip-active' : '');
    setText(btn, `${c.label} (${counts[c.key] || 0})`);
    btn.addEventListener('click', () => {
      activeStatus = c.key;
      render();
    });
    container.appendChild(btn);
  }
}

function renderList() {
  const listEl = document.getElementById('projectList');
  const emptyEl = document.getElementById('emptyState');
  listEl.replaceChildren();

  let items = allProjects.slice();
  if (!showArchived) items = items.filter(p => p.status !== 'paid');
  if (activeStatus !== 'all') items = items.filter(p => p.status === activeStatus);
  if (searchText) items = items.filter(p => matchesSearch(p, searchText));
  items = sortProjects(items, sortMode);

  if (items.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const p of items) {
    listEl.appendChild(projectCard(p));
  }
}

function matchesSearch(p, q) {
  const hay = [
    p.title, p.clientName, p.clientRequest, p.ourApproach, p.deliverables, p.outcome, p.platform, p.assignee, p.price,
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

function sortProjects(items, mode) {
  const copy = items.slice();
  switch (mode) {
    case 'newest':   return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'oldest':   return copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    case 'status':   return copy.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    case 'deadline': return copy.sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));
    case 'recent':
    default:         return copy.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
}

function projectCard(p) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.addEventListener('click', () => {
    window.location.href = `project.html?id=${encodeURIComponent(p.id)}`;
  });

  const titleRow = document.createElement('div');
  titleRow.className = 'project-card-title-row';

  const h = document.createElement('h3');
  setText(h, p.title || '(untitled)');
  titleRow.appendChild(h);

  const badge = document.createElement('span');
  badge.className = `status-badge status-${p.status || 'new'}`;
  setText(badge, STATUS_LABELS[p.status] || 'New');
  titleRow.appendChild(badge);
  card.appendChild(titleRow);

  const sub = document.createElement('div');
  sub.className = 'project-card-sub';
  const parts = [];
  if (p.clientName) parts.push(`Client: ${p.clientName}`);
  if (p.price)      parts.push(p.price);
  if (p.assignee)   parts.push(p.assignee);
  setText(sub, parts.join('  -  '));
  card.appendChild(sub);

  const meta = document.createElement('div');
  meta.className = 'project-card-meta';
  const updated = p.updatedAt ? relativeTime(p.updatedAt) : '';
  const msgs = p.messages ? Object.keys(p.messages).length : 0;
  const notes = p.notes ? Object.keys(p.notes).length : 0;
  setText(meta, `${updated}  -  ${msgs} messages  -  ${notes} notes`);
  card.appendChild(meta);

  return card;
}

function openChangelog() {
  const dlg = document.getElementById('changelogDialog');
  const list = document.getElementById('changelogList');
  list.replaceChildren();
  const li = document.createElement('li');
  setText(li, 'Loading...');
  list.appendChild(li);
  dlg.showModal();

  const q = query(ref(db, 'audit'), limitToLast(20));
  onValue(q, (snap) => {
    list.replaceChildren();
    const val = snap.val() || {};
    const entries = Object.values(val).sort((a, b) => (b.at || 0) - (a.at || 0));
    if (entries.length === 0) {
      const li2 = document.createElement('li');
      setText(li2, 'No activity yet.');
      list.appendChild(li2);
      return;
    }
    for (const e of entries) {
      const li = document.createElement('li');
      setText(li, `${formatDate(e.at)} - ${e.action} by ${e.author}${e.targetId ? ` (${e.targetId})` : ''}`);
      list.appendChild(li);
    }
  }, { onlyOnce: true });
}
