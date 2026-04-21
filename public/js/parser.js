const IPHONE_RE  = /^\[(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:,|\s+at)?\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)\]\s*([^:]+?):\s*(.*)$/i;
const ANDROID_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:,|\s+at)?\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*-\s*([^:]+?):\s*(.*)$/;
const SYSTEM_RE  = /messages and calls are end-to-end encrypted|created group|added|left|changed the subject|changed this group/i;
const MEDIA_RE   = /^(<Media omitted>|\[(?:Image|Video|Audio|Document|Sticker|GIF):.*\]|image omitted|video omitted|audio omitted|document omitted|sticker omitted|GIF omitted)$/i;
const INVISIBLE  = /\u200e/g;

function pad(n) { return String(n).padStart(2, '0'); }

function resolveYear(y) {
  if (y === undefined || y === null || y === '') return new Date().getFullYear();
  let year = Number(y);
  if (year < 100) year += 2000;
  return year;
}

function toIsoIphone(m, d, y, hh, mm, ampm) {
  const year = resolveYear(y);
  let hour = Number(hh);
  const AP = String(ampm).toUpperCase();
  if (AP === 'AM' && hour === 12) hour = 0;
  else if (AP === 'PM' && hour !== 12) hour += 12;
  return `${year}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(mm)}:00`;
}

function toIsoAndroid(d, m, y, hh, mm) {
  const year = resolveYear(y);
  return `${year}-${pad(Number(m))}-${pad(Number(d))}T${pad(Number(hh))}:${pad(Number(mm))}:00`;
}

function pushMessage(messages, match, kind) {
  let timestamp, sender, text;
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
  const isAttachment = MEDIA_RE.test(cleaned);
  const entry = {
    sender: sender.trim().replace(/~$/, ''),
    timestamp,
    text: isAttachment ? '📎 [attachment]' : text,
  };
  if (isAttachment) entry.isAttachment = true;
  messages.push(entry);
}

function nowIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * parseWhatsApp(rawText, options?)
 * - If timestamped lines are found: parses as a WhatsApp copy/export.
 * - If none are found: saves the full paste as a single "raw" message
 *   (sender = "(pasted)", timestamp = now). This handles the common case
 *   where someone long-presses one message in WhatsApp, taps Copy, and
 *   only the message body ends up on the clipboard.
 */
export function parseWhatsApp(rawText, options = {}) {
  const messages = [];
  const unparseable = [];
  let skippedSystem = 0;

  if (!rawText) return { messages, unparseable, stats: buildStats(messages, unparseable, 0, false) };

  const src = String(rawText).replace(/\r\n/g, '\n');
  const lines = src.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    if (SYSTEM_RE.test(line)) { skippedSystem++; continue; }

    const iph = line.match(IPHONE_RE);
    if (iph) { pushMessage(messages, iph, 'iphone'); continue; }

    const and = line.match(ANDROID_RE);
    if (and) { pushMessage(messages, and, 'android'); continue; }

    if (messages.length > 0) {
      messages[messages.length - 1].text += '\n' + line;
    } else {
      unparseable.push(line);
    }
  }

  // Fallback: NOTHING matched a known WhatsApp format. Treat the entire paste
  // as one raw message. This handles single-message copies where WhatsApp
  // doesn't include the [date, time] sender: prefix.
  let rawFallback = false;
  if (messages.length === 0 && unparseable.length > 0) {
    const body = unparseable.join('\n').trim();
    if (body) {
      messages.push({
        sender: options.defaultSender || '(pasted)',
        timestamp: nowIso(),
        text: body,
        isRawPaste: true,
      });
      rawFallback = true;
      unparseable.length = 0;
    }
  }

  return { messages, unparseable, stats: buildStats(messages, unparseable, skippedSystem, rawFallback) };
}

function buildStats(messages, unparseable, skippedSystem, rawFallback) {
  const senders = Array.from(new Set(messages.map(m => m.sender)));
  let dateRange = null;
  if (messages.length > 0) {
    const times = messages.map(m => m.timestamp).sort();
    dateRange = { from: times[0], to: times[times.length - 1] };
  }
  const attachments = messages.filter(m => m.isAttachment).length;
  return {
    messageCount: messages.length,
    senders,
    dateRange,
    attachments,
    skippedSystem,
    unparseableCount: unparseable.length,
    rawFallback: Boolean(rawFallback),
  };
}
