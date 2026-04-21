# WhatsApp Project Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static-site project tracker for a 3-person WhatsApp group, backed by Firebase Realtime Database, with real-time sync, copy-paste WhatsApp message parsing, and hardened security.

**Architecture:** Plain HTML/CSS/JavaScript served from Netlify's free tier. Firebase Realtime Database as the single backend (auth + data + real-time sync). Stuxen design toolkit for styling. No bundler, no build step. Security enforced via Firebase rules + App Check + CSP headers + ESLint-banned unsafe patterns.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules via CDN), Firebase JS SDK v10, Stuxen design toolkit, Netlify hosting, Node.js `--test` runner for unit tests, ESLint for static checks.

**Source spec:** `docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md`

---

## File Structure

```
whatsapp_structure/
├── stuxen-design-toolkit/              # existing, untouched
│
├── public/                             # deployed to Netlify
│   ├── index.html                      # login page
│   ├── dashboard.html                  # main tracker
│   ├── project.html                    # project detail
│   ├── css/
│   │   └── app.css                     # custom styles on top of Stuxen
│   ├── js/
│   │   ├── firebase-init.js            # Firebase config + SDK init
│   │   ├── auth.js                     # login / logout / session guard
│   │   ├── db.js                       # RTDB read/write wrapper
│   │   ├── audit.js                    # audit log writer
│   │   ├── sanitize.js                 # XSS-safe text + URL rendering
│   │   ├── parser.js                   # WhatsApp paste parser
│   │   ├── dashboard.js                # dashboard controller
│   │   ├── project.js                  # project detail controller
│   │   ├── export.js                   # backup download
│   │   └── utils.js                    # formatDate, debounce, helpers
│   └── favicon.ico
│
├── tests/                              # node --test
│   ├── parser.test.js
│   ├── sanitize.test.js
│   └── utils.test.js
│
├── docs/
│   ├── SECURITY.md
│   ├── SETUP.md
│   ├── superpowers/specs/
│   │   └── 2026-04-20-whatsapp-project-tracker-design.md
│   └── superpowers/plans/
│       └── 2026-04-20-whatsapp-project-tracker.md   # this file
│
├── firebase.rules.json                 # security rules
├── netlify.toml                        # Netlify config
├── _headers                            # CSP + security headers (deployed by Netlify)
├── .eslintrc.json                      # lint config with banned patterns
├── .gitignore
├── package.json                        # test runner + eslint only
└── README.md
```

**Responsibility map:**

| File | Responsibility |
|---|---|
| `firebase-init.js` | Hold Firebase config object; initialize SDK; expose `app`, `auth`, `db` |
| `auth.js` | Sign-in form binding, sign-out, session guard (redirect if not signed in), 8-hour session timer |
| `db.js` | Typed read/write wrappers for `/projects`, `/projects/{id}/messages`, `/projects/{id}/notes`; subscribe to live changes |
| `audit.js` | Write to `/audit` subtree for every user action |
| `sanitize.js` | `setText(el, text)`, `createLinkifiedFragment(text)` — only safe way to render user content |
| `parser.js` | Pure function `parseWhatsApp(rawText) → { messages, unparseable, stats }` |
| `utils.js` | `formatDate`, `relativeTime`, `debounce`, `generateId` (fallback, prefer Firebase `push()`) |
| `dashboard.js` | Render project list, filter chips, archive toggle, search, sort, new-project modal |
| `project.js` | Render project detail, tabs switcher, status dropdown, paste modal, notes, details form, links, delete |
| `export.js` | Snapshot database and trigger JSON download |

---

## Conventions for this plan

- **TDD where feasible.** Pure JS modules (`parser.js`, `sanitize.js`, `utils.js`) use strict red-green-commit cycles. UI pages use manual smoke steps because DOM tests add disproportionate setup.
- **Commits after every task.** If not in a git repo yet, Task 1 initializes one.
- **Every HTML step includes a "verify in browser" instruction.** Use `npx serve public` from the repo root for local testing.
- **Every Firebase / Netlify console step names every click.** The engineer is assumed to have never used these services before.
- **No inline HTML injection, no eval, no Function constructor.** ESLint (Task 3) enforces this.

---

## Task 1: Initialize git repo + base scaffolding

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `README.md`
- Create: `public/` `public/css/` `public/js/` `tests/` directories (empty)

- [ ] **Step 1: Confirm working directory**

Run: `pwd`
Expected: path ending in `/whatsapp_structure`

- [ ] **Step 2: Initialize git**

Run: `git init -b main`
Expected: `Initialized empty Git repository in .../whatsapp_structure/.git/`

- [ ] **Step 3: Create `.gitignore`**

Content:
```
node_modules/
.env
.env.local
.DS_Store
*.log
.netlify/
dist/
build/
coverage/
# IDE
.vscode/
.idea/
# local backups
*backup*.json
```

- [ ] **Step 4: Create `package.json`**

Content:
```json
{
  "name": "whatsapp-project-tracker",
  "version": "0.1.0",
  "private": true,
  "description": "A static tracker website for a 3-person WhatsApp developer group to coordinate and archive Fiverr projects.",
  "scripts": {
    "test": "node --test tests/",
    "lint": "eslint public/js/ tests/",
    "serve": "npx serve public"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "serve": "^14.0.0"
  }
}
```

- [ ] **Step 5: Create `README.md`**

Content:
```markdown
# WhatsApp Project Tracker

Static-site tracker for a 3-person WhatsApp developer group coordinating Fiverr projects. Backed by Firebase Realtime Database.

## Quick commands

- `npm run serve` — serve `public/` locally on http://localhost:3000
- `npm test` — run unit tests
- `npm run lint` — run ESLint

## Docs

- **Design spec:** `docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md`
- **Setup guide:** `docs/SETUP.md` (how to create Firebase + Netlify, wire everything up)
- **Security runbook:** `docs/SECURITY.md` (rotation, incident response, rule testing)
```

- [ ] **Step 6: Create empty directories**

Run:
```
mkdir -p public/css public/js tests
```

- [ ] **Step 7: Install dev dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created.

- [ ] **Step 8: Commit**

Run:
```
git add .gitignore package.json package-lock.json README.md
git commit -m "chore: scaffold repo with gitignore, package.json, readme"
```

Expected: "1 file changed" or similar (node_modules ignored).

---

## Task 2: Confirm spec + plan are in the repo

**Files:**
- Existing spec is at `docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md` — verify in place.
- This plan is at `docs/superpowers/plans/2026-04-20-whatsapp-project-tracker.md` — verify in place.

- [ ] **Step 1: Verify spec + plan files exist**

Run:
```
ls docs/superpowers/specs/
ls docs/superpowers/plans/
```

Expected: both directories contain the dated files.

- [ ] **Step 2: Commit**

Run:
```
git add docs/
git commit -m "docs: add design spec and implementation plan"
```

---

## Task 3: ESLint config banning unsafe DOM patterns

**Files:**
- Create: `.eslintrc.json`

- [ ] **Step 1: Create `.eslintrc.json`**

Content:
```json
{
  "root": true,
  "env": {
    "browser": true,
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-restricted-properties": ["error",
      { "object": "document", "property": "write", "message": "Direct HTML emit via document.write is banned." },
      { "object": "document", "property": "writeln", "message": "document.writeln is banned." }
    ],
    "no-restricted-syntax": ["error",
      {
        "selector": "AssignmentExpression[left.property.name='innerHTML']",
        "message": "Assigning HTML via innerHTML is banned. Use sanitize.setText() or createElement."
      },
      {
        "selector": "AssignmentExpression[left.property.name='outerHTML']",
        "message": "Assigning HTML via outerHTML is banned."
      },
      {
        "selector": "CallExpression[callee.property.name='insertAdjacentHTML']",
        "message": "insertAdjacentHTML is banned."
      }
    ]
  },
  "ignorePatterns": ["node_modules/", "stuxen-design-toolkit/"]
}
```

- [ ] **Step 2: Verify ESLint runs without error on empty tree**

Run: `npm run lint`
Expected: no files linted yet (exit 0) or a message about no files matched.

- [ ] **Step 3: Commit**

Run:
```
git add .eslintrc.json
git commit -m "chore: add eslint config banning HTML-injection sinks and eval"
```

---

## Task 4: Sanitize module — setText (TDD)

**Files:**
- Create: `tests/sanitize.test.js`
- Create: `public/js/sanitize.js`

- [ ] **Step 1: Write failing test for `setText`**

Create `tests/sanitize.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setText } from '../public/js/sanitize.js';

const dom = new JSDOM('<!DOCTYPE html><body><div id="t"></div></body>');
const document = dom.window.document;
globalThis.document = document;

test('setText writes plain text via textContent', () => {
  const el = document.createElement('div');
  setText(el, 'hello world');
  assert.equal(el.textContent, 'hello world');
});

test('setText does NOT render HTML — tags appear as literal text', () => {
  const el = document.createElement('div');
  setText(el, '<script>alert(1)</script>');
  assert.equal(el.textContent, '<script>alert(1)</script>');
  assert.equal(el.children.length, 0);
});

test('setText handles empty string', () => {
  const el = document.createElement('div');
  el.textContent = 'previous';
  setText(el, '');
  assert.equal(el.textContent, '');
});

test('setText coerces null/undefined to empty string', () => {
  const el = document.createElement('div');
  setText(el, null);
  assert.equal(el.textContent, '');
  setText(el, undefined);
  assert.equal(el.textContent, '');
});
```

- [ ] **Step 2: Install jsdom as dev dep**

