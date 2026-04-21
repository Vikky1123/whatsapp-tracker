import { requireAuth, watchSessionTimeout, doSignOut } from './auth.js';
import { subscribeProjects, createProject } from './db.js';
import { setText } from './sanitize.js';
import { formatDate, relativeTime, debounce } from './utils.js';
import { exportBackup } from './export.js';
import { ref, onValue, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { db } from './firebase-init.js';

const STATUS_LABELS = {
  new: 'New', quoted: 'Quoted', awaiting_client: 'Awaiting',
  approved: 'Approved', in_progress: 'In progress', review: 'Review',
  revisions: 'Revisions', delivered: 'Delivered', paid: 'Paid',
};
const STATUS_ORDER = ['new','quoted','awaiting_client','approved','in_progress','review','revisions','delivered','paid'];
const ACTIVE_STATUSES = new Set(['in_progress','review','revisions','approved']);
const WAITING_STATUSES = new Set(['awaiting_client','quoted']);

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
    document.getElementById('newProjectForm').reset();
    document.getElementById('newProjectDialog').showModal();
  });

  document.getElementById('npCancel').addEventListener('click', () => {
    document.getElementById('newProjectDialog').close('cancel');
    document.getElementById('newProjectForm').reset();
  });

  document.getElementById('newProjectForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const dlg = document.getElementById('newProjectDialog');
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
      dlg.close('created');
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
      alert(`Backup downloaded (${projectCount} files).`);
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
  renderStats();
  renderChips();
  renderList();
}

function renderStats() {
  let active = 0, waiting = 0, paid = 0;
  for (const p of allProjects) {
    if (ACTIVE_STATUSES.has(p.status)) active++;
    else if (WAITING_STATUSES.has(p.status)) waiting++;
    else if (p.status === 'paid') paid++;
  }
  setText(document.getElementById('statActive'),  String(active).padStart(2, '0'));
  setText(document.getElementById('statWaiting'), String(waiting).padStart(2, '0'));
  setText(document.getElementById('statPaid'),    String(paid).padStart(2, '0'));
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
    setText(btn, `${c.label} · ${counts[c.key] || 0}`);
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

  items.forEach((p, i) => {
    listEl.appendChild(projectCard(p, i + 1));
  });
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

function projectCard(p, index) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.addEventListener('click', () => {
    window.location.href = `project.html?id=${encodeURIComponent(p.id)}`;
  });

  // № ordinal
  const num = document.createElement('div');
  num.className = 'project-num tabular';
  setText(num, String(index).padStart(2, '0'));
  card.appendChild(num);

  // Main: title + client line
  const main = document.createElement('div');
  main.className = 'project-main';
  const title = document.createElement('h3');
  title.className = 'project-title';
  setText(title, p.title || '(untitled)');
  main.appendChild(title);

  const client = document.createElement('div');
  client.className = 'project-client';
  const clientParts = [];
  if (p.clientName) clientParts.push(p.clientName);
  if (p.platform)   clientParts.push(p.platform);
  setText(client, clientParts.join('  ·  ') || 'Client unknown');
  main.appendChild(client);
  card.appendChild(main);

  // Status — Airtable pill style
  const status = document.createElement('div');
  status.className = `project-status status-${p.status || 'new'}`;
  const pill = document.createElement('span');
  pill.className = 'pill';
  setText(pill, STATUS_LABELS[p.status] || 'New');
  status.appendChild(pill);
  card.appendChild(status);

  // Price
  const price = document.createElement('div');
  price.className = 'project-price tabular';
  setText(price, p.price || '—');
  card.appendChild(price);

  // Assignee
  const assignee = document.createElement('div');
  assignee.className = 'project-assignee';
  setText(assignee, p.assignee || 'anon');
  card.appendChild(assignee);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'project-meta';
  setText(meta, p.updatedAt ? relativeTime(p.updatedAt) : '—');
  card.appendChild(meta);

  return card;
}

function openChangelog() {
  const dlg = document.getElementById('changelogDialog');
  const list = document.getElementById('changelogList');
  list.replaceChildren();
  const li = document.createElement('li');
  setText(li, 'Loading…');
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
      setText(li, `${formatDate(e.at)} · ${e.action} · ${e.author}${e.targetId ? ` (${e.targetId})` : ''}`);
      list.appendChild(li);
    }
  }, { onlyOnce: true });
}
