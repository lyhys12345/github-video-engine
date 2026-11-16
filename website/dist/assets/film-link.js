// Only curated showcase IDs can become deep links. Never treat a hash as a URL.
export function parseFilmHash(hash, allowedIds) {
 const match = typeof hash === 'string' && /^#film=([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(hash);
 return match && allowedIds.includes(match[1]) ? match[1] : null;
}

export function isShowcasePath(pathname) {
 return pathname === '/showcase/' || pathname === '/zh/showcase/';
}

export function buildFilmLink(origin, showcasePath, id, allowedIds) {
 if (!isShowcasePath(showcasePath) || parseFilmHash(`#film=${id}`, allowedIds) !== id) {
  throw new TypeError('A canonical showcase route and known film are required.');
 }
 const base = new URL(origin);
 if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
  throw new TypeError('A public HTTP(S) origin is required.');
 }
 // origin excludes the current path, query, hash and any draft state.
 return `${base.origin}${showcasePath}#film=${id}`;
}