Run: `npm install --save-dev jsdom`

- [ ] **Step 3: Run test — should fail**

Run: `npm test`
Expected: FAIL with "Cannot find module '../public/js/sanitize.js'".

- [ ] **Step 4: Create `public/js/sanitize.js` with minimal `setText`**

Content:
```javascript
export function setText(el, text) {
  el.textContent = text == null ? '' : String(text);
}
```

- [ ] **Step 5: Run tests — should pass**

Run: `npm test`
Expected: all 4 `setText` tests pass.

- [ ] **Step 6: Commit**

Run:
```
git add public/js/sanitize.js tests/sanitize.test.js package.json package-lock.json
git commit -m "feat(sanitize): add setText that refuses to render HTML"
```

---

## Task 5: Sanitize module — createLinkifiedFragment (TDD)

**Files:**
- Modify: `tests/sanitize.test.js`
- Modify: `public/js/sanitize.js`

- [ ] **Step 1: Add failing tests for `createLinkifiedFragment`**

Append to `tests/sanitize.test.js`:
```javascript
import { createLinkifiedFragment } from '../public/js/sanitize.js';

test('createLinkifiedFragment plain text becomes one text node', () => {
  const frag = createLinkifiedFragment('just a message');
  assert.equal(frag.childNodes.length, 1);
  assert.equal(frag.childNodes[0].nodeType, 3); // TEXT_NODE
  assert.equal(frag.textContent, 'just a message');
});

test('createLinkifiedFragment wraps https URLs in anchor with rel/target', () => {
  const frag = createLinkifiedFragment('see https://example.com for info');
  const anchors = frag.querySelectorAll('a');
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].getAttribute('href'), 'https://example.com');
  assert.equal(anchors[0].getAttribute('rel'), 'noopener noreferrer');
  assert.equal(anchors[0].getAttribute('target'), '_blank');
  assert.equal(anchors[0].textContent, 'https://example.com');
});

test('createLinkifiedFragment rejects javascript: URLs', () => {
  const frag = createLinkifiedFragment('click javascript:alert(1) here');
  const anchors = frag.querySelectorAll('a');
  assert.equal(anchors.length, 0);
  assert.equal(frag.textContent, 'click javascript:alert(1) here');
});

test('createLinkifiedFragment handles multiple URLs', () => {
  const frag = createLinkifiedFragment('see https://a.com and http://b.com/x');
  const anchors = frag.querySelectorAll('a');
  assert.equal(anchors.length, 2);
  assert.equal(anchors[0].getAttribute('href'), 'https://a.com');
  assert.equal(anchors[1].getAttribute('href'), 'http://b.com/x');
});

test('createLinkifiedFragment script tags in text are harmless (rendered as text)', () => {
  const frag = createLinkifiedFragment('<script>alert(1)</script>');
  assert.equal(frag.querySelectorAll('script').length, 0);
  assert.equal(frag.textContent, '<script>alert(1)</script>');
});
```

- [ ] **Step 2: Run tests — should fail**

Run: `npm test`
Expected: FAIL with "createLinkifiedFragment is not exported from ../public/js/sanitize.js".

- [ ] **Step 3: Implement `createLinkifiedFragment`**

Append to `public/js/sanitize.js`:
```javascript
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const SAFE_SCHEME_RE = /^https?:\/\//i;

export function createLinkifiedFragment(text) {
  const frag = document.createDocumentFragment();
  if (text == null) return frag;
  const source = String(text);
  let lastIndex = 0;
  for (const match of source.matchAll(URL_RE)) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      frag.appendChild(document.createTextNode(source.slice(lastIndex, start)));
    }
    if (SAFE_SCHEME_RE.test(url)) {
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('target', '_blank');
      a.textContent = url;
      frag.appendChild(a);
    } else {
      frag.appendChild(document.createTextNode(url));
    }
    lastIndex = start + url.length;
  }
  if (lastIndex < source.length) {
    frag.appendChild(document.createTextNode(source.slice(lastIndex)));
  }
  return frag;
}
```

- [ ] **Step 4: Run tests — should pass**

Run: `npm test`
Expected: all sanitize tests pass.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

Run:
```
git add public/js/sanitize.js tests/sanitize.test.js
git commit -m "feat(sanitize): linkify URLs with rel=noopener, reject js: scheme"
```

---

## Task 6: Utils module — formatDate, relativeTime, debounce (TDD)

**Files:**
- Create: `tests/utils.test.js`
- Create: `public/js/utils.js`

- [ ] **Step 1: Write failing tests**

Create `tests/utils.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, relativeTime, debounce } from '../public/js/utils.js';

test('formatDate renders ISO timestamp as readable date', () => {
  const s = formatDate('2026-04-20T14:14:00Z', 'en-US', 'UTC');
  assert.match(s, /Apr 20, 2026/);
  assert.match(s, /2:14/);
});

test('formatDate returns empty string for null', () => {
  assert.equal(formatDate(null), '');
  assert.equal(formatDate(undefined), '');
  assert.equal(formatDate(''), '');
});

test('relativeTime returns "just now" for < 60s ago', () => {
  const now = Date.now();
  assert.equal(relativeTime(now - 1000, now), 'just now');
  assert.equal(relativeTime(now - 30_000, now), 'just now');
});

test('relativeTime returns "Nm ago" for minutes', () => {
  const now = Date.now();
  assert.equal(relativeTime(now - 5 * 60_000, now), '5m ago');
  assert.equal(relativeTime(now - 59 * 60_000, now), '59m ago');
});

test('relativeTime returns "Nh ago" for hours', () => {
  const now = Date.now();
  assert.equal(relativeTime(now - 3 * 3600_000, now), '3h ago');
});

test('relativeTime returns "Nd ago" for days', () => {
  const now = Date.now();
  assert.equal(relativeTime(now - 2 * 86_400_000, now), '2d ago');
});

test('debounce waits before calling', (t, done) => {
  let count = 0;
  const fn = debounce(() => { count++; }, 50);
  fn(); fn(); fn();
  assert.equal(count, 0);
  setTimeout(() => {
    assert.equal(count, 1);
    done();
  }, 100);
});
```

- [ ] **Step 2: Run tests — should fail**

Run: `npm test`
Expected: FAIL with "Cannot find module '../public/js/utils.js'".

- [ ] **Step 3: Implement utils**

Create `public/js/utils.js`:
```javascript
export function formatDate(isoOrMs, locale = undefined, timeZone = undefined) {
  if (!isoOrMs) return '';
  const d = new Date(isoOrMs);
  if (isNaN(d.getTime())) return '';
  const opts = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone,
  };
  return d.toLocaleString(locale, opts);
}

export function relativeTime(thenMs, nowMs = Date.now()) {
  if (!thenMs) return '';
  const diff = Math.max(0, nowMs - Number(thenMs));
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function debounce(fn, delayMs) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delayMs);
  };
}
```

- [ ] **Step 4: Run tests — should pass**

Run: `npm test`
Expected: all utils tests pass.

- [ ] **Step 5: Commit**

Run:
```
git add public/js/utils.js tests/utils.test.js
git commit -m "feat(utils): add formatDate, relativeTime, debounce with tests"
```

---

## Task 7: Parser — iPhone single-line format (TDD)

**Files:**
- Create: `tests/parser.test.js`
- Create: `public/js/parser.js`

- [ ] **Step 1: Write failing test for iPhone format**

Create `tests/parser.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWhatsApp } from '../public/js/parser.js';

test('iPhone format: single message parses into one entry', () => {
  const raw = '[4/20/26, 2:14 PM] Tomi: Client wants dark mode';
  const { messages, unparseable } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Tomi');
  assert.equal(messages[0].text, 'Client wants dark mode');
  assert.match(messages[0].timestamp, /2026-04-20T14:14/);
  assert.equal(unparseable.length, 0);
});

test('iPhone format: two messages parse cleanly', () => {
  const raw = [
    '[4/20/26, 2:14 PM] Tomi: First message',
    '[4/20/26, 2:17 PM] Bayo: Second message',
  ].join('\n');
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].sender, 'Tomi');
  assert.equal(messages[1].sender, 'Bayo');
});

test('iPhone format: AM/PM conversion is correct (2:14 PM = 14:14)', () => {
  const raw = '[4/20/26, 2:14 PM] X: y';
  const { messages } = parseWhatsApp(raw);
  assert.match(messages[0].timestamp, /T14:14/);
});

test('iPhone format: 12:00 AM midnight = 00:00', () => {
  const raw = '[4/20/26, 12:00 AM] X: y';
  const { messages } = parseWhatsApp(raw);
  assert.match(messages[0].timestamp, /T00:00/);
});

test('iPhone format: 12:00 PM noon = 12:00', () => {
  const raw = '[4/20/26, 12:00 PM] X: y';
  const { messages } = parseWhatsApp(raw);
  assert.match(messages[0].timestamp, /T12:00/);
});
```

- [ ] **Step 2: Run test — fails**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: Implement minimal parser for iPhone format**

