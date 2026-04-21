# WhatsApp Project Tracker — Design Spec

**Date:** 2026-04-20
**Status:** Approved (pending user spec review)

---

## 1. Problem

A 3-person developer group coordinates Fiverr outsourcing work in a WhatsApp group chat. The group contains three roles: developers, a client-finder, and a Fiverr-side operator. As projects pile up, conversations about different projects interleave. The group repeatedly loses track of which projects are approved, in progress, or waiting on client response, and has to scroll through chat history to find context for each project before replying.

A dedicated tracker website is needed to serve two purposes:

1. **Active coordination** — see at a glance which projects are at which stage and surface the right conversation context when discussing them.
2. **Long-term archive** — record each project (brief, approach, deliverables, outcome) as a searchable, structured entry independent of WhatsApp.

## 2. Goals

- One shared website for all three group members.
- Project is the primary entity; WhatsApp conversation is one facet among several (brief, approach, deliverables, notes, outcome).
- Import WhatsApp discussion into a project by copy-pasting; no WhatsApp API integration.
- Project lifecycle tracked across 9 stages.
- Real-time sync across members — when one person updates a project, others see it immediately.
- Zero-cost hosting and storage.
- Minimal operational overhead (no servers to run, no build step).
- Strong security posture despite tiny team size.

## 3. Non-goals

- Individual user accounts, per-user permissions, or role-based access control. The group uses one shared login.
- Direct WhatsApp API integration (Business API, bots, forwarding).
- Native mobile apps.
- Payment processing, invoicing, contract management.
- Secret storage (API keys, client passwords, payment info) — the tracker is for coordination data, not secrets.
- End-to-end encryption of tracker data.
- Full-text ranking or ML-powered search.

## 4. Users and roles

- Three group members share one login. No per-user accounts.
- Role in the group (developer / client-finder / Fiverr-side) is captured informally via the `assignee` free-text field on each project — not enforced by the system.

## 5. Architecture

### 5.1 Stack

- **Frontend:** Plain HTML / CSS / JavaScript. No framework, no bundler, no build step.
- **Styling:** Stuxen design toolkit (already in the repo at `stuxen-design-toolkit/`), imported as-is via `<link>` tags. Primary color `#5235f6` (purple), Poppins font, responsive at 4 breakpoints.
- **Backend:** Firebase Realtime Database (free Spark plan, 1 GB storage, 10 GB/month transfer).
- **Auth:** Firebase Email/Password authentication — one shared account that all three members log in with.
- **Extra protection:** Firebase App Check (reCAPTCHA v3 enforced), CSP headers via Netlify `_headers`.
- **Hosting:** Netlify free tier. HTTPS by default. Deployed from the `public/` directory.

### 5.2 Data flow

```
┌────────────────────────────────────────┐
│  Browser (any of 3 group members)      │
│                                        │
│  HTML pages ──► app.js                 │
│                 │                      │
│                 ▼                      │
│  Firebase JS SDK ──► Firebase RTDB     │
│        (auth + real-time data sync)    │
└────────────────────────────────────────┘
                 │
                 └─► Hosted on Netlify (static)
```

When any member writes to the database, Firebase pushes the change to every other connected client within ~1 second. No polling, no manual refresh.

## 6. Data model

Firebase Realtime Database stores everything as a JSON tree:

```
/projects/{projectId}
  title         (string, max 200)
  clientName    (string, max 100)
  platform      (string, max 50)            // "Fiverr", "Upwork", etc.
  price         (string, max 50)            // "$150", currency-agnostic string, "TBD"
  deadline      (ISO date string, optional)
  assignee      (string, max 100)           // free text: "Tomi", "Bayo", "me"
  status        (enum, see §7)
  clientRequest (string, max 10000)         // the original ask
  ourApproach   (string, max 10000)         // how we're tackling it
  deliverables  (string, max 10000)         // what we shipped
  outcome       (string, max 10000)         // result, feedback, lessons
  links         (array of {label, url})
  createdAt     (server timestamp)
  updatedAt     (server timestamp)

  /messages/{messageId}
    timestamp   (ISO string, parsed from WhatsApp)
    sender      (string, max 100)
    text        (string, max 10000)
    addedAt     (server timestamp)

  /notes/{noteId}
    content     (string, max 10000)
    author      (string, max 100)           // free text: who wrote the note
    createdAt   (server timestamp)

/audit/{eventId}
  action        (string)                    // "create_project", "update_status", ...
  author        (string)
  targetId      (string, optional)
  at            (server timestamp)
```

