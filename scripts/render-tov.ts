// Bouw een self-contained HTML van .claude/docs/tone-of-voice.md
// Server-side markdown → HTML, geen runtime-JS-dependencies, Dicteren.ai branding.

import { marked } from "marked";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MD_PATH = join(ROOT, ".claude/docs/tone-of-voice.md");
const OUT_PATH = join(ROOT, ".claude/docs/tone-of-voice.html");

const md = readFileSync(MD_PATH, "utf8");

marked.setOptions({ gfm: true, breaks: false });

let rendered = marked.parse(md) as string;

// Geef alle h2's een ID voor TOC-anchors
const headings: { id: string; text: string }[] = [];
rendered = rendered.replace(/<h2>(.*?)<\/h2>/g, (_m, text) => {
  const id = "sec-" + (headings.length + 1);
  headings.push({ id, text: text.replace(/<[^>]+>/g, "") });
  return `<h2 id="${id}">${text}</h2>`;
});

// Tag goede/foute voorbeeld-blockquotes (zoek in HTML)
rendered = rendered.replace(
  /<p><strong>Goed:?<\/strong>[^<]*<\/p>\s*<blockquote>/g,
  (m) => m.replace("<blockquote>", '<blockquote class="good">'),
);
rendered = rendered.replace(
  /<p><strong>Fout:?<\/strong>[^<]*<\/p>\s*<blockquote>/g,
  (m) => m.replace("<blockquote>", '<blockquote class="bad">'),
);
rendered = rendered.replace(
  /<p><strong>Voorbeeld goed:?<\/strong><\/p>\s*<blockquote>/g,
  (m) => m.replace("<blockquote>", '<blockquote class="good">'),
);
rendered = rendered.replace(
  /<p><strong>Voorbeeld fout:?<\/strong><\/p>\s*<blockquote>/g,
  (m) => m.replace("<blockquote>", '<blockquote class="bad">'),
);

// EINDE-blokken: paragraphs met "niet doen, niet doen" of "EINDE —" wrappen
rendered = rendered.replace(
  /(<p><strong>Niet doen[^<]*<\/strong><\/p>)/gi,
  '<div class="reminder">$1</div>',
);

