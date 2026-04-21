import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { setText, createLinkifiedFragment } from '../public/js/sanitize.js';

const dom = new JSDOM('<!DOCTYPE html><body><div id="t"></div></body>');
globalThis.document = dom.window.document;

test('setText writes plain text via textContent', () => {
  const el = document.createElement('div');
  setText(el, 'hello world');
  assert.equal(el.textContent, 'hello world');
});

test('setText does NOT render HTML - tags appear as literal text', () => {
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

test('createLinkifiedFragment plain text becomes one text node', () => {
  const frag = createLinkifiedFragment('just a message');
  assert.equal(frag.childNodes.length, 1);
  assert.equal(frag.childNodes[0].nodeType, 3);
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

test('createLinkifiedFragment null/undefined return empty fragment', () => {
  const frag1 = createLinkifiedFragment(null);
  assert.equal(frag1.childNodes.length, 0);
  const frag2 = createLinkifiedFragment(undefined);
  assert.equal(frag2.childNodes.length, 0);
});
