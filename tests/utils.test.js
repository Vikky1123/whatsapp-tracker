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

test('formatDate returns empty string for invalid dates', () => {
  assert.equal(formatDate('not a date'), '');
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

test('relativeTime returns empty string for null', () => {
  assert.equal(relativeTime(null), '');
  assert.equal(relativeTime(undefined), '');
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