const toc = headings
  .map(
    (h) =>
      `<li><a href="#${h.id}" data-target="${h.id}">${h.text}</a></li>`,
  )
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tone of Voice — Dicteren.ai</title>
<style>
  :root {
    --navy: #042660;
    --navy-700: #0b3478;
    --navy-500: #2B5299;
    --aqua: #8BE1E5;
    --aqua-200: #c4eef0;
    --aqua-50: #e8f8f9;
    --orange: #FF8441;
    --orange-600: #ec6c1f;
    --orange-50: #fff1e7;
    --green: #00B884;
    --green-50: #e3f7f0;
    --red: #E5484D;
    --red-50: #fdecec;
    --bg: #F7FBFD;
    --bg-deep: #EAF3FB;
    --surface: #ffffff;
    --border: #d6e3ef;
    --border-soft: #e8eef5;
    --text: #1a1f33;
    --text-muted: #5a6478;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px; line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  .topbar {
    background: var(--navy); color: #fff;
    padding: 16px 32px;
    display: flex; align-items: center; gap: 16px;
    position: sticky; top: 0; z-index: 50;
  }
  .topbar .brand { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .topbar .brand-dot { color: var(--orange); }
  .topbar .tag {
    background: rgba(139, 225, 229, 0.18);
    color: var(--aqua);
    border: 1px solid rgba(139, 225, 229, 0.32);
    font-size: 11px; font-weight: 700;
    padding: 4px 10px; border-radius: 999px;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .topbar .subtitle {
    margin-left: auto; font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }
  .layout {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    max-width: 1280px; margin: 0 auto;
    gap: 40px; padding: 40px 32px 80px;
  }
  aside.toc {
    position: sticky; top: 80px;
    align-self: start;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
  aside.toc .toc-title {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--text-muted); margin-bottom: 12px;
  }
  aside.toc ul { list-style: none; padding: 0; margin: 0; }
  aside.toc a {
    display: block;
    padding: 6px 12px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 13px; font-weight: 500;
    border-left: 2px solid transparent;
    line-height: 1.45;
    transition: all 120ms ease;
  }
  aside.toc a:hover {
    color: var(--navy);
    background: var(--aqua-50);
    border-left-color: var(--aqua);
  }
  article {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 20px;
    padding: 56px 64px;
    box-shadow: 0 1px 3px rgba(4, 38, 96, 0.04), 0 8px 32px rgba(4, 38, 96, 0.04);
    overflow-wrap: break-word;
  }
  article h1 {
    font-size: 40px; font-weight: 700;
    color: var(--navy);
    line-height: 1.15; letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  article h2 {
    font-size: 28px; font-weight: 700;
    color: var(--navy);
    line-height: 1.2; letter-spacing: -0.015em;
    margin: 56px 0 16px;
    border-top: 1px solid var(--border-soft);
    padding-top: 32px;
  }
  article h2:first-of-type { border-top: 0; padding-top: 0; }
  article h3 {
    font-size: 19px; font-weight: 700;
    color: var(--navy);
    line-height: 1.3; margin: 32px 0 8px;
  }
  article h4 {
    font-size: 14px; font-weight: 700;
    color: var(--navy);
    margin: 20px 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  article p { margin: 0 0 16px; }
  article strong { color: var(--navy); font-weight: 700; }
  article a {
    color: var(--navy-500);
    text-decoration: none;
    border-bottom: 1px solid var(--aqua);
  }
  article a:hover { color: var(--orange-600); border-bottom-color: var(--orange); }
  article ul, article ol { margin: 0 0 20px; padding-left: 28px; }
  article li { margin-bottom: 6px; }
  article li::marker { color: var(--orange); }
  article code {
    background: var(--bg-deep);
    color: var(--navy);
    padding: 2px 6px; border-radius: 4px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 13.5px;
  }
  article pre {
    background: var(--navy);
    color: #e8f0fb;
    padding: 20px 24px;
    border-radius: 12px;
    overflow-x: auto;
    line-height: 1.55; font-size: 14px;
    margin: 16px 0 24px;
    box-shadow: 0 4px 12px rgba(4, 38, 96, 0.1);
  }
  article pre code { background: transparent; color: inherit; padding: 0; }
  article blockquote {
    margin: 0 0 20px;
    padding: 16px 24px;
    background: var(--aqua-50);
    border-left: 4px solid var(--aqua);
    border-radius: 8px;
  }
  article blockquote p:last-child { margin-bottom: 0; }
  article blockquote.good {
    background: var(--green-50);
    border-left-color: var(--green);
  }
  article blockquote.bad {
    background: var(--red-50);
    border-left-color: var(--red);
  }
  article table {
    width: 100%; border-collapse: collapse;
    margin: 16px 0 28px;
    border-radius: 10px; overflow: hidden;
    box-shadow: 0 0 0 1px var(--border);
  }
  article thead { background: var(--aqua-50); }
  article th {
    padding: 12px 16px; text-align: left;
    font-weight: 700; font-size: 13px;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--border);
  }
  article td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-soft);
    font-size: 15px; vertical-align: top;
  }
  article tbody tr:last-child td { border-bottom: 0; }
  article tbody tr:hover { background: var(--aqua-50); }
  article hr { border: 0; border-top: 1px solid var(--border-soft); margin: 40px 0; }
  article .reminder {
    background: var(--orange-50);
    border: 2px solid var(--orange);
    padding: 16px 20px;
    border-radius: 10px;
    margin: 16px 0 20px;
  }
  article .reminder p { margin: 0; color: #7a2e04; font-weight: 600; }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; gap: 24px; padding: 24px 16px; }
    aside.toc {
      position: static; max-height: none;
      background: var(--surface);
      border: 1px solid var(--border-soft);
      border-radius: 12px; padding: 16px;
    }
    article { padding: 32px 24px; border-radius: 12px; }
    article h1 { font-size: 28px; }
    article h2 { font-size: 22px; }
    .topbar { padding: 12px 16px; }
    .topbar .subtitle { display: none; }
  }
  @media print {
    body { background: white; }
    .topbar, aside.toc { display: none; }
    .layout { grid-template-columns: 1fr; max-width: 100%; padding: 0; }
    article { box-shadow: none; border: 0; padding: 0; }
  }
</style>
</head>
<body>
<header class="topbar">
  <span class="brand">Dicteren<span class="brand-dot">.ai</span></span>
  <span class="tag">Tone of Voice</span>
  <span class="subtitle">Source of truth voor alle communicatie</span>
</header>
<div class="layout">
  <aside class="toc">
    <div class="toc-title">Hoofdstukken</div>
    <ul>
${toc}
    </ul>
  </aside>
  <article>
${rendered}
  </article>
</div>
</body>
</html>`;

writeFileSync(OUT_PATH, html);
console.log(`✓ HTML klaar: ${OUT_PATH}`);
console.log(`  Bestand: ${(html.length / 1024).toFixed(1)} KB, ${headings.length} hoofdstukken in TOC.`);
