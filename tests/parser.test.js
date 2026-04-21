import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWhatsApp } from '../public/js/parser.js';

// iPhone format tests
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

// Android format tests
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

// Multi-line tests
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

test('Lines with no timestamps become a single raw-paste message (fallback)', () => {
  const raw = 'orphan line with no header\nanother orphan';
  const { messages, unparseable, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, '(pasted)');
  assert.equal(messages[0].text, 'orphan line with no header\nanother orphan');
  assert.equal(unparseable.length, 0);
  assert.equal(stats.rawFallback, true);
});

// System messages + media
test('System message "Messages and calls are end-to-end encrypted" is filtered', () => {
  const raw = [
    'Messages and calls are end-to-end encrypted.',
    '[4/20/26, 2:14 PM] A: hello',
  ].join('\n');
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(stats.skippedSystem, 1);
});

test('Media placeholder <Media omitted> converts to attachment marker', () => {
  const raw = '[4/20/26, 2:14 PM] A: <Media omitted>';
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /attachment/);
  assert.equal(messages[0].isAttachment, true);
  assert.equal(stats.attachments, 1);
});

test('Media invisible marker image omitted converts to attachment', () => {
  const raw = '[4/20/26, 2:14 PM] A: \u200eimage omitted';
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages[0].isAttachment, true);
  assert.equal(stats.attachments, 1);
});

// Edge cases
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

test('Stats contain senders, date range, counts', () => {
  const raw = [
    '[4/20/26, 2:14 PM] A: first',
    '[4/20/26, 3:00 PM] B: second',
    '[4/21/26, 1:00 PM] A: third',
  ].join('\n');
  const { stats } = parseWhatsApp(raw);
  assert.equal(stats.messageCount, 3);
  assert.deepEqual(stats.senders.sort(), ['A', 'B']);
  assert.match(stats.dateRange.from, /2026-04-20T14:14/);
  assert.match(stats.dateRange.to, /2026-04-21T13:00/);
});

// Fallback: raw paste without WhatsApp metadata
test('Raw paste (no timestamps) falls back to single message', () => {
  const raw = 'Hey can you update the logo size?\nAlso change the color.';
  const { messages, unparseable, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, '(pasted)');
  assert.match(messages[0].text, /logo size/);
  assert.match(messages[0].text, /change the color/);
  assert.equal(unparseable.length, 0);
  assert.equal(stats.rawFallback, true);
});

test('Single-line raw paste also falls back', () => {
  const { messages, stats } = parseWhatsApp('Single unformatted message from WhatsApp.');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, '(pasted)');
  assert.equal(messages[0].text, 'Single unformatted message from WhatsApp.');
  assert.equal(stats.rawFallback, true);
});

test('Fallback uses provided defaultSender', () => {
  const { messages } = parseWhatsApp('hello', { defaultSender: 'Tomi' });
  assert.equal(messages[0].sender, 'Tomi');
});

test('Fallback does NOT trigger when any line parses', () => {
  const raw = ['some stray line', '[4/20/26, 2:14 PM] A: proper'].join('\n');
  const { messages, stats } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'A');
  assert.equal(stats.rawFallback, false);
});

test('iPhone format with seconds still parses', () => {
  const raw = '[4/20/26, 2:14:05 PM] Tomi: hello';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Tomi');
  assert.match(messages[0].timestamp, /T14:14/);
});

test('iPhone format with "at" separator', () => {
  const raw = '[4/20/26 at 2:14 PM] Tomi: hello';
  const { messages } = parseWhatsApp(raw);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, 'Tomi');
});