Create `public/js/parser.js`:
```javascript
const IPHONE_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})\s*([AP]M)\]\s*([^:]+?):\s*(.*)$/;

function pad(n) { return String(n).padStart(2, '0'); }

function toIsoIphone(m, d, y, hh, mm, ampm) {
  let year = Number(y);
  if (year < 100) year += 2000;
  let hour = Number(hh);
  if (ampm === 'AM' && hour === 12) hour = 0;
  else if (ampm === 'PM' && hour !== 12) hour += 12;
  return `${year}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(mm)}:00`;
}

export function parseWhatsApp(rawText) {
  const messages = [];
  const unparseable = [];
  if (!rawText) return { messages, unparseable, stats: emptyStats() };
  const lines = String(rawText).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(IPHONE_RE);
    if (m) {
      const [, mo, d, y, hh, mm, ampm, sender, text] = m;
      messages.push({
        sender: sender.trim().replace(/~$/, ''),
        timestamp: toIsoIphone(Number(mo), Number(d), y, hh, mm, ampm),
        text: text,
      });
    } else {
      unparseable.push(line);
    }
  }
  return { messages, unparseable, stats: buildStats(messages, unparseable) };
}

function emptyStats() {
  return { messageCount: 0, senders: [], dateRange: null, attachments: 0, skippedSystem: 0, unparseableCount: 0 };
}

function buildStats(messages, unparseable) {
  const senders = Array.from(new Set(messages.map(m => m.sender)));
  let dateRange = null;
  if (messages.length > 0) {
    const times = messages.map(m => m.timestamp).sort();
    dateRange = { from: times[0], to: times[times.length - 1] };
  }
  return { messageCount: messages.length, senders, dateRange, attachments: 0, skippedSystem: 0, unparseableCount: unparseable.length };
}
```

- [ ] **Step 4: Run tests — iPhone tests pass**

Run: `npm test`
Expected: iPhone format tests pass.

- [ ] **Step 5: Commit**

Run:
```
git add public/js/parser.js tests/parser.test.js
git commit -m "feat(parser): iPhone-format WhatsApp parsing with AM/PM normalization"
```

---

## Task 8: Parser — Android format support (TDD)

**Files:**
- Modify: `tests/parser.test.js`
- Modify: `public/js/parser.js`

- [ ] **Step 1: Add failing tests for Android format**

Append to `tests/parser.test.js`:
```javascript
test('Android format: single message parses', () => {
  const raw = '20/04/2026, 14:14 - Tomi: Hello';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Tomi');
  assert.equal(messages[0].text, 'Hello');
  assert.match(messages[0].timestamp, /2026-04-20T14:14/);
});

test('Android format: D/M/Y order (20/04 = April 20, not Apr 4th)', () => {
  const raw = '20/04/2026, 09:00 - X: y';
  const { messages } = parseWhatsApp(raw);
  assert.match(messages[0].timestamp, /2026-04-20T09:00/);
});

test('Mixed formats in same paste: both parse', () => {
  const raw = [
    '[4/20/26, 2:14 PM] A: iphone',
    '20/04/2026, 14:17 - B: android',
  ].join('\n');
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].sender, 'A');
  assert.equal(messages[1].sender, 'B');
});
```

- [ ] **Step 2: Run tests — Android tests fail**

Run: `npm test`

- [ ] **Step 3: Add Android regex + format detection**

In `public/js/parser.js`, add above `parseWhatsApp`:
```javascript
const ANDROID_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})\s*-\s*([^:]+?):\s*(.*)$/;

function toIsoAndroid(d, m, y, hh, mm) {
  let year = Number(y);
  if (year < 100) year += 2000;
  return `${year}-${pad(Number(m))}-${pad(Number(d))}T${pad(Number(hh))}:${pad(Number(mm))}:00`;
}
```

Replace the line-matching block inside `parseWhatsApp` with:
```javascript
  for (const line of lines) {
    if (!line.trim()) continue;
    const iph = line.match(IPHONE_RE);
    if (iph) {
      const [, mo, d, y, hh, mm, ampm, sender, text] = iph;
      messages.push({
        sender: sender.trim().replace(/~$/, ''),
        timestamp: toIsoIphone(Number(mo), Number(d), y, hh, mm, ampm),
        text: text,
      });
      continue;
    }
    const and = line.match(ANDROID_RE);
    if (and) {
      const [, d, mo, y, hh, mm, sender, text] = and;
      messages.push({
        sender: sender.trim().replace(/~$/, ''),
        timestamp: toIsoAndroid(d, mo, y, hh, mm),
        text: text,
      });
      continue;
    }
    unparseable.push(line);
  }
```

- [ ] **Step 4: Run tests — pass**

Run: `npm test`

- [ ] **Step 5: Commit**

Run:
```
git add public/js/parser.js tests/parser.test.js
git commit -m "feat(parser): add Android WhatsApp format support (D/M/Y HH:mm)"
```

---

## Task 9: Parser — multi-line continuation (TDD)

**Files:**
- Modify: `tests/parser.test.js`
- Modify: `public/js/parser.js`

- [ ] **Step 1: Add failing test**

Append to `tests/parser.test.js`:
```javascript
test('Multi-line message: continuation lines append with newline', () => {
  const raw = [
    '[4/20/26, 2:14 PM] Tomi: line one',
    'line two',
    'line three',
    '[4/20/26, 2:15 PM] Bayo: another message',
  ].join('\n');
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, 'line one\nline two\nline three');
  assert.equal(messages[1].text, 'another message');
});

test('Continuation with no prior message goes to unparseable', () => {
  const raw = 'orphan line with no header\nanother orphan';
  const { messages, unparseable } = parseWhatsApp(raw);
  assert.equal(messages.length, 0);
  assert.equal(unparseable.length, 2);
});
```

- [ ] **Step 2: Run tests — fail**

Run: `npm test`

- [ ] **Step 3: Implement continuation logic**

In `public/js/parser.js`, replace the per-line loop body with:
```javascript
  for (const line of lines) {
    if (!line.trim()) continue;
    const iph = line.match(IPHONE_RE);
    if (iph) {
      const [, mo, d, y, hh, mm, ampm, sender, text] = iph;
      messages.push({
        sender: sender.trim().replace(/~$/, ''),
        timestamp: toIsoIphone(Number(mo), Number(d), y, hh, mm, ampm),
        text: text,
      });
      continue;
    }
    const and = line.match(ANDROID_RE);
    if (and) {
      const [, d, mo, y, hh, mm, sender, text] = and;
      messages.push({
        sender: sender.trim().replace(/~$/, ''),
        timestamp: toIsoAndroid(d, mo, y, hh, mm),
        text: text,
      });
      continue;
    }
    // continuation
    if (messages.length > 0) {
      messages[messages.length - 1].text += '\n' + line;
    } else {
      unparseable.push(line);
    }
  }
```

- [ ] **Step 4: Run tests — pass**

Run: `npm test`

- [ ] **Step 5: Commit**

Run:
```
git add public/js/parser.js tests/parser.test.js
git commit -m "feat(parser): support multi-line message continuation"
```

---

## Task 10: Parser — system messages + media placeholders (TDD)

**Files:**
- Modify: `tests/parser.test.js`
- Modify: `public/js/parser.js`

- [ ] **Step 1: Add failing tests**

Append:
```javascript
test('System message "Messages and calls are end-to-end encrypted" is filtered', () => {
  const raw = [
    'Messages and calls are end-to-end encrypted.',
    '[4/20/26, 2:14 PM] A: hello',
  ].join('\n');
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(stats.skippedSystem, 1);
});

test('Media placeholder <Media omitted> converts to 📎', () => {
  const raw = '[4/20/26, 2:14 PM] A: <Media omitted>';
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /📎/);
  assert.equal(stats.attachments, 1);
});

test('Media invisible marker ‎image omitted converts to 📎', () => {
  const raw = '[4/20/26, 2:14 PM] A: \u200eimage omitted';
  const { messages, stats } = parseWhatsApp(raw);
  assert.match(messages[0].text, /📎/);
  assert.equal(stats.attachments, 1);
});
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Implement filters + placeholder rewrite**

In `public/js/parser.js`:

Add above `parseWhatsApp`:
```javascript
const SYSTEM_RE = /messages and calls are end-to-end encrypted|created group|added|left|changed the subject|changed this group/i;
const MEDIA_RE = /^(<Media omitted>|\[(?:Image|Video|Audio|Document|Sticker|GIF):.*\]|image omitted|video omitted|audio omitted|document omitted|sticker omitted|GIF omitted)$/i;
const INVISIBLE = /\u200e/g;
```

Rewrite `parseWhatsApp`:
```javascript
export function parseWhatsApp(rawText) {
  const messages = [];
  const unparseable = [];
  let skippedSystem = 0;
  if (!rawText) return { messages, unparseable, stats: emptyStats() };
  const lines = String(rawText).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    if (SYSTEM_RE.test(line)) { skippedSystem++; continue; }
    const iph = line.match(IPHONE_RE);
    if (iph) {
      pushMessage(messages, iph, 'iphone');
      continue;
    }
    const and = line.match(ANDROID_RE);
    if (and) {
      pushMessage(messages, and, 'android');
      continue;
    }
    if (messages.length > 0) {
      messages[messages.length - 1].text += '\n' + line;
    } else {
      unparseable.push(line);
    }
  }
  return { messages, unparseable, stats: buildStats(messages, unparseable, skippedSystem) };
}

