/**
 * Offline publication checks against the generated dist artifacts.
 * Run after building: node --test tools/site.test.mjs
 * No browser, network, HTML conformance parser, listening or visual review is
 * claimed here. These catch empty pages, broken local references, locale
 * regressions, missing licensed fonts and mismatched/invalid subtitle files.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = ['/', '/showcase/', '/guide/', '/zh/', '/zh/showcase/', '/zh/guide/'];
const pages = new Map();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Attribute-aware tokenization for this generated static HTML. It does not
// attempt browser error recovery or general HTML parsing.
function tags(html) {
  const result = [];
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  const expression = /<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  for (const match of clean.matchAll(expression)) {
    const attrs = {};
    const attributes = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    for (const attr of match[2].matchAll(attributes)) attrs[attr[1].toLowerCase()] = decode(attr[2] ?? attr[3] ?? attr[4] ?? '');
    result.push({name: match[1].toLowerCase(), attrs});
  }
  return result;
}

function visibleText(html) {
  return decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function tree(directory) {
  const results = [];
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) results.push(...await tree(file));
    else results.push(file);
  }
  return results;
}

function localFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const file = path.resolve(dist, `.${decoded}`);
  const relative = path.relative(dist, file);
  assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `reference escapes dist: ${pathname}`);
  return pathname.endsWith('/') ? path.join(file, 'index.html') : file;
}

for (const route of routes) {
  const html = await readFile(localFile(route), 'utf8');
  const elements = tags(html);
  pages.set(route, {html, elements, ids: new Set(elements.map(el => el.attrs.id).filter(Boolean))});
}
const canonical = pages.get('/').elements.find(el => el.name === 'link' && el.attrs.rel === 'canonical')?.attrs.href;
assert.ok(canonical, 'homepage must identify its canonical URL');
const origin = new URL(canonical).origin;
const allFiles = await tree(dist);

async function checkReference(value, baseRoute, description) {
  if (!value || /^(?:data:|mailto:|tel:)/i.test(value)) return;
  const url = new URL(value, `${origin}${baseRoute}`);
  assert.ok(['http:', 'https:'].includes(url.protocol), `${description}: unexpected URL scheme ${url.protocol}`);
  if (url.origin !== origin) return; // External destinations require separate online checks.
  const file = localFile(url.pathname);
  const info = await stat(file).catch(() => null);
  assert.ok(info?.isFile(), `${description}: missing ${url.pathname}`);
  assert.ok(info.size > 0, `${description}: empty ${url.pathname}`);
  if (url.hash && file.endsWith('.html')) {
    const target = pages.get(url.pathname) ?? {ids: new Set(tags(await readFile(file, 'utf8')).map(el => el.attrs.id).filter(Boolean))};
    assert.ok(target.ids.has(decodeURIComponent(url.hash.slice(1))), `${description}: missing anchor ${url.pathname}${url.hash}`);
  }
}

test('all six routes ship readable static content, one heading and unique IDs', async (t) => {
  for (const [route, {html, elements}] of pages) await t.test(route, () => {
    const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)];
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    assert.equal(mains.length, 1, 'exactly one main landmark');
    assert.ok(visibleText(mains[0][1]).length > 300, 'main must contain useful content without JavaScript');
    assert.equal(headings.length, 1, 'one clear page heading');
    assert.ok(visibleText(headings[0][1]).length >= 8, 'page heading must not be empty');
    const ids = elements.filter(el => 'id' in el.attrs).map(el => el.attrs.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate IDs break labels, tabs and fragment links');
    assert.ok(ids.every(Boolean), 'IDs may not be empty');
    for (const element of elements) {
      for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'for']) {
        if (!element.attrs[attr]) continue;
        for (const id of element.attrs[attr].trim().split(/\s+/)) assert.ok(ids.includes(id), `${attr} references missing ${id}`);
      }
    }
    assert.doesNotMatch(visibleText(mains[0][1]), /\bundefined\b|\[object Object\]/, 'template data must be populated');
  });
});

test('local links, fragment targets and HTML media/style/module references exist', async (t) => {
  for (const [route, {elements}] of pages) await t.test(route, async () => {
    for (const element of elements) {
      for (const attr of ['href', 'src', 'poster', 'data-src']) {
        if (element.attrs[attr]) await checkReference(element.attrs[attr], route, `${route} ${element.name}[${attr}]`);
      }
      if (element.attrs.srcset) {
        for (const source of element.attrs.srcset.split(',')) await checkReference(source.trim().split(/\s+/)[0], route, `${route} srcset`);
      }
    }
  });
});

test('locale metadata, switch links and main navigation stay in their intended language', async (t) => {
  for (const [route, {html, elements}] of pages) await t.test(route, () => {
    const chinese = route.startsWith('/zh/');
    const baseRoute = chinese ? route.slice(3) : route;
    const language = elements.find(el => el.name === 'html')?.attrs.lang;
    assert.equal(language, chinese ? 'zh-CN' : 'en');
    const canonicalLink = elements.find(el => el.name === 'link' && el.attrs.rel === 'canonical');
    assert.equal(canonicalLink?.attrs.href, `${origin}${route}`);
    const alternatives = new Map(elements.filter(el => el.name === 'link' && el.attrs.rel === 'alternate').map(el => [el.attrs.hreflang, new URL(el.attrs.href).pathname]));
    assert.equal(alternatives.get('en'), baseRoute);
    assert.equal(alternatives.get('zh-CN'), `/zh${baseRoute}`);
    const switchLink = elements.find(el => el.attrs.id === 'language');
    assert.equal(switchLink?.attrs.href, chinese ? baseRoute : `/zh${baseRoute}`);
    const navigation = html.match(/<nav\b[^>]*\bid="navigation"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
    assert.ok(navigation, 'main navigation must be present before hydration');
    const links = tags(navigation).filter(el => el.name === 'a');
    assert.ok(links.length >= 3);
    for (const link of links) assert.equal(new URL(link.attrs.href, origin).pathname.startsWith('/zh/'), chinese, `navigation changes locale: ${link.attrs.href}`);
    assert.equal(links.filter(link => link.attrs['aria-current'] === 'page').length, 1);
  });
});

test('CSS and JavaScript local dependencies resolve without hosted font requests', async () => {
  for (const [route, {elements}] of pages) {
    for (const element of elements.filter(el => el.name === 'link')) {
      if (element.attrs.rel === 'stylesheet' || element.attrs.as === 'font') assert.equal(new URL(element.attrs.href, origin).origin, origin, `${route}: remote stylesheet/font request`);
    }
  }
  for (const file of allFiles.filter(file => /\.(css|js)$/.test(file))) {
    const source = await readFile(file, 'utf8');
    const route = `/${path.relative(dist, file).split(path.sep).join('/')}`;
    assert.doesNotMatch(source, /(?:fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net)/, `${route}: hosted font dependency`);
    if (file.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) await checkReference(match[1], route, `${route} CSS url`);
      for (const face of source.matchAll(/@font-face\s*\{([^}]+)\}/g)) assert.doesNotMatch(face[1], /(?:https?:)?\/\//, `${route}: remote font face`);
    } else {
      for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/g)) {
        if (match[1].startsWith('.') || match[1].startsWith('/')) await checkReference(match[1], route, `${route} module import`);
      }
    }
  }
});

function seconds(stamp) {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(stamp);
  assert.ok(match, `invalid WebVTT timestamp ${stamp}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function parseCues(source) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  assert.match(normalized, /^WEBVTT(?:\s[^\n]*)?\n/);
  const cues = [];
  for (const block of normalized.split(/\n\s*\n/).slice(1)) {
    if (!block.trim() || /^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(block)) continue;
    const lines = block.trim().split('\n');
    const timingIndex = lines[0].includes('-->') ? 0 : 1;
    const timing = /^([^\s]+)\s+-->\s+([^\s]+)(?:\s+.*)?$/.exec(lines[timingIndex] ?? '');
    assert.ok(timing, `invalid cue block: ${block}`);
    const text = lines.slice(timingIndex + 1).join('\n').trim();
    assert.ok(text, 'caption cue must contain text');
    assert.doesNotMatch(text, /\uFFFD|\bundefined\b/, 'caption text must not contain decoding/template errors');
    cues.push({start: seconds(timing[1]), end: seconds(timing[2]), text});
  }
  return cues;
}

test('translated captions match their manifest, media and legal timeline bounds', async (t) => {
  const directory = path.join(dist, 'assets/captions');
  const manifest = JSON.parse(await readFile(path.join(directory, 'caption-provenance.json'), 'utf8'));
  assert.ok(manifest.entries?.length > 0);
  const declared = new Set();
  for (const entry of manifest.entries) await t.test(entry.id, async () => {
    assert.ok(!declared.has(entry.captionFile), 'caption file must have one provenance record');
    declared.add(entry.captionFile);
    const caption = await readFile(localFile(`/${entry.captionFile}`));
    const media = await readFile(localFile(`/${entry.media}`));
    assert.equal(hash(caption), entry.captionSha256, 'caption content hash');
    assert.equal(hash(media), entry.mediaSha256, 'caption must refer to the distributed video');
    assert.ok(Number.isFinite(entry.videoDurationSeconds) && entry.videoDurationSeconds > 0);
    assert.ok(Number.isFinite(entry.fps) && entry.fps > 0);
    assert.ok(Number.isInteger(entry.videoFrames) && entry.videoFrames > 0);
    assert.ok(Math.abs(entry.videoFrames / entry.fps - entry.videoDurationSeconds) < 0.001, 'duration/frame metadata consistency');
    const cues = parseCues(caption.toString('utf8'));
    assert.equal(cues.length, entry.cueCount);
    assert.ok(cues.length > 0);
    let previousEnd = 0;
    for (const cue of cues) {
      assert.ok(cue.start >= 0 && cue.end > cue.start, 'caption needs positive duration');
      assert.ok(cue.start >= previousEnd - 0.001, 'caption intervals must not reverse or overlap');
      assert.ok(cue.end <= entry.videoDurationSeconds + 0.001, 'caption extends beyond video');
      previousEnd = cue.end;
    }
  });
  const present = allFiles.filter(file => file.endsWith('.vtt')).map(file => path.relative(dist, file).split(path.sep).join('/'));
  assert.deepEqual([...declared].sort(), present.sort(), 'every shipped VTT must have a manifest entry');
});

test('all bundled fonts have matching bytes, a local license and a CSS declaration', async () => {
  const directory = path.join(dist, 'assets/fonts');
  const manifest = JSON.parse(await readFile(path.join(directory, 'provenance.json'), 'utf8'));
  const styles = await readFile(path.join(directory, 'fonts.css'), 'utf8');
  const licenses = await Promise.all(allFiles.filter(file => file.startsWith(directory + path.sep) && file.endsWith('.txt')).map(file => readFile(file, 'utf8')));
  assert.ok(manifest.fonts?.length > 0);
  const declared = new Set();
  for (const font of manifest.fonts) {
    assert.ok(!declared.has(font.file), 'font provenance must not duplicate a file');
    declared.add(font.file);
    const bytes = await readFile(localFile(`/assets/fonts/${font.file}`));
    assert.equal(hash(bytes), font.sha256, `${font.family}: font hash`);
    assert.equal(bytes.length, font.bytes, `${font.family}: byte count`);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2', `${font.family}: WOFF2 signature`);
    assert.ok(licenses.some(license => license.includes(font.family) && /SIL OPEN FONT LICENSE Version 1\.1/i.test(license)), `${font.family}: local attribution and license missing`);
    assert.ok(styles.includes(font.file), `${font.family}: font is not declared in local CSS`);
    assert.match(font.license, /^https:\/\//, `${font.family}: original license provenance`);
  }
  const bundled = allFiles.filter(file => /\.woff2?$/.test(file)).map(file => path.basename(file));
  assert.deepEqual([...declared].sort(), bundled.sort(), 'every bundled font must be accounted for');
});
