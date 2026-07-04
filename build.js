// build.js — Load Path static site generator
//
// What this does:
//   1. Reads content/site.json for site-wide settings.
//   2. Reads every .md file in content/posts/ as a blog post.
//   3. Reads content/about.md as the About page.
//   4. Writes finished HTML pages into docs/ (GitHub Pages serves this folder).
//
// You do not need to edit this file to publish a post. See README.md.
 
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");
 
const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, "content");
const POSTS_DIR = path.join(CONTENT_DIR, "posts");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_DIR = path.join(ROOT, "docs");
 
const site = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, "site.json"), "utf8"));
 
// ---------- helpers ----------
 
function readPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((filename) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf8");
    const { data, content } = matter(raw);
 
    if (!data.title) throw new Error(`Post ${filename} is missing "title" in its frontmatter.`);
    if (!data.category || !site.categories[data.category]) {
      throw new Error(
        `Post ${filename} has category "${data.category}", which is not defined in content/site.json.`
      );
    }
    if (!data.date) throw new Error(`Post ${filename} is missing "date" in its frontmatter.`);
 
    const slug =
      data.slug ||
      filename
        .replace(/\.md$/, "")
        .replace(/^\d{4}-\d{2}-\d{2}-/, "")
        .toLowerCase();
 
    const wordCount = content.trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 200));
 
    // gray-matter/YAML auto-converts unquoted dates (date: 2026-03-01) into
    // JS Date objects. Normalize both that case and a plain string to avoid
    // producing "Invalid Date".
    const dateStr =
      data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
 
    return {
      ...data,
      slug,
      html: marked.parse(content),
      readMinutes,
      dateObj: new Date(dateStr + "T00:00:00"),
    };
  });
 
  posts.sort((a, b) => b.dateObj - a.dateObj);
  return posts;
}
 
function formatDate(dateObj) {
  return dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
 
function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
 
// ---------- layout ----------
 
function layout({ title, description, activeCategory, bodyHtml, depth }) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const navItems = [
    { key: "all", label: "All", href: `${prefix}index.html` },
    ...Object.entries(site.categories).map(([key, c]) => ({
      key,
      label: c.label,
      href: `${prefix}tags/${key}.html`,
    })),
  ];
 
  const nav = navItems
    .map((item) => {
      const isActive = item.key === (activeCategory || "all");
      return `<a class="nav-pill${isActive ? " is-active" : ""}" href="${item.href}">${esc(item.label)}</a>`;
    })
    .join("\n");
 
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || site.tagline)}" />
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="${prefix}feed.xml" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}css/style.css" />
</head>
<body>
<header class="masthead">
  <a class="wordmark" href="${prefix}index.html">${esc(site.title)}</a>
  <p class="tagline">${esc(site.tagline)}</p>
  <nav class="nav">
    ${nav}
    <a class="nav-pill nav-pill--about" href="${prefix}about.html">About</a>
  </nav>
</header>
<hr class="rule" />
<main>
${bodyHtml}
</main>
<footer class="site-footer">
  <hr class="rule" />
  <p>&copy; ${new Date().getFullYear()} ${esc(site.author)}. Built with a static site generator, deployed on GitHub Pages.</p>
</footer>
</body>
</html>`;
}
 
// ---------- post list entry (used on homepage + tag pages) ----------
 
function postEntry(post, depth) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const cat = site.categories[post.category];
  return `<article class="entry">
  <div class="entry-meta">
    <time class="mono" datetime="${post.dateObj.toISOString().slice(0, 10)}">${formatDate(post.dateObj)}</time>
    <span class="chip" style="--chip-color: ${cat.color}">${esc(cat.label)}</span>
  </div>
  <h2 class="entry-title"><a href="${prefix}posts/${post.slug}.html">${esc(post.title)}</a></h2>
  <p class="entry-excerpt">${esc(post.excerpt || "")}</p>
</article>`;
}
 
// ---------- pages ----------
 
function buildIndex(posts) {
  const body = `<div class="entry-list">
${posts.map((p) => postEntry(p, 0)).join("\n")}
</div>`;
  return layout({
    title: site.title,
    description: site.tagline,
    activeCategory: "all",
    bodyHtml: body,
    depth: 0,
  });
}
 
function buildTagPage(categoryKey, posts) {
  const cat = site.categories[categoryKey];
  const filtered = posts.filter((p) => p.category === categoryKey);
  const body = `<h1 class="page-title">${esc(cat.label)}</h1>