function pushMessage(messages, match, kind) {
  let timestamp;
  let sender;
  let text;
  if (kind === 'iphone') {
    const [, mo, d, y, hh, mm, ampm, s, t] = match;
    timestamp = toIsoIphone(Number(mo), Number(d), y, hh, mm, ampm);
    sender = s;
    text = t;
  } else {
    const [, d, mo, y, hh, mm, s, t] = match;
    timestamp = toIsoAndroid(d, mo, y, hh, mm);
    sender = s;
    text = t;
  }
  const cleaned = text.replace(INVISIBLE, '').trim();
  const entry = {
    sender: sender.trim().replace(/~$/, ''),
    timestamp,
    text: MEDIA_RE.test(cleaned) ? '📎 [attachment]' : text,
  };
  if (MEDIA_RE.test(cleaned)) entry.isAttachment = true;
  messages.push(entry);
}
```

Replace `buildStats` with:
```javascript
function buildStats(messages, unparseable, skippedSystem) {
  const senders = Array.from(new Set(messages.map(m => m.sender)));
  let dateRange = null;
  if (messages.length > 0) {
    const times = messages.map(m => m.timestamp).sort();
    dateRange = { from: times[0], to: times[times.length - 1] };
  }
  const attachments = messages.filter(m => m.isAttachment).length;
  return { messageCount: messages.length, senders, dateRange, attachments, skippedSystem: skippedSystem || 0, unparseableCount: unparseable.length };
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npm test`
Expected: all existing + new tests pass.

- [ ] **Step 5: Commit**

Run:
```
git add public/js/parser.js tests/parser.test.js
git commit -m "feat(parser): filter system messages, mark attachments"
```

---

## Task 11: Parser — edge cases (TDD)

**Files:**
- Modify: `tests/parser.test.js`

- [ ] **Step 1: Add remaining edge-case tests**

Append:
```javascript
test('Empty paste returns empty result', () => {
  const { messages, unparseable } = parseWhatsApp('');
  assert.equal(messages.length, 0);
  assert.equal(unparseable.length, 0);
});

test('Null input returns empty result', () => {
  const { messages, unparseable } = parseWhatsApp(null);
  assert.equal(messages.length, 0);
  assert.equal(unparseable.length, 0);
});

test('Sender name with colon in it (edge case)', () => {
  const raw = '[4/20/26, 2:14 PM] John from Fiverr: message body';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages[0].sender, 'John from Fiverr');
  assert.equal(messages[0].text, 'message body');
});

test('Sender name with trailing ~ is stripped', () => {
  const raw = '[4/20/26, 2:14 PM] +1 555 123~: message';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages[0].sender, '+1 555 123');
});

test('CRLF line endings are normalized', () => {
  const raw = '[4/20/26, 2:14 PM] A: one\r\n[4/20/26, 2:15 PM] B: two';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 2);
});

