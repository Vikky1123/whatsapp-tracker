export function setText(el, text) {
  el.textContent = text == null ? '' : String(text);
}

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
