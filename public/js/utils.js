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