test('4-digit year is accepted directly', () => {
  const raw = '[4/20/2026, 2:14 PM] A: y';
  const { messages } = parseWhatsApp(raw);
  assert.match(messages[0].timestamp, /^2026/);
});
```

- [ ] **Step 2: Run tests — should pass (parser already handles these)**

Run: `npm test`
Expected: all parser tests pass. If a test fails (e.g. year handling), fix the regex to accept `\d{2,4}` — but the regex in Task 7 was already `\d{2,4}`, so this should pass.

- [ ] **Step 3: Commit**

Run:
```
git add tests/parser.test.js
git commit -m "test(parser): cover edge cases — null, empty, colons, crlf, 4-digit year"
```

---

## Task 12: Firebase security rules file

**Files:**
- Create: `firebase.rules.json`

- [ ] **Step 1: Create `firebase.rules.json`**

Content:
```json
{
  "rules": {
    ".read":  "auth != null && auth.uid == 'REPLACE_WITH_SHARED_UID'",
    ".write": "auth != null && auth.uid == 'REPLACE_WITH_SHARED_UID'",
    "projects": {
      "$projectId": {
        ".validate": "newData.hasChildren(['title','status','createdAt'])",
        "title":         { ".validate": "newData.isString() && newData.val().length <= 200" },
        "clientName":    { ".validate": "newData.isString() && newData.val().length <= 100" },
        "platform":      { ".validate": "newData.isString() && newData.val().length <= 50" },
        "price":         { ".validate": "newData.isString() && newData.val().length <= 50" },
        "deadline":      { ".validate": "newData.isString() && newData.val().length <= 50" },
        "assignee":      { ".validate": "newData.isString() && newData.val().length <= 100" },
        "clientRequest": { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "ourApproach":   { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "deliverables":  { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "outcome":       { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "status":        { ".validate": "newData.val().matches(/^(new|quoted|awaiting_client|approved|in_progress|review|revisions|delivered|paid)$/)" },
        "createdAt":     { ".validate": "newData.val() == now || data.exists()" },
        "updatedAt":     { ".validate": "newData.val() == now" },
        "links":         { ".validate": "newData.hasChildren() || newData.val() == null" },
        "messages": {
          "$messageId": {
            "text":      { ".validate": "newData.isString() && newData.val().length <= 10000" },
            "sender":    { ".validate": "newData.isString() && newData.val().length <= 100" },
            "timestamp": { ".validate": "newData.isString() && newData.val().length <= 50" },
            "addedAt":   { ".validate": "newData.val() == now" },
            "isAttachment": { ".validate": "newData.isBoolean()" },
            "$other":    { ".validate": false }
          }
        },
        "notes": {
          "$noteId": {
            "content":   { ".validate": "newData.isString() && newData.val().length <= 10000" },
            "author":    { ".validate": "newData.isString() && newData.val().length <= 100" },
            "createdAt": { ".validate": "newData.val() == now" },
            "$other":    { ".validate": false }
          }
        },
        "$other": { ".validate": false }
      }
    },
    "audit": {
      "$eventId": {
        ".write":    "!data.exists()",
        ".validate": "newData.hasChildren(['action','author','at'])",
        "action":    { ".validate": "newData.isString() && newData.val().length <= 100" },
        "author":    { ".validate": "newData.isString() && newData.val().length <= 100" },
        "targetId":  { ".validate": "newData.isString() && newData.val().length <= 200" },
        "at":        { ".validate": "newData.val() == now" },
        "$other":    { ".validate": false }
      }
    },
    "$other": { ".validate": false }
  }
}
```

- [ ] **Step 2: Commit**

Run:
```
git add firebase.rules.json
git commit -m "feat(security): add Firebase Realtime Database rules"
```

---

## Task 13: Netlify headers + netlify.toml

**Files:**
- Create: `_headers`
- Create: `public/_headers` (copy of root `_headers` — Netlify reads from publish dir)
- Create: `netlify.toml`

- [ ] **Step 1: Create `_headers` in repo root**

Content:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://www.gstatic.com https://www.googleapis.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- [ ] **Step 2: Create `netlify.toml`**

Content:
```toml
[build]
  publish = "public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

- [ ] **Step 3: Copy `_headers` into `public/`**

Run:
```
cp _headers public/_headers
```

- [ ] **Step 4: Commit**

Run:
```
git add _headers public/_headers netlify.toml
git commit -m "feat(security): add CSP + security headers for Netlify"
```

---

## Task 14: Firebase init module

**Files:**
- Create: `public/js/firebase-init.js`

- [ ] **Step 1: Create `firebase-init.js` with placeholders**

Content:
```javascript
// REPLACE placeholders with your Firebase project's config from:
// Firebase Console → Project settings → General → Your apps → Web app config
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/firebase-init.js
git commit -m "feat(firebase): add SDK init with App Check + local persistence"
```

---

## Task 15: Auth module — sign in form + session guard

**Files:**
- Create: `public/js/auth.js`

- [ ] **Step 1: Create `auth.js`**

Content:
```javascript
import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { setText } from './sanitize.js';

const SESSION_MAX_MS = 8 * 60 * 60 * 1000; // 8 hours
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
  try { await signOut(auth); } catch (_) {}
  window.location.href = 'index.html';
}

export function requireAuth({ onReady } = {}) {
  onAuthStateChanged(auth, (user) => {
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/auth.js
git commit -m "feat(auth): login form binding, session guard, 8h timeout"
```

---

## Task 16: Audit log module

**Files:**
- Create: `public/js/audit.js`

- [ ] **Step 1: Create `audit.js`**

Content:
```javascript
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/audit.js
git commit -m "feat(audit): append-only audit log writer"
```

---

## Task 17: Database wrapper module

**Files:**
- Create: `public/js/db.js`

- [ ] **Step 1: Create `db.js`**

Content:
```javascript
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/db.js
git commit -m "feat(db): wrapper for projects/messages/notes + audit hooks"
```

---

## Task 18: Export module

**Files:**
- Create: `public/js/export.js`

- [ ] **Step 1: Create `export.js`**

Content:
```javascript
import { snapshotEverything } from './db.js';
import { logAudit } from './audit.js';

export async function exportBackup() {
  const data = await snapshotEverything();
  const projectCount = Object.keys(data.projects || {}).length;
  const payload = {
    exportedAt: new Date().toISOString(),
    projectCount,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  await logAudit('export_backup');
  return { projectCount };
}
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/export.js
git commit -m "feat(export): backup download as JSON"
```

---

## Task 19: Login page (index.html)

**Files:**
- Create: `public/index.html`

- [ ] **Step 1: Create `index.html`**

Content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in — Project Tracker</title>
  <link rel="icon" href="favicon.ico">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="../stuxen-design-toolkit/tokens/index.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/responsive.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/containers.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/components/buttons.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/interactions/hover-effects.css">

  <link rel="stylesheet" href="css/app.css">
</head>
<body class="login-page">
  <main class="login-wrap">
    <div class="login-card">
      <h1 class="login-title">Project Tracker</h1>
      <p class="login-sub">Sign in with the shared account.</p>

      <form id="loginForm" class="login-form" autocomplete="off" novalidate>
        <label>
          <span>Email</span>
          <input id="email" type="email" required autocomplete="username">
        </label>
        <label>
          <span>Password</span>
          <input id="password" type="password" required autocomplete="current-password">
        </label>
        <div id="error" class="login-error" role="alert" aria-live="polite"></div>
        <button type="submit" class="btn-primary">Sign in</button>
      </form>
    </div>
  </main>

  <script type="module">
    import { bindLoginForm } from './js/auth.js';
    bindLoginForm({
      formEl:     document.getElementById('loginForm'),
      emailEl:    document.getElementById('email'),
      passwordEl: document.getElementById('password'),
      errorEl:    document.getElementById('error'),
      onSuccessRedirect: 'dashboard.html',
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

Run:
```
git add public/index.html
git commit -m "feat(ui): add login page with shared-credential sign-in"
```

---

## Task 20: Dashboard HTML shell

**Files:**
- Create: `public/dashboard.html`

- [ ] **Step 1: Create `dashboard.html`**

Content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard — Project Tracker</title>
  <link rel="icon" href="favicon.ico">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="../stuxen-design-toolkit/tokens/index.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/responsive.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/containers.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/components/index.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/interactions/hover-effects.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/interactions/scroll-animations.css">

  <link rel="stylesheet" href="css/app.css">
</head>
<body class="dashboard-page">
  <header class="top-bar">
    <div class="top-bar-left">
      <span class="logo">Tracker</span>
    </div>
    <div class="top-bar-center">
      <input id="search" type="search" placeholder="Search projects, messages…" class="search-input">
    </div>
    <div class="top-bar-right">
      <button id="newProjectBtn" class="btn-primary">+ New project</button>
      <button id="settingsBtn" class="btn-icon" aria-label="Settings">⚙</button>
    </div>
  </header>

  <section class="filters">
    <div id="filterChips" class="filter-chips"></div>
    <div class="filter-right">
      <label class="archive-toggle">
        <input id="showArchived" type="checkbox"> Show archived
      </label>
      <select id="sortSelect" class="sort-select">
        <option value="recent">Recently updated</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="status">By status</option>
        <option value="deadline">By deadline</option>
      </select>
    </div>
  </section>

  <main class="project-list-wrap">
    <div id="projectList" class="project-list"></div>
    <div id="emptyState" class="empty-state" hidden>
      No projects yet. Click <strong>+ New project</strong> to add your first.
    </div>
  </main>

  <div id="settingsMenu" class="settings-menu" hidden>
    <button id="exportBtn">Export backup</button>
    <button id="changelogBtn">View changelog</button>
    <button id="signOutBtn">Sign out</button>
  </div>

  <dialog id="newProjectDialog" class="dialog">
    <form id="newProjectForm" method="dialog">
      <h2>New project</h2>
      <label>Title <input id="npTitle" required maxlength="200"></label>
      <label>Client name <input id="npClient" maxlength="100"></label>
      <label>Platform
        <select id="npPlatform">
          <option value="Fiverr">Fiverr</option>
          <option value="Upwork">Upwork</option>
          <option value="Direct">Direct</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label>Price <input id="npPrice" maxlength="50" placeholder="$150 or TBD"></label>
      <label>Assignee <input id="npAssignee" maxlength="100" placeholder="Who's on it"></label>
      <div class="dialog-buttons">
        <button value="cancel">Cancel</button>
        <button id="npSubmit" value="create" class="btn-primary">Create</button>
      </div>
    </form>
  </dialog>

  <dialog id="changelogDialog" class="dialog">
    <h2>Recent activity</h2>
    <ul id="changelogList" class="changelog-list"></ul>
    <button onclick="this.closest('dialog').close()">Close</button>
  </dialog>

  <div id="offlinePill" class="offline-pill" hidden>● offline — will sync</div>

  <script type="module" src="js/dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

Run:
```
git add public/dashboard.html
git commit -m "feat(ui): dashboard HTML shell with filters, list, dialogs"
```

---

## Task 21: Dashboard JS — live list + filters + search + sort + new project + settings

**Files:**
- Create: `public/js/dashboard.js`

- [ ] **Step 1: Create `dashboard.js`**

Content:
```javascript
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
  setText(sub, parts.join('  •  '));
  card.appendChild(sub);

  const meta = document.createElement('div');
  meta.className = 'project-card-meta';
  const updated = p.updatedAt ? relativeTime(p.updatedAt) : '';
  const msgs = p.messages ? Object.keys(p.messages).length : 0;
  const notes = p.notes ? Object.keys(p.notes).length : 0;
  setText(meta, `${updated}  •  ${msgs} messages  •  ${notes} notes`);
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
      setText(li, `${formatDate(e.at)} — ${e.action} by ${e.author}${e.targetId ? ` (${e.targetId})` : ''}`);
      list.appendChild(li);
    }
  }, { onlyOnce: true });
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

Run:
```
git add public/js/dashboard.js
git commit -m "feat(dashboard): live project list, filters, search, sort, new project"
```

---

## Task 22: Project detail HTML shell

**Files:**
- Create: `public/project.html`

- [ ] **Step 1: Create `project.html`**

Content:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project — Project Tracker</title>
  <link rel="icon" href="favicon.ico">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="../stuxen-design-toolkit/tokens/index.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/responsive.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/layouts/containers.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/components/index.css">
  <link rel="stylesheet" href="../stuxen-design-toolkit/interactions/hover-effects.css">

  <link rel="stylesheet" href="css/app.css">
</head>
<body class="project-page">
  <header class="top-bar">
    <div class="top-bar-left">
      <a href="dashboard.html" class="back-link">← Back</a>
      <h1 id="projectTitle" class="project-title"></h1>
    </div>
    <div class="top-bar-right">
      <select id="statusDropdown" class="status-dropdown" aria-label="Status">
        <option value="new">New</option>
        <option value="quoted">Quoted</option>
        <option value="awaiting_client">Awaiting client</option>
        <option value="approved">Approved</option>
        <option value="in_progress">In progress</option>
        <option value="review">Review</option>
        <option value="revisions">Revisions</option>
        <option value="delivered">Delivered</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  </header>

  <section class="summary-row" id="summaryRow"></section>

  <nav class="tab-bar" role="tablist">
    <button class="tab tab-active" data-tab="conversation" role="tab">Conversation</button>
    <button class="tab" data-tab="notes" role="tab">Notes</button>
    <button class="tab" data-tab="details" role="tab">Details</button>
    <button class="tab" data-tab="links" role="tab">Links</button>
  </nav>

  <section id="tab-conversation" class="tab-panel">
    <button id="pasteBtn" class="btn-primary">+ Paste WhatsApp messages</button>
    <div id="messagesList" class="messages-list"></div>
  </section>

  <section id="tab-notes" class="tab-panel" hidden>
    <form id="noteForm">
      <label>Who <input id="noteAuthor" maxlength="100" placeholder="Your name"></label>
      <textarea id="noteContent" maxlength="10000" placeholder="Decision, idea, question..."></textarea>
      <button class="btn-primary" type="submit">Add note</button>
    </form>
    <div id="notesList" class="notes-list"></div>
  </section>

  <section id="tab-details" class="tab-panel" hidden>
    <form id="detailsForm" class="details-form">
      <label>Title <input id="dTitle" maxlength="200"></label>
      <label>Client name <input id="dClientName" maxlength="100"></label>
      <label>Platform <input id="dPlatform" maxlength="50"></label>
      <label>Price <input id="dPrice" maxlength="50"></label>
      <label>Deadline <input id="dDeadline" type="date"></label>
      <label>Assignee <input id="dAssignee" maxlength="100"></label>
      <label>Client's request <textarea id="dClientRequest" maxlength="10000"></textarea></label>
      <label>Our approach <textarea id="dOurApproach" maxlength="10000"></textarea></label>
      <label>Deliverables <textarea id="dDeliverables" maxlength="10000"></textarea></label>
      <label>Outcome <textarea id="dOutcome" maxlength="10000"></textarea></label>
      <button class="btn-primary" type="submit">Save changes</button>
    </form>

    <hr>
    <div class="danger-zone">
      <h3>Danger zone</h3>
      <p>Delete this project and all its messages and notes.</p>
      <button id="deleteBtn" class="btn-danger">Delete project</button>
    </div>
  </section>

  <section id="tab-links" class="tab-panel" hidden>
    <form id="linkForm">
      <label>Label <input id="linkLabel" maxlength="100"></label>
      <label>URL <input id="linkUrl" type="url" maxlength="500"></label>
      <button class="btn-primary" type="submit">Add link</button>
    </form>
    <ul id="linksList" class="links-list"></ul>
  </section>

  <dialog id="pasteDialog" class="dialog">
    <h2>Paste WhatsApp messages</h2>
    <textarea id="pasteRaw" placeholder="Paste here..." rows="10"></textarea>
    <button id="previewBtn" type="button" class="btn-primary">Preview</button>
    <div id="pastePreview" class="paste-preview" hidden></div>
    <div class="dialog-buttons">
      <button id="pasteCancel" value="cancel">Cancel</button>
      <button id="pasteImport" class="btn-primary" disabled>Import</button>
    </div>
  </dialog>

  <dialog id="deleteDialog" class="dialog">
    <h2>Delete project</h2>
    <p>Type the exact project title to confirm:</p>
    <p><strong id="delTitleEcho"></strong></p>
    <input id="delConfirmInput" type="text" maxlength="200">
    <div class="dialog-buttons">
      <button value="cancel">Cancel</button>
      <button id="delConfirmBtn" class="btn-danger" disabled>Delete forever</button>
    </div>
  </dialog>

  <div id="offlinePill" class="offline-pill" hidden>● offline — will sync</div>

  <script type="module" src="js/project.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

Run:
```
git add public/project.html
git commit -m "feat(ui): project detail page HTML with tabs and dialogs"
```

---

## Task 23: Project JS — load + summary + tabs + status dropdown

**Files:**
- Create: `public/js/project.js`

- [ ] **Step 1: Create `project.js`**

Content:
```javascript
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
  document.title = `${p.title || 'Project'} — Project Tracker`;
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): header, summary, tabs, status dropdown wiring"
```

---

## Task 24: Project JS — conversation tab + paste flow

**Files:**
- Modify: `public/js/project.js`

- [ ] **Step 1: Append conversation + paste functions**

Append:
```javascript
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
    setText(pp, `Dates: ${formatDate(parsed.stats.dateRange.from)} → ${formatDate(parsed.stats.dateRange.to)}`);
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
    setText(summary, `⚠ ${parsed.unparseable.length} unparseable line(s) — click to view`);
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
    } catch (err) {
      skipped++;
    }
  }
  await logAudit('import_messages', { targetId: PROJECT_ID });
  alert(`Imported ${imported} message(s). Skipped ${skipped} duplicate(s)/errors.`);
}
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): conversation tab rendering + paste/parse/import flow"
```

---

## Task 25: Project JS — notes tab

**Files:**
- Modify: `public/js/project.js`

- [ ] **Step 1: Append notes functions**

Append:
```javascript
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): notes tab with add/delete"
```

---

## Task 26: Project JS — details tab form

**Files:**
- Modify: `public/js/project.js`

- [ ] **Step 1: Append details form wiring**

Append:
```javascript
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): details tab with editable form and save"
```

---

## Task 27: Project JS — links tab

**Files:**
- Modify: `public/js/project.js`

- [ ] **Step 1: Append links tab**

Append:
```javascript
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
```

- [ ] **Step 2: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): links tab with http(s) validation"
```