### Key data choices

- `price` is a string, not a number, to accept any currency or "TBD".
- `assignee` and `author` are free-text because the shared-login model has no per-user identity.
- `messages` and `notes` are subcollections under each project, so deleting a project cleanly removes its conversation.
- IDs come from Firebase `push()` — cryptographically unpredictable.
- All timestamps written server-side via `firebase.database.ServerValue.TIMESTAMP` — clients cannot forge times.
- `/audit` is append-only (see §8.2).

## 7. Project lifecycle — 9 stages

A project moves through these stages. The status field accepts exactly one of:

1. `new`                — inquiry just received
2. `quoted`             — we sent a quote to the client
3. `awaiting_client`    — waiting on client to respond
4. `approved`           — client accepted the quote
5. `in_progress`        — developer is working
6. `review`             — work submitted, awaiting client review
7. `revisions`          — client requested changes
8. `delivered`          — final version shipped
9. `paid`               — payment received, project complete

Status changes are written directly from the project detail page and synced to all connected clients in real time. Changes are logged to `/audit`.

## 8. Security

### 8.1 Authentication

- Firebase Email/Password auth is the single gate. No frontend-only password check (that would be bypassable).
- One shared account created in the Firebase console with a strong 20+ character password.
- Firebase handles hashing, brute-force rate limits, and session management.
- Sessions expire after 8 hours of inactivity (overriding the default) to reduce blast radius of an unattended device.
- Sign-up is disabled. Only the one pre-created account exists.
- Email/password is the only enabled sign-in method — no Google, phone, or anonymous.

### 8.2 Authorization — Firebase security rules

All rules enforced server-side by Google, not the frontend. `SHARED_UID` below is a literal placeholder — replaced with the actual UID from the Firebase Authentication console after the shared account is created in step 1 of §14 deployment.

