#!/usr/bin/env node
/**
 * Simple static blog generator.
 *
 *   - Write markdown posts in blog/posts/YYYY-MM-DD-slug.md
 *   - Run: node build-blog.js
 *   - Generates blog/index.html, blog/<slug>.html, blog/feed.xml
 *
 * No dependencies. Hand-rolled minimal markdown:
 *   # ## ### headings, **bold**, *italic*, [link](url), ![alt](url),
 *   - / 1. lists, > blockquote, `code`, ```fenced code```, raw <html> lines pass through.
 */
const fs = require('fs');
const path = require('path');

const SITE = {
  title: 'Mary Huang — Research',
  description: 'Notes & experiments by Mary Huang.',
  url: 'https://mary-huang.com',
  blogPath: '/blog',
  author: 'Mary Huang',
};

const SRC_DIR = path.join(__dirname, 'blog', 'posts');
const OUT_DIR = path.join(__dirname, 'blog');

// ---------- markdown ----------
const inline = t => t
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

function md(src) {
  const out = [];
  let para = [], list = null, quote = [], code = null;
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>'); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const ln of src.split('\n')) {
    if (code !== null) {
      if (ln.startsWith('```')) { out.push('<pre><code>' + code.join('\n') + '</code></pre>'); code = null; }
      else code.push(ln);
      continue;
    }
    if (ln.startsWith('```')) { flushAll(); code = []; continue; }
    const h = ln.match(/^(#{1,4}) (.+)$/);
    if (h) { flushAll(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    if (/^[-*] /.test(ln)) {
      flushPara(); flushQuote();
      if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + inline(ln.slice(2)) + '</li>'); continue;
    }
    if (/^\d+\. /.test(ln)) {
      flushPara(); flushQuote();
      if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + inline(ln.replace(/^\d+\. /, '')) + '</li>'); continue;
    }
    if (ln.startsWith('> ')) { flushPara(); flushList(); quote.push(ln.slice(2)); continue; }
    if (ln.trim() === '') { flushAll(); continue; }
    if (/^<\w/.test(ln) || /^<\//.test(ln)) { flushAll(); out.push(ln); continue; }
    flushList(); flushQuote();
    para.push(ln);
  }
  flushAll();
  return out.join('\n');
}

// ---------- front matter ----------
function parsePost(filename, src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  let body = src;
  if (m) {
    body = m[2];
    m[1].split('\n').forEach(l => {
      const i = l.indexOf(':');
      if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    });
  }
  const base = path.basename(filename, '.md');
  const dm = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (dm) {
    meta.date = meta.date || dm[1];
    meta.slug = meta.slug || dm[2];
  } else {
    meta.slug = meta.slug || base;
  }
  meta.title = meta.title || meta.slug;
  meta.date = meta.date || '1970-01-01';
  return { meta, body };
}

// ---------- preview ----------
function extractPreview(body, max = 180) {
  const paraLines = [];
  for (const ln of body.split('\n')) {
    const t = ln.trim();
    if (!t) { if (paraLines.length) break; continue; }
    if (/^(#|>|!\[|-\s|\*\s|\d+\.\s|```|<)/.test(t)) continue;
    paraLines.push(t);
  }
  let text = paraLines.join(' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.match(/^[\s\S]*[.!?](?=\s|$)/);
  if (sentence && sentence[0].length >= max * 0.5) return sentence[0];
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut) + '…';
}

// ---------- utilities ----------
const escapeXml = s => s.replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' })[c]);
const formatDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' });
const rfc822 = d => new Date(d + 'T12:00:00Z').toUTCString();
const absolutize = (html, base) =>
  html.replace(/(src|href)="(?!https?:|\/\/|\/|#|mailto:)([^"]+)"/g, (_, a, u) => `${a}="${base}${u}"`);

// ---------- templates ----------
const head = title => `  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://use.typekit.net/mwr2qgm.css">
  <link rel="stylesheet" href="../css/layout.css">
  <link rel="stylesheet" href="../css/blog.css">
  <link rel="icon" type="image/png" href="../images/favicon.png">
  <link rel="alternate" type="application/rss+xml" title="${SITE.title}" href="feed.xml">`;

const pageHeader = `  <header class="page-header">
    <a href="/index.html"><h5 class="name-title">Mary Huang</h5></a>
    <div class="header-links">
      <a href="https://www.linkedin.com/in/maryhuang1/" target="_blank" rel="noopener" aria-label="LinkedIn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z"/></svg>
      </a>
      <a href="mailto:hello@mary-huang.com" aria-label="Email">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
      </a>
    </div>
  </header>`;

function postPage({ meta, html }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head(`${meta.title} — ${SITE.author}`)}
</head>
<body>
${pageHeader}
  <article class="post">
    <header class="post-header">
      <p class="post-date">${formatDate(meta.date)}</p>
      <h1 class="post-title">${meta.title}</h1>
    </header>
    <div class="post-body">
${html}
    </div>
    <footer class="post-footer">
      <a href="index.html">← All notes</a>
    </footer>
  </article>
</body>
</html>
`;
}

function indexPage(posts) {
  const cards = posts.map(p => `      <a class="post-card" href="${p.meta.slug}.html">
        <span class="post-card-date">${formatDate(p.meta.date)}</span>
        <h2 class="post-card-title">${escapeXml(p.meta.title)}</h2>
        <p class="post-card-preview">${escapeXml(p.preview || '')}</p>
      </a>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head(SITE.title)}
</head>
<body>
${pageHeader}
  <section class="post-list-section">
    <header class="post-list-header">
      <h1>Research</h1>
      <p>Notes &amp; experiments. <a href="feed.xml">RSS</a></p>
    </header>
    <div class="post-grid">
${cards}
    </div>
  </section>
</body>
</html>
`;
}

function feed(posts) {
  const base = SITE.url + SITE.blogPath + '/';
  const items = posts.map(p => `    <item>
      <title>${escapeXml(p.meta.title)}</title>
      <link>${base}${p.meta.slug}.html</link>
      <guid isPermaLink="true">${base}${p.meta.slug}.html</guid>
      <pubDate>${rfc822(p.meta.date)}</pubDate>
      <description><![CDATA[${absolutize(p.html, base)}]]></description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.title)}</title>
    <link>${base}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en-us</language>
    <atom:link href="${base}feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

// ---------- build ----------
function build() {
  if (!fs.existsSync(SRC_DIR)) { console.error('No posts directory:', SRC_DIR); process.exit(1); }
  const posts = fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const { meta, body } = parsePost(f, fs.readFileSync(path.join(SRC_DIR, f), 'utf8'));
      return { meta, html: md(body), preview: extractPreview(body) };
    })
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));

  for (const p of posts) fs.writeFileSync(path.join(OUT_DIR, p.meta.slug + '.html'), postPage(p));
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage(posts));
  fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), feed(posts));
  console.log(`Built ${posts.length} post${posts.length === 1 ? '' : 's'} → ${OUT_DIR}`);
}

build();