---

## Task 28: Project JS — delete project with title confirmation

**Files:**
- Modify: `public/js/project.js`

- [ ] **Step 1: Append delete flow**

Append:
```javascript
function bindDelete() {
  const dlg = document.getElementById('deleteDialog');
  const echo = document.getElementById('delTitleEcho');
  const input = document.getElementById('delConfirmInput');
  const confirmBtn = document.getElementById('delConfirmBtn');

  document.getElementById('deleteBtn').addEventListener('click', () => {
    setText(echo, currentProject.title || '(untitled)');
    input.value = '';
    confirmBtn.disabled = true;
    dlg.showModal();
  });

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value.trim() !== (currentProject.title || '(untitled)').trim();
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
```

- [ ] **Step 2: Lint**

Run: `npm run lint`

- [ ] **Step 3: Commit**

Run:
```
git add public/js/project.js
git commit -m "feat(project): delete with title-echo confirmation"
```

---

## Task 29: Custom CSS on top of Stuxen tokens

**Files:**
- Create: `public/css/app.css`

- [ ] **Step 1: Create `app.css`**

Content:
```css
:root {
  --status-new-bg:          #6b7280;
  --status-quoted-bg:       #8b5cf6;
  --status-awaiting-bg:     #f59e0b;
  --status-approved-bg:     #10b981;
  --status-inprogress-bg:   var(--primary-clr);
  --status-review-bg:       #3b82f6;
  --status-revisions-bg:    #ef4444;
  --status-delivered-bg:    #059669;
  --status-paid-bg:         #111827;
}

body {
  font-family: var(--_font-typography---font-family--primary-font, 'Poppins', sans-serif);
  background: var(--white-smoke, whitesmoke);
  color: var(--secondary-clr, #212121);
  margin: 0;
  min-height: 100vh;
}

/* Login */
.login-page { display: grid; place-items: center; min-height: 100vh; padding: 24px; }
.login-card { background: var(--white, white); padding: 32px; border-radius: var(--_radius---radius-md, 16px); border: 1px solid var(--dark-12); max-width: 420px; width: 100%; }
.login-title { margin: 0 0 4px; font-size: 28px; }
.login-sub { margin: 0 0 24px; color: var(--dark-70); }
.login-form label { display: block; margin-bottom: 16px; }
.login-form label span { display: block; margin-bottom: 6px; font-size: 14px; color: var(--dark-70); }
.login-form input { width: 100%; padding: 12px 14px; border: 1px solid var(--dark-16); border-radius: 10px; font: inherit; box-sizing: border-box; }
.login-error { color: #ef4444; min-height: 1.4em; margin-bottom: 12px; font-size: 14px; }

/* Top bar */
.top-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; background: var(--white); border-bottom: 1px solid var(--dark-12); position: sticky; top: 0; z-index: 10; }
.top-bar-left, .top-bar-right { display: flex; align-items: center; gap: 12px; }
.top-bar-center { flex: 1; display: flex; justify-content: center; }
.logo { font-weight: 700; font-size: 20px; color: var(--primary-clr); }
.search-input { width: min(520px, 100%); padding: 10px 14px; border: 1px solid var(--dark-16); border-radius: 10px; font: inherit; }
.btn-primary { background: var(--primary-clr); color: white; border: 0; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { filter: brightness(1.05); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-icon { background: transparent; border: 1px solid var(--dark-16); padding: 8px 10px; border-radius: 10px; cursor: pointer; }
.btn-danger { background: #ef4444; color: white; border: 0; padding: 10px 16px; border-radius: 10px; cursor: pointer; }
.btn-danger:disabled { opacity: .5; }
.btn-tiny-danger { color: #ef4444; background: transparent; border: 0; cursor: pointer; font-size: 13px; }

/* Filters */
.filters { padding: 16px 24px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center; }
.filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--dark-16); background: white; cursor: pointer; font-size: 13px; }
.chip-active { background: var(--primary-clr); color: white; border-color: var(--primary-clr); }
.archive-toggle { font-size: 14px; color: var(--dark-70); }
.sort-select { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--dark-16); font: inherit; }

/* Project list */
.project-list-wrap { padding: 0 24px 48px; }
.project-list { display: grid; gap: 12px; grid-template-columns: 1fr; max-width: 1100px; margin: 0 auto; }
.project-card { background: white; border: 1px solid var(--dark-12); border-radius: var(--_radius---radius-md, 14px); padding: 16px 20px; cursor: pointer; transition: transform 200ms, box-shadow 200ms; }
.project-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
.project-card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.project-card h3 { margin: 0; font-size: 18px; }
.project-card-sub { color: var(--dark-70); font-size: 14px; margin-top: 6px; }
.project-card-meta { color: var(--dark-70); font-size: 12px; margin-top: 10px; }
.empty-state { text-align: center; padding: 48px 24px; color: var(--dark-70); }

/* Status badges */
.status-badge { color: white; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.status-new         { background: var(--status-new-bg); }
.status-quoted      { background: var(--status-quoted-bg); }
.status-awaiting_client { background: var(--status-awaiting-bg); }
.status-approved    { background: var(--status-approved-bg); }
.status-in_progress { background: var(--status-inprogress-bg); }
.status-review      { background: var(--status-review-bg); }
.status-revisions   { background: var(--status-revisions-bg); }
.status-delivered   { background: var(--status-delivered-bg); }
.status-paid        { background: var(--status-paid-bg); }

/* Project detail */
.project-title { margin: 0; font-size: 22px; }
.back-link { text-decoration: none; color: var(--dark-70); margin-right: 12px; }
.status-dropdown { padding: 8px 12px; border-radius: 10px; border: 1px solid var(--dark-16); font: inherit; }
.summary-row { padding: 16px 24px; display: flex; gap: 8px; flex-wrap: wrap; }
.summary-chip { background: white; border: 1px solid var(--dark-12); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
.tab-bar { padding: 0 24px; display: flex; gap: 4px; border-bottom: 1px solid var(--dark-12); overflow-x: auto; }
.tab { background: transparent; border: 0; padding: 12px 16px; cursor: pointer; color: var(--dark-70); font: inherit; border-bottom: 2px solid transparent; }
.tab-active { color: var(--primary-clr); border-bottom-color: var(--primary-clr); font-weight: 600; }
.tab-panel { padding: 24px; max-width: 900px; margin: 0 auto; }

/* Messages */
.messages-list { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg-bubble { background: white; border: 1px solid var(--dark-12); border-radius: 12px; padding: 10px 14px; }
.msg-bubble.msg-attachment { background: #f3f4f6; }
.msg-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--dark-70); margin-bottom: 4px; }
.msg-body { white-space: pre-wrap; word-wrap: break-word; }

/* Notes */
#noteForm { display: grid; gap: 8px; margin-bottom: 16px; }
#noteForm textarea { min-height: 80px; padding: 10px 12px; border: 1px solid var(--dark-16); border-radius: 10px; font: inherit; }
.notes-list { display: flex; flex-direction: column; gap: 10px; }
.note-card { background: white; border: 1px solid var(--dark-12); border-radius: 12px; padding: 12px 16px; }
.note-head { display: flex; justify-content: space-between; font-size: 12px; color: var(--dark-70); margin-bottom: 6px; }

/* Details form */
.details-form { display: grid; gap: 12px; }
.details-form label { display: grid; gap: 4px; font-size: 14px; color: var(--dark-70); }
.details-form input, .details-form textarea { padding: 10px 12px; border: 1px solid var(--dark-16); border-radius: 10px; font: inherit; }
.details-form textarea { min-height: 90px; resize: vertical; }
.danger-zone { background: #fee; border: 1px solid #fca5a5; border-radius: 10px; padding: 16px; margin-top: 24px; }

/* Links */
.links-list { list-style: none; padding: 0; display: grid; gap: 8px; }
.links-list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; background: white; border: 1px solid var(--dark-12); border-radius: 10px; }

/* Dialog */
.dialog { border: 0; border-radius: 16px; padding: 24px; max-width: 560px; width: 90vw; }
.dialog::backdrop { background: rgba(0,0,0,0.4); }
.dialog-buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
#pasteRaw { width: 100%; padding: 12px; border: 1px solid var(--dark-16); border-radius: 10px; font-family: monospace; font-size: 13px; box-sizing: border-box; }
.paste-preview { background: #f9fafb; padding: 12px; border-radius: 10px; margin-top: 12px; font-size: 14px; }
.paste-preview details pre { max-height: 200px; overflow: auto; background: white; padding: 8px; border-radius: 8px; font-size: 12px; }

/* Settings menu */
.settings-menu { position: absolute; top: 60px; right: 24px; background: white; border: 1px solid var(--dark-12); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); z-index: 20; }
.settings-menu button { background: transparent; border: 0; padding: 8px 12px; cursor: pointer; text-align: left; border-radius: 6px; }
.settings-menu button:hover { background: var(--white-smoke); }

.changelog-list { padding-left: 20px; max-height: 400px; overflow: auto; }

.offline-pill { position: fixed; bottom: 24px; right: 24px; background: #f59e0b; color: white; padding: 8px 14px; border-radius: 999px; font-size: 13px; z-index: 50; }
.empty { text-align: center; padding: 32px; color: var(--dark-70); }

/* Responsive */
@media (max-width: 767px) {
  .top-bar { flex-direction: column; align-items: stretch; gap: 10px; }
  .top-bar-center { order: 3; }
  .filters { padding: 12px 16px; }
  .project-list-wrap { padding: 0 12px 48px; }
  .tab-panel { padding: 16px; }
  .filter-chips { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
  .chip { white-space: nowrap; }
}
@media (max-width: 479px) {
  .project-card { padding: 12px 14px; }
  .project-card h3 { font-size: 16px; }
  .btn-primary, .btn-danger { width: 100%; }
  .dialog-buttons { flex-direction: column; }
}
```