<div class="entry-list">
${filtered.map((p) => postEntry(p, 1)).join("\n") || `<p class="empty">No posts in this category yet.</p>`}
</div>`;
  return layout({
    title: `${cat.label} — ${site.title}`,
    description: `${cat.label} posts on ${site.title}`,
    activeCategory: categoryKey,
    bodyHtml: body,
    depth: 1,
  });
}
 
function buildPost(post) {
  const cat = site.categories[post.category];
  const fields = [
    ["Date", formatDate(post.dateObj)],
    ["Category", cat.label],
  ];
  if (post.location) fields.push(["Location", post.location]);
  if (post.status) fields.push(["Status", post.status]);
  fields.push(["Read time", `${post.readMinutes} min`]);
 
  const titleBlock = `<div class="title-block">
${fields
    .map(
      ([label, value]) => `  <div class="title-block-field">
    <span class="title-block-label mono">${esc(label)}</span>
    <span class="title-block-value">${esc(value)}</span>
  </div>`
    )
    .join("\n")}
</div>`;
 
  const body = `<article class="post">
  <h1 class="post-title">${esc(post.title)}</h1>
  ${titleBlock}
  <div class="post-body">
${post.html}
  </div>
  <p class="back-link"><a href="../index.html">&larr; All posts</a></p>
</article>`;
 
  return layout({
    title: `${post.title} — ${site.title}`,
    description: post.excerpt,
    activeCategory: post.category,
    bodyHtml: body,
    depth: 1,
  });
}
 
function buildAbout() {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, "about.md"), "utf8");
  const { data, content } = matter(raw);
  const body = `<article class="post">
  <h1 class="post-title">${esc(data.title || "About")}</h1>
  <div class="post-body">
${marked.parse(content)}
  </div>
</article>`;
  return layout({
    title: `${data.title || "About"} — ${site.title}`,
    description: `About ${site.title}`,
    activeCategory: null,
    bodyHtml: body,
    depth: 0,
  });
}
 
function build404() {
  const body = `<article class="post">
    <h1 class="post-title">Page not found</h1>
    <p>That page doesn't exist. <a href="index.html">Go back home</a>.</p>
  </article>`;
  return layout({ title: `Not found — ${site.title}`, activeCategory: null, bodyHtml: body, depth: 0 });
}
 
function buildFeed(posts) {
  const items = posts
    .slice(0, 20)
    .map(
      (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${site.baseUrl}/posts/${p.slug}.html</link>
    <guid>${site.baseUrl}/posts/${p.slug}.html</guid>
    <pubDate>${p.dateObj.toUTCString()}</pubDate>
    <description>${esc(p.excerpt || "")}</description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${esc(site.title)}</title>
  <link>${site.baseUrl}/index.html</link>
  <description>${esc(site.tagline)}</description>
${items}
</channel>
</rss>`;
}
 
function buildSitemap(posts) {
  const urls = [
    `${site.baseUrl}/index.html`,
    `${site.baseUrl}/about.html`,
    ...Object.keys(site.categories).map((k) => `${site.baseUrl}/tags/${k}.html`),
    ...posts.map((p) => `${site.baseUrl}/posts/${p.slug}.html`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
}
 
// ---------- write files ----------
 
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
 
function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "posts"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "tags"), { recursive: true });
 
  const posts = readPosts();
 
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), buildIndex(posts));
  fs.writeFileSync(path.join(OUT_DIR, "about.html"), buildAbout());
  fs.writeFileSync(path.join(OUT_DIR, "404.html"), build404());
  fs.writeFileSync(path.join(OUT_DIR, "feed.xml"), buildFeed(posts));
  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), buildSitemap(posts));
  fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "");
 
  for (const key of Object.keys(site.categories)) {
    fs.writeFileSync(path.join(OUT_DIR, "tags", `${key}.html`), buildTagPage(key, posts));
  }
 
  for (const post of posts) {
    fs.writeFileSync(path.join(OUT_DIR, "posts", `${post.slug}.html`), buildPost(post));
  }
 
  copyDir(path.join(PUBLIC_DIR, "css"), path.join(OUT_DIR, "css"));
  if (fs.existsSync(path.join(PUBLIC_DIR, "js"))) {
    copyDir(path.join(PUBLIC_DIR, "js"), path.join(OUT_DIR, "js"));
  }
 
  console.log(`Built ${posts.length} post(s) into docs/`);
}
 
main();
