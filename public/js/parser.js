const IPHONE_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})\s*([AP]M)\]\s*([^:]+?):\s*(.*)$/;
const ANDROID_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}):(\d{2})\s*-\s*([^:]+?):\s*(.*)$/;
const SYSTEM_RE = /messages and calls are end-to-end encrypted|created group|added|left|changed the subject|changed this group/i;
const MEDIA_RE = /^(<Media omitted>|\[(?:Image|Video|Audio|Document|Sticker|GIF):.*\]|image omitted|video omitted|audio omitted|document omitted|sticker omitted|GIF omitted)$/i;
const INVISIBLE = /\u200e/g;

function pad(n) { return String(n).padStart(2, '0'); }

function toIsoIphone(m, d, y, hh, mm, ampm) {
  let year = Number(y);
  if (year < 100) year += 2000;
  let hour = Number(hh);
  if (ampm === 'AM' && hour === 12) hour = 0;
  else if (ampm === 'PM' && hour !== 12) hour += 12;
  return `${year}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(mm)}:00`;
}

function toIsoAndroid(d, m, y, hh, mm) {
  let year = Number(y);
  if (year < 100) year += 2000;
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

export function parseWhatsApp(rawText) {
  const messages = [];
  const unparseable = [];
  let skippedSystem = 0;

  if (!rawText) return { messages, unparseable, stats: buildStats(messages, unparseable, 0) };

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

function buildStats(messages, unparseable, skippedSystem) {
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
  };
}