```json
{
  "rules": {
    ".read":  "auth != null && auth.uid == 'SHARED_UID'",
    ".write": "auth != null && auth.uid == 'SHARED_UID'",
    "projects": {
      "$projectId": {
        ".validate": "newData.hasChildren(['title','status','createdAt'])",
        "title":        { ".validate": "newData.isString() && newData.val().length <= 200" },
        "clientName":   { ".validate": "newData.isString() && newData.val().length <= 100" },
        "clientRequest":{ ".validate": "newData.isString() && newData.val().length <= 10000" },
        "ourApproach":  { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "deliverables": { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "outcome":      { ".validate": "newData.isString() && newData.val().length <= 10000" },
        "status":       { ".validate": "newData.val().matches(/^(new|quoted|awaiting_client|approved|in_progress|review|revisions|delivered|paid)$/)" },
        "price":        { ".validate": "newData.isString() && newData.val().length <= 50" },
        "createdAt":    { ".validate": "newData.val() == now || data.exists()" },
        "updatedAt":    { ".validate": "newData.val() == now" },
        "messages": {
          "$messageId": {
            "text":      { ".validate": "newData.isString() && newData.val().length <= 10000" },
            "sender":    { ".validate": "newData.isString() && newData.val().length <= 100" },
            "timestamp": { ".validate": "newData.isString() && newData.val().length <= 50" },
            "addedAt":   { ".validate": "newData.val() == now" },
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

Critical properties enforced:

- Only the one shared account can read or write anything (`auth.uid == 'SHARED_UID'`).
- Every field is length-bounded to prevent storage abuse.
- Status is pattern-matched against the 9 allowed values.
- Timestamps must equal server `now` — clients can't fake times.
- Unknown fields are rejected by `$other: false` at every level.
- `/audit` events can be created but never modified or deleted.

### 8.3 Firebase App Check

reCAPTCHA v3 enforced for all Realtime Database requests. Requests not originating from the real browser on the real domain are rejected at the Google edge. Blocks bots, scripts, and stolen-config exploitation.

### 8.4 Authorized domains

Firebase console restricts auth to only the production Netlify domain (plus `localhost` for dev). Auth requests from any other origin fail.

### 8.5 Google account protection

The Google account that owns the Firebase project has MFA enforced (authenticator app or hardware key). Documented in `docs/SECURITY.md`. This protects against Firebase console takeover via phished Google credentials.

### 8.6 Transport and content security

- All traffic is HTTPS (Netlify auto-provisions certificates; HSTS header set with 2-year `max-age` and `preload`).
- Content Security Policy headers block inline scripts and restrict `script-src`, `connect-src`, `style-src`, `font-src`, `img-src` to explicit allowlists (Firebase, Google Fonts, self).
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disables camera/microphone/geolocation.
- Subresource Integrity (SRI) hashes on every external script tag — if the CDN file changes, the browser refuses to load it.

### 8.7 Rendering safety — XSS

- All user-generated text rendered via `textContent` or `createElement`. The `innerHTML` property, the `eval` global, and the Function constructor are banned by an ESLint `no-restricted-syntax` rule enforced in CI.
- URL detection in message text uses a regex; detected URLs are wrapped in anchor elements via `createElement`, with `rel="noopener noreferrer"` and `target="_blank"`.
- No markdown or HTML rendering anywhere — plain text only.

### 8.8 Operational security

- Production builds strip `console.*` calls and do not ship source maps.
- Only dependency is the Firebase SDK from Google's CDN — no npm supply chain.
- Firebase config in the frontend is intentionally public (per Google's design); security is enforced by rules + App Check + auth, not by obscurity.
- `/audit` log captures every write with `action`, `author`, `targetId`, `at`. Immutable once written. Tracked actions: `login_success`, `login_failure`, `create_project`, `update_project`, `delete_project`, `change_status`, `import_messages`, `delete_message`, `add_note`, `edit_note`, `delete_note`, `add_link`, `remove_link`, `export_backup`.

### 8.9 Explicit boundaries — what NOT to store

- Client passwords, API keys, OTPs — never.
- Payment card numbers, bank details — never.
- Personal ID numbers, NDAs, legal documents — never.

Tracker stores: project briefs, statuses, WhatsApp discussions, notes, Fiverr usernames, prices, deadlines.

### 8.10 Backup

An **"Export backup"** button downloads the whole database as a JSON file. Users are expected to run this weekly and save it to an external location (Google Drive, etc.). Firebase free tier does not include automatic exports.

### 8.11 Incident response

`docs/SECURITY.md` documents:

- How to rotate the shared password.
- How to revoke all active sessions (delete user in Firebase, recreate).
- How to restore from a backup JSON.
- How to kill-switch the app in an emergency (set DB rules to `".write": false`).

## 9. UI structure

### 9.1 Pages

- **`index.html`** — login (email + password, custom form using Firebase Auth SDK).
- **`dashboard.html`** — main tracker view.
- **`project.html?id=...`** — single project detail view.

### 9.2 Dashboard

- Top bar: site title, search input, **+ New Project** button, settings gear.
- Filter chips: `All` / each of the 9 statuses with counts. Click to filter.
- Toggle: `Show archived` (hidden by default — hides `paid` projects).
- Sort dropdown: *Recently updated* (default), *Newest*, *Oldest*, *By status*, *By deadline*.
- Project list: each row is a Stuxen card showing title, status badge, client, price, assignee, last-updated relative time, message count, note count.
- Live search filters rows as user types across title, clientName, clientRequest, ourApproach, deliverables, notes, messages. Search runs **client-side** against the already-loaded project list — no server-side index needed. This scales fine for the expected load (hundreds of projects, a few thousand messages total). If the group ever crosses ~5000 projects, we'll revisit.
- Cards open `project.html?id=...` on click.

### 9.3 Project detail

- Header: back button, title, edit button, status dropdown (all 9 values).
- Summary row: clientName, platform, price, deadline, assignee.
- Tabs:
  1. **Conversation** — parsed WhatsApp messages as a chat timeline. `+ Paste WhatsApp messages` button opens the paste modal.
  2. **Notes** — list of note cards (author, timestamp, content). `+ Add note` textarea.
  3. **Details** — editable form for title, clientName, platform, price, deadline, assignee, clientRequest, ourApproach, deliverables, outcome.
  4. **Links** — list of `{label, url}` pairs. `+ Add link` button.
- Delete button at bottom of Details tab. Requires typing the project title to confirm.

### 9.4 Settings menu (gear icon)

- **Export backup** — downloads `tracker-backup-YYYY-MM-DD.json`.
- **View changelog** — last 20 entries from `/audit`.
- **Sign out** — ends session, redirects to login.

### 9.5 Responsive behavior

Breakpoints follow Stuxen's responsive system:

- `≥1440px` — wider cards, larger spacing.
- `992–1439px` — default desktop layout.
- `≤991px` (tablet) — filter chips scroll horizontally, cards full-width.
- `≤767px` (mobile landscape) — status dropdown moves below title, tabs become horizontal scroller.
- `≤479px` (mobile portrait) — single column, tap targets ≥ 44 px.

### 9.6 Interactions

From Stuxen's toolkit:

- Scroll-reveal on dashboard cards (600 ms stagger).
- Card hover lift on desktop.
- Accordion pattern on Notes (collapses old notes).
- Navbar scroll-background effect.
- Counter ticker on "X active projects" stat.

## 10. WhatsApp paste parser

### 10.1 Supported formats

- **iPhone copy** — `[M/D/YY, H:MM AM/PM] Sender: text`
- **Android copy** — `D/M/YYYY, HH:MM - Sender: text`
- **WhatsApp chat export `.txt`** — same as Android format.

### 10.2 Algorithm

1. Normalize line endings to `\n`.
2. For each line, test against iPhone regex then Android regex. A match starts a new message.
3. Non-matching lines are appended to the previous message's `text` with a newline (multi-line message continuation).
4. Filter system messages — lines containing `"Messages and calls are end-to-end encrypted"`, `"created group"`, `"added"`, `"left"`, `"changed the subject"`. Configurable.
5. Detect media placeholders (`<Media omitted>`, `[Image: ...]`, `image omitted`, invisible `‎` marker) — kept as `📎 [attachment]` in the timeline.
6. Parse date based on which format matched (iPhone = M/D/Y, Android = D/M/Y). Convert to ISO.
7. Trim sender names; strip trailing `~`.

### 10.3 Preview dialog

After parsing, before committing to Firebase, show:

- Number of messages parsed.
- Distinct senders.
- Date range.
- Attachment count.
- Skipped system message count.
- Unparseable line count (if any) with a disclosure to view them.
- **Cancel** / **Import** buttons.

### 10.4 Duplicate detection

On import, compare each new message's `(sender, timestamp, text)` against existing messages in the project. Identical tuples are skipped.

### 10.5 Unparseable lines

Lines matching neither format are collected. User can choose:

- Skip them entirely, or
- Keep as raw — inserted as a message with `sender: "(unparsed)"` so no data is lost.

### 10.6 Rendering

Parsed message text is rendered via `textContent`. URLs detected with a regex and wrapped in `createElement('a')` with `rel="noopener noreferrer"` and `target="_blank"`.

## 11. File structure

```
whatsapp_structure/
├── stuxen-design-toolkit/              # existing, untouched
│
├── public/                             # deployed to Netlify
│   ├── index.html                      # login
│   ├── dashboard.html                  # main tracker
│   ├── project.html                    # detail view
│   ├── css/
│   │   └── app.css                     # custom on top of Stuxen
│   ├── js/
│   │   ├── firebase-init.js            # Firebase config + init
│   │   ├── auth.js                     # login / logout / session guard
│   │   ├── db.js                       # wrapper around RTDB reads/writes
│   │   ├── sanitize.js                 # safe text/URL rendering
│   │   ├── parser.js                   # WhatsApp parser
│   │   ├── dashboard.js                # dashboard controller
│   │   ├── project.js                  # project detail controller
│   │   ├── export.js                   # backup export
│   │   └── utils.js                    # helpers
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
│   └── superpowers/specs/
│       └── 2026-04-20-whatsapp-project-tracker-design.md
│
├── firebase.rules.json
├── netlify.toml
├── _headers
├── package.json                        # test runner + eslint only
└── README.md
```

Each JS file has a single clear responsibility. `sanitize.js` is isolated because XSS safety is load-bearing.

## 12. Error handling

- **Offline / Firebase unreachable** — Firebase SDK queues writes and syncs on reconnect. UI shows `● offline — will sync` pill.
- **Auth failure** — redirect to login with error message.
- **Rule rejection** — toast with human-readable reason mapped from rule path.
- **Parse error** — handled in the preview dialog; user decides.
- **Delete safety** — deleting a project requires typing the exact title; deleting a message or note requires single confirm.
- **Audit logging** — every failure writes an `/audit` event so issues are traceable.

## 13. Testing

### 13.1 Unit tests (Node `--test`)

- `parser.test.js`: iPhone single-line, Android single-line, multi-line continuation, system-message filtering, media placeholder handling, empty paste, ambiguous dates, sender names containing colons, gibberish.
- `sanitize.test.js`: `<script>` tags stripped, `javascript:` URLs rejected, safe URLs preserved, edge cases (empty string, very long strings).
- `utils.test.js`: date formatting, debounce timing, relative-time helper.

CI runs `node --test tests/` on every push — must pass to deploy.

### 13.2 Manual smoke checklist

Documented in `docs/SETUP.md`. Run after every deploy:

1. Log in with wrong password → error shown.
2. Log in with correct password → dashboard loads.
3. Create new project → appears in list immediately.
4. Paste sample WhatsApp block → preview shows correct counts.
5. Import → messages appear in timeline.
6. Change status → persists on refresh.
7. Open a second browser tab → sees the change within 1 second (real-time check).
8. Export backup → JSON downloads and validates.
9. Log out → bounced to login.

### 13.3 Security rule tests

Firebase Rules simulator (free, in console) used to verify expected allow/deny behavior for representative payloads. Test cases documented in `docs/SECURITY.md`.

## 14. Deployment

One-time setup, documented step-by-step in `docs/SETUP.md`:

1. **Firebase**
   - Create project.
   - Enable Realtime Database.
   - Enable Email/Password auth; disable sign-up; create shared user.
   - Enable App Check with reCAPTCHA v3.
   - Paste rules from `firebase.rules.json`.
   - Enable MFA on the Google owner account.

2. **Netlify**
   - Connect this repo, set publish directory to `public/`.
   - Deploy. `_headers` and `netlify.toml` are picked up automatically.
   - Copy the live URL.

3. **Wire up**
   - Add Netlify URL to Firebase authorized domains.
   - Paste Firebase config into `public/js/firebase-init.js`.
   - Redeploy.

4. **Verify**
   - Run the smoke checklist.

5. **Share**
   - Send URL + shared email/password to the two teammates via a secure channel (not the WhatsApp group).

Estimated setup time: ~30 minutes end-to-end.

## 15. Open questions / future work

Intentionally deferred:

- WhatsApp Business API integration (if volume grows, auto-ingest could replace copy-paste).
- Per-user accounts with real attribution (if the group grows beyond 3).
- Analytics — revenue per month, average project duration, close rate.
- Tag system beyond status — client tags, project-type tags.
- File uploads into the tracker (currently only links).
- Automated periodic backups (requires Firebase Blaze plan).

These are not blockers for v1 and are not included in the implementation plan.
