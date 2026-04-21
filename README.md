# WhatsApp Project Tracker

A static-site project tracker for a 3-person WhatsApp developer group, backed by Firebase Realtime Database with real-time sync and shared-login auth.

## Features

- **9-stage project lifecycle**: new → quoted → awaiting_client → approved → in_progress → review → revisions → delivered → paid.
- **Copy-paste WhatsApp import** — iPhone + Android formats, multi-line messages, system-message filtering, parse preview before committing.
- **Project archive** — client request, approach, deliverables, outcome as first-class fields, not buried in chat logs.
- **Real-time sync** — one member's change appears on every open tab within ~1 second (Firebase Realtime Database).
- **Free hosting** — Netlify + Firebase free tier. No credit card needed.
- **Hardened security** — Firebase Email/Password auth, App Check (reCAPTCHA v3), strict RTDB rules with schema validation and rejection of unknown fields, CSP + HSTS headers, append-only audit log, ESLint-banned HTML-injection sinks, 8-hour session timeout.

## Quickstart

```bash
npm install
npm test            # run unit tests (parser, sanitize, utils)
npm run lint        # static checks
npm run serve       # serve public/ at http://localhost:3000
```

## Deployment

- **[docs/SETUP.md](docs/SETUP.md)** — step-by-step Firebase + Netlify setup (~30 min).
- **[docs/SECURITY.md](docs/SECURITY.md)** — security runbook (rotation, kill-switch, rule testing).
- **[docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md](docs/superpowers/specs/2026-04-20-whatsapp-project-tracker-design.md)** — full design spec.
- **[docs/superpowers/plans/2026-04-20-whatsapp-project-tracker.md](docs/superpowers/plans/2026-04-20-whatsapp-project-tracker.md)** — implementation plan.

## Project structure

```
public/                        # deployed static site
  index.html                     # login
  dashboard.html                 # main tracker (project list, filters, search)
  project.html                   # project detail (tabs, paste, notes, details, links)
  css/app.css                    # custom styles on top of Stuxen
  js/
    firebase-init.js               # Firebase SDK init + App Check
    auth.js                        # login, sign out, session guard, 8h timeout
    db.js                          # typed wrapper around RTDB reads/writes
    audit.js                       # append-only audit log writer
    sanitize.js                    # XSS-safe text and URL rendering
    parser.js                      # WhatsApp paste parser (pure function)
    utils.js                       # formatDate, relativeTime, debounce
    export.js                      # backup JSON download
    dashboard.js                   # dashboard controller
    project.js                     # project detail controller

stuxen-design-toolkit/          # design system (tokens, components, layouts)
tests/                          # node --test unit tests
firebase.rules.json             # security rules (pasted into Firebase Console)
netlify.toml                    # Netlify build config
_headers, public/_headers       # CSP + security headers (Netlify reads from public/)
eslint.config.js                # flat ESLint config banning HTML-injection sinks
```

## License

Private.
