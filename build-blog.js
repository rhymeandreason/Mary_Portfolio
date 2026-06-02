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

const topNav = `  <div class="container project-page">
    <div class="row top-nav">
      <div class="one-half column">
        <a href="/index.html"><h5 class="name-title">Mary Huang</h5></a>
      </div>
    </div>
  </div>`;

function postPage({ meta, html }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head(`${meta.title} — ${SITE.author}`)}
</head>
<body>
${topNav}
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
  const items = posts.map(p => `        <li>
          <a href="${p.meta.slug}.html">
            <span class="post-list-date">${formatDate(p.meta.date)}</span>
            <span class="post-list-title">${p.meta.title}</span>
          </a>
        </li>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head(SITE.title)}
</head>
<body>
${topNav}
  <section class="post-list-section">
    <header class="post-list-header">
      <h1>Research</h1>
      <p>Notes &amp; experiments. <a href="feed.xml">RSS</a></p>
    </header>
    <ul class="post-list">
${items}
    </ul>
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
      return { meta, html: md(body) };
    })
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));

  for (const p of posts) fs.writeFileSync(path.join(OUT_DIR, p.meta.slug + '.html'), postPage(p));
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage(posts));
  fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), feed(posts));
  console.log(`Built ${posts.length} post${posts.length === 1 ? '' : 's'} → ${OUT_DIR}`);
}

build();