- [ ] **Step 2: Commit**

Run:
```
git add public/css/app.css
git commit -m "feat(ui): custom styles on top of Stuxen tokens"
```

---

## Task 30: Local smoke test (manual, no Firebase yet)

**Files:** none

- [ ] **Step 1: Serve locally**

Run: `npm run serve`
Expected: starts serving `public/` at `http://localhost:3000`.

- [ ] **Step 2: Open in browser**

Visit `http://localhost:3000`.

- [ ] **Step 3: Visual sanity check**

Verify:
- Login page loads with Poppins font.
- Purple accent color (#5235f6) visible on the button.
- No console errors about missing CSS.
- Firebase calls will fail because config is still `REPLACE_ME` — expected at this stage.

- [ ] **Step 4: Stop server (Ctrl+C)**

- [ ] **Step 5: Commit any CSS tweaks made**

If you edited CSS to fix layout issues:
```
git add public/css/app.css
git commit -m "style: local visual pass fixes"
```

---

## Task 31: Firebase project setup (manual — user action)

**Files:**
- Modify: `public/js/firebase-init.js`
- Modify: `firebase.rules.json`

- [ ] **Step 1: Create Firebase project**

Go to https://console.firebase.google.com → **Add project** → name `whatsapp-tracker` → disable Analytics → **Create**.

- [ ] **Step 2: Enable MFA on your Google account**

https://myaccount.google.com/security → **2-Step Verification** → enable with authenticator app.

- [ ] **Step 3: Enable Realtime Database**

Firebase Console → **Build → Realtime Database → Create Database** → choose region (`us-central1`) → **Start in locked mode**.

- [ ] **Step 4: Paste security rules**

**Realtime Database → Rules tab** → paste contents of `firebase.rules.json` → **Publish**. UID placeholder is fine for now.

- [ ] **Step 5: Enable Email/Password auth**

**Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**. Do NOT enable any other sign-in methods.

- [ ] **Step 6: Create the shared user**

**Authentication → Users tab → Add user** → email like `tracker-shared@yourdomain.com` → strong 20+ char password → **Add user**.

- [ ] **Step 7: Copy the shared user's UID**

Authentication → Users → click the row → copy the **User UID**.

- [ ] **Step 8: Update `firebase.rules.json`**

Replace both `REPLACE_WITH_SHARED_UID` occurrences with the real UID. Paste back into Rules tab → **Publish**.

- [ ] **Step 9: Set up App Check with reCAPTCHA v3**

**Build → App Check → Register your app → reCAPTCHA v3** → create a reCAPTCHA v3 site in Google Cloud → select reCAPTCHA v3 → add `localhost` + your future Netlify domain → **Submit** → copy **Site key** → paste back into Firebase App Check → **Save**. Enable **enforcement** for Realtime Database.

- [ ] **Step 10: Register the web app and get config**

**Project settings (gear icon) → General → Your apps → Add app → Web** → name `tracker-web` → skip Hosting → **Continue** → copy the `firebaseConfig` object.

- [ ] **Step 11: Paste into `public/js/firebase-init.js`**

Replace the `firebaseConfig` placeholders with the real values. Replace `RECAPTCHA_SITE_KEY` with the real key.

- [ ] **Step 12: Add authorized domains**

**Authentication → Settings → Authorized domains** → verify `localhost` is listed. Netlify domain gets added after Task 32.

- [ ] **Step 13: Commit**

```
git add firebase.rules.json public/js/firebase-init.js
git commit -m "chore(firebase): fill project config, UID, and App Check site key"
```

---

## Task 32: Netlify deploy (manual — user action)

**Files:** none

- [ ] **Step 1: Push repo to GitHub**

Create repo on GitHub → then:
```
git remote add origin https://github.com/YOUR_USER/whatsapp-tracker.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Netlify account** at https://app.netlify.com

- [ ] **Step 3: Import site**

**Sites → Add new site → Import an existing project** → choose Git provider → authorize → pick the repo.

- [ ] **Step 4: Configure build**

Netlify reads `netlify.toml`. Confirm **Publish directory = `public`**. Build command empty. **Deploy site**.

- [ ] **Step 5: Wait for deploy and get URL**

Copy the generated `https://<something>.netlify.app` URL.

- [ ] **Step 6: Update Firebase authorized domains**

Firebase Console → **Authentication → Settings → Authorized domains → Add domain** → paste Netlify URL (without `https://`).

- [ ] **Step 7: Update reCAPTCHA domains**

Google Cloud → **Security → reCAPTCHA** → edit your key → add Netlify domain → save.

---

## Task 33: End-to-end smoke test on production

**Files:** none

- [ ] **Step 1: Visit the Netlify URL**

Open in Chrome → DevTools → Network: no 403/CSP violations on load.

- [ ] **Step 2: Try wrong password**

Type any email + garbage password → Sign in → should see "Wrong email or password."

- [ ] **Step 3: Sign in with the shared credentials**

Should redirect to `dashboard.html`. Should see an empty state.

- [ ] **Step 4: Create a new project**

Click **+ New project** → fill "Test project" → Create. Should redirect to the project page.

- [ ] **Step 5: Paste a sample WhatsApp block**

On the project page → **+ Paste WhatsApp messages** → paste:
```
[4/20/26, 2:14 PM] Tomi: client wants dark mode
line two
[4/20/26, 2:17 PM] Bayo: got it
```
Click **Preview** → should show "Parsed 2 messages..." → **Import** → both bubbles appear.

- [ ] **Step 6: Change status**

Change dropdown to "In progress" → refresh → should persist.

- [ ] **Step 7: Real-time sync**

Open a second incognito tab, sign in, open the same project. In tab 1, add a note. Tab 2 should show the new note within ~1 second.

- [ ] **Step 8: Export backup**

Dashboard → settings gear → **Export backup** → JSON file downloads. Open it — verify `projectCount` matches and `data.projects` contains your test project with messages.

- [ ] **Step 9: Sign out**

Settings → **Sign out** → redirects to login.

- [ ] **Step 10: Delete the test project**

Sign back in → open test project → **Details → Delete project** → type title → **Delete forever** → returns to dashboard, project is gone.

- [ ] **Step 11: Commit any fixes**

If any issue was found and fixed, commit with descriptive messages.

---

## Task 34: SETUP.md documentation

**Files:**
- Create: `docs/SETUP.md`

- [ ] **Step 1: Create `docs/SETUP.md`**

Content:
```markdown
# Setup guide

Step-by-step Firebase + Netlify setup for the WhatsApp Project Tracker. Estimated time: 30 minutes.

## Prerequisites

- A Google account (for Firebase).
- A GitHub/GitLab/Bitbucket account.
- A Netlify account (free).

## 1. Firebase project

1. https://console.firebase.google.com → **Add project**.
2. Name it (e.g. `whatsapp-tracker`). Disable Analytics.
3. **Enable MFA on your Google account** (https://myaccount.google.com/security).

### Realtime Database

1. **Build → Realtime Database → Create Database** → region → **Start in locked mode**.
2. **Rules tab** → paste contents of `firebase.rules.json` → **Publish**.

### Authentication

1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
2. **Users tab → Add user** → shared email + strong password (20+ chars).
3. Copy the new user's **UID**.

### Fill UID into rules

1. In `firebase.rules.json`, replace both `REPLACE_WITH_SHARED_UID` with the real UID.
2. Paste updated rules → **Publish**.
3. Commit:
   ```
   git add firebase.rules.json
   git commit -m "chore: set shared UID in rules"
   ```

### App Check

1. **Build → App Check → Register app → reCAPTCHA v3**.
2. Create a reCAPTCHA v3 site in Google Cloud; add `localhost` + your Netlify domain.
3. Paste the **site key** into App Check → **Save**.
4. Enable **Enforcement** for Realtime Database.

### Web app config

1. **Project settings (gear) → General → Your apps → Add app → Web**.
2. Register (no Hosting) → copy `firebaseConfig`.
3. Paste into `public/js/firebase-init.js`.
4. Paste the reCAPTCHA site key into `RECAPTCHA_SITE_KEY`.

## 2. Netlify

1. Push repo to GitHub.
2. Netlify → **Sites → Add new → Import from Git** → pick repo.
3. Confirm **Publish directory = `public`**, build command empty → **Deploy**.
4. Copy the generated URL.

## 3. Wire together

1. Firebase → **Authentication → Settings → Authorized domains** → add Netlify domain.
2. Google Cloud → reCAPTCHA key → add Netlify domain.

## 4. Smoke test

Follow `docs/SECURITY.md` § "Smoke-test checklist" on the live URL.

## 5. Share credentials

Send URL + shared email/password to your 2 teammates via a secure channel (**NOT** the WhatsApp group).

## Troubleshooting

- **"Permission denied"** — UID in rules doesn't match the shared user's UID.
- **reCAPTCHA errors** — domain not added to the reCAPTCHA key.
- **CSP violations** — `_headers` not in publish directory.
- **"Auth domain not authorized"** — Firebase Authentication → Settings → add domain.
```

- [ ] **Step 2: Commit**

```
git add docs/SETUP.md
git commit -m "docs: add Firebase + Netlify setup guide"
```

---

## Task 35: SECURITY.md runbook

**Files:**
- Create: `docs/SECURITY.md`

- [ ] **Step 1: Create `docs/SECURITY.md`**

Content:
```markdown
# Security runbook

## Threat model

- **3-person trusted group** shares one login. No per-user accountability.
- Data is **project coordination**. **Not** secrets, payment info, or client passwords.
- Weakest links: the shared password; the Google account that owns the Firebase project.

## Rotating the shared password

1. Firebase Console → **Authentication → Users → (shared user) → Reset password**.
2. Set a new strong password (20+ chars).
3. Tell the team via a secure channel.

## Revoking all active sessions

1. Firebase Console → **Authentication → Users** → delete the user.
2. Recreate with same email and a new password.
3. Copy new UID.
4. Update `firebase.rules.json` with new UID.
5. Publish rules and commit file.

## Restoring from a backup

1. Dashboard → settings gear → **Export backup** (weekly maintenance).
2. If data is corrupted: Firebase Console → **Realtime Database → menu → Import JSON**.
3. Upload the `data` field of your backup (strip the wrapper).

## Emergency kill-switch

Set rules to deny everything:
```json
{ "rules": { ".read": false, ".write": false } }
```
**Publish** in Firebase console. Freezes reads/writes instantly.

## Rule test cases

Firebase Rules simulator (Realtime Database → Rules tab → **Simulator**):

1. **Unauth read blocked** — `/projects` · unauth · Read → **Denied**.
2. **Unauth write blocked** — `/projects/test` · `{"title":"x","status":"new","createdAt":{".sv":"timestamp"}}` · unauth · Write → **Denied**.
3. **Random UID blocked** — same payload, UID `random123` · Write → **Denied**.
4. **Shared UID allowed** — same payload, shared UID · Write → **Allowed**.
5. **Invalid status rejected** — status `bogus` · shared UID · Write → **Denied**.
6. **Extra field rejected** — payload with `evil: "x"` · shared UID · Write → **Denied**.
7. **Audit immutability** — write `/audit/event1` → Allowed; write again → Denied.

## What NOT to store

- Client passwords, OTPs, API keys
- Payment card numbers, bank details
- Personal ID numbers, NDAs, legal documents

## Regular maintenance

- **Weekly:** export a backup, save to Google Drive.
- **Monthly:** test that a backup actually restores (import into a separate test Firebase project).
- **Quarterly:** rotate the shared password.
```

- [ ] **Step 2: Commit**

```
git add docs/SECURITY.md
git commit -m "docs: add security runbook (rotation, restore, kill-switch, tests)"
```

---

## Task 36: Final README + full test + push

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md`**

Content:
```markdown
# WhatsApp Project Tracker

A static-site project tracker for a 3-person WhatsApp developer group, backed by Firebase Realtime Database with real-time sync and shared-login auth.

## Features

- **9-stage project lifecycle**: new → quoted → awaiting_client → approved → in_progress → review → revisions → delivered → paid.
- **Copy-paste WhatsApp import** with multi-line, iPhone + Android format support, system-message filtering, and a parse preview before committing.
- **Project archive** with client request, approach, deliverables, outcome as first-class fields.
- **Real-time sync** — one member's change appears on everyone's open tabs within ~1 second.
- **Free hosting** — Netlify + Firebase free tier.
- **Hardened security** — Firebase Email/Password auth, App Check (reCAPTCHA v3), strict RTDB rules with schema validation, CSP + HSTS headers, append-only audit log, ESLint-banned unsafe DOM patterns.

## Quickstart

1. Clone this repo.
2. `npm install`
3. `npm test` — run unit tests (parser, sanitize, utils).
4. `npm run lint` — static checks.
5. `npm run serve` — serve `public/` at http://localhost:3000.

## Deployment

- **[docs/SETUP.md](docs/SETUP.md)** — Firebase + Netlify setup (30 min).
- **[docs/SECURITY.md](docs/SECURITY.md)** — security runbook and rule testing.
- **[docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md](docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md)** — design spec.

## Project structure

```
public/              # deployed static site
  index.html           # login
  dashboard.html       # main tracker
  project.html         # project detail
  css/app.css
  js/
    firebase-init.js auth.js db.js audit.js
    sanitize.js parser.js utils.js export.js
    dashboard.js project.js
stuxen-design-toolkit/   # design system (tokens, components, layouts)
tests/                   # node --test
firebase.rules.json      # security rules
netlify.toml             # Netlify config
_headers                 # CSP + security headers
```

## License

Private.
```

- [ ] **Step 2: Run full check**

```
npm run lint
npm test
```

Expected: lint clean, all tests pass.

- [ ] **Step 3: Commit**

```
git add README.md
git commit -m "docs: finalize README with features, quickstart, structure"
```

- [ ] **Step 4: Push**

Run: `git push`

- [ ] **Step 5: Final production smoke test**

Revisit the Netlify URL. Sign in. Create one real project. Paste a real WhatsApp snippet from your group. Confirm everything works.

---

## Self-review — spec coverage check

| Spec section | Covered by tasks |
|---|---|
| §1 Problem | N/A — framing |
| §2 Goals | Tasks 1–30 implement all goals |
| §3 Non-goals | Observed — no user accounts, no WhatsApp API, no E2EE |
| §4 Users / shared login | Task 15 (auth) + Task 31 (shared user creation) |
| §5 Architecture | Tasks 14, 17, 19–22, 29 |
| §6 Data model | Task 12 (rules), Task 17 (db.js) |
| §7 9 stages | Task 12 (rules regex), Task 17 (VALID_STATUSES), Task 20 (chips), Task 22 (dropdown) |
| §8.1 Auth | Task 15, Task 31 |
| §8.2 Rules | Task 12 |
| §8.3 App Check | Task 14 (init), Task 31 (enable) |
| §8.4 Authorized domains | Task 31 |
| §8.5 Google MFA | Task 31 |
| §8.6 Transport + CSP | Task 13 |
| §8.7 XSS | Tasks 3, 4–5, all renderers use `setText` |
| §8.8 Ops | Task 3, Task 16 |
| §8.9 Data boundaries | Task 35 |
| §8.10 Backup | Tasks 18, 21 |
| §8.11 Incident runbook | Task 35 |
| §9 UI | Tasks 19, 20, 22, 23–29 |
| §10 Parser | Tasks 7–11 |
| §11 File structure | Task 1 + all subsequent |
| §12 Error handling | Tasks 15, 17, 21, 23 |
| §13 Testing | Tasks 4–11 (unit), 30 (local smoke), 33 (prod smoke), 35 (rule tests) |
| §14 Deployment | Tasks 31–33 |
| §15 Open questions | Explicitly deferred |

No gaps found.

## Self-review — placeholder scan

No `TODO`, `TBD`, or "implement later" markers in code steps. `REPLACE_WITH_SHARED_UID` and `REPLACE_ME` are deployment-time fillins, clearly annotated, with explicit replacement steps in Task 31.

## Self-review — name/type consistency

- `createProject`/`updateProject`/`deleteProject` — consistent across `db.js`, `dashboard.js`, `project.js`.
- `addMessage`/`addNote`/`deleteNote` — consistent.
- `VALID_STATUSES` exported from `db.js`; `STATUS_ORDER` separately defined in `dashboard.js` for UI ordering (intentional — different concerns).
- `setText`/`createLinkifiedFragment` — consistent signatures between `sanitize.js`, tests, and consumers.
- `parseWhatsApp` returns `{ messages, unparseable, stats }` — consistent between `parser.js`, tests, and `project.js`.

No inconsistencies.
