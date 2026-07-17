import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "docs");

const rootGroups = [
  {
    key: "documentation",
    labels: { en: "Documentation", zh: "文档" },
    items: ["index", "quickstart", "project-structure", "development-standards", "environment"],
  },
  {
    key: "modules",
    labels: { en: "Modules", zh: "模块" },
    items: ["auth", "payments", "email", "admin"],
  },
  {
    key: "guides",
    labels: { en: "Guides", zh: "指南" },
    items: ["deployment", "customization", "troubleshooting"],
  },
];

const moduleDirs = ["auth", "payments", "email", "admin"];
const moduleLabels = {
  auth: { en: "Authentication", zh: "认证" },
  payments: { en: "Payments", zh: "支付" },
  email: { en: "Email", zh: "邮件" },
  admin: { en: "Admin", zh: "管理后台" },
};
const pages = [];
const pagesBySource = new Map();
const pagesById = new Map();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readDoc(relativePath) {
  const raw = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = {};
  let body = raw;

  if (match) {
    body = raw.slice(match[0].length);
    for (const line of match[1].split("\n")) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      frontmatter[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return {
    title: frontmatter.title ?? titleFromPath(relativePath),
    description: frontmatter.description ?? "",
    body,
  };
}

function titleFromPath(relativePath) {
  return path.posix
    .basename(relativePath, ".mdx")
    .replace(/\.zh$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function addPage({ id, lang, source, output, group, moduleDir = null }) {
  if (!fs.existsSync(path.join(rootDir, source))) return;

  const doc = readDoc(source);
  const page = {
    id,
    lang,
    source,
    output,
    group,
    moduleDir,
    title: doc.title,
    description: doc.description,
    body: doc.body,
  };

  pages.push(page);
  pagesBySource.set(source, page);
  pagesById.set(`${lang}:${id}`, page);
}

function localizedSource(name, lang) {
  return lang === "zh" ? `${name}.zh.mdx` : `${name}.mdx`;
}

function localizedOutput(name, lang) {
  if (name === "index") return lang === "zh" ? "zh/index.html" : "index.html";
  return lang === "zh" ? `zh/${name}.html` : `${name}.html`;
}

function localizedModuleSource(moduleDir, name, lang) {
  return lang === "zh" ? `${moduleDir}/${name}.zh.mdx` : `${moduleDir}/${name}.mdx`;
}

function localizedModuleOutput(moduleDir, name, lang) {
  const file = name === "index" ? "index.html" : `${name}.html`;
  return lang === "zh" ? `zh/${moduleDir}/${file}` : `${moduleDir}/${file}`;
}

for (const lang of ["en", "zh"]) {
  for (const group of rootGroups) {
    for (const item of group.items) {
      if (moduleDirs.includes(item)) {
        const meta = readJson(`${item}/meta.json`);
        for (const name of meta.pages) {
          addPage({
            id: `${item}/${name}`,
            lang,
            source: localizedModuleSource(item, name, lang),
            output: localizedModuleOutput(item, name, lang),
            group: group.key,
            moduleDir: item,
          });
        }
      } else {
        addPage({
          id: item,
          lang,
          source: localizedSource(item, lang),
          output: localizedOutput(item, lang),
          group: group.key,
        });
      }
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

for (const page of pages) {
  const html = renderPage(page);
  const outputPath = path.join(outDir, page.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });
fs.writeFileSync(path.join(outDir, "assets/styles.css"), styles());
fs.writeFileSync(path.join(outDir, "404.html"), render404());

verifyGeneratedLinks();

console.log(`Built ${pages.length} pages to docs/.`);

function renderPage(page) {
  const langName = page.lang === "zh" ? "中文" : "English";
  const counterpart = pagesById.get(`${page.lang === "zh" ? "en" : "zh"}:${page.id}`);
  const counterpartHref = counterpart ? relativePageUrl(page.output, counterpart.output) : null;
  const home = relativePageUrl(page.output, page.lang === "zh" ? "zh/index.html" : "index.html");
  const rootHome = relativePageUrl(page.output, "index.html");
  const stylesheet = relativeFileUrl(page.output, "assets/styles.css");
  const article = renderMarkdown(page.body, page);

  return `<!doctype html>
<html lang="${page.lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)} | NimBuild Docs</title>
    <meta name="description" content="${escapeAttr(page.description)}">
    <link rel="stylesheet" href="${stylesheet}">
  </head>
  <body>
    <header class="topbar">
      <a class="brand" href="${rootHome}" aria-label="NimBuild Docs home">
        <span class="brand-mark">N</span>
        <span>NimBuild Docs</span>
      </a>
      <nav class="top-actions" aria-label="Utility navigation">
        <a href="${home}">${langName}</a>
        ${counterpartHref ? `<a href="${counterpartHref}">${page.lang === "zh" ? "English" : "中文"}</a>` : ""}
        <a href="https://github.com/hayley-sun/nimbuild-docs">GitHub</a>
      </nav>
    </header>
    <div class="layout">
      <aside class="sidebar">
        ${renderNav(page)}
      </aside>
      <main class="content">
        <article class="doc">
          <header class="doc-header">
            <p class="eyebrow">${escapeHtml(groupLabel(page.group, page.lang))}</p>
            <h1>${escapeHtml(page.title)}</h1>
            ${page.description ? `<p>${escapeHtml(page.description)}</p>` : ""}
          </header>
          ${article}
        </article>
      </main>
    </div>
  </body>
</html>`;
}

function renderNav(currentPage) {
  return rootGroups
    .map((group) => {
      const links = group.items
        .map((item) => {
          if (moduleDirs.includes(item)) {
            return renderModuleNav(item, currentPage);
          }

          const page = pagesById.get(`${currentPage.lang}:${item}`);
          if (!page) return "";
          return renderNavLink(page, currentPage);
        })
        .filter(Boolean)
        .join("\n");

      return `<section class="nav-section">
        <h2>${escapeHtml(group.labels[currentPage.lang])}</h2>
        ${links}
      </section>`;
    })
    .join("\n");
}

function renderModuleNav(moduleDir, currentPage) {
  const meta = readJson(`${moduleDir}/meta.json`);
  const isOpen = currentPage.moduleDir === moduleDir;
  const links = meta.pages
    .map((name) => pagesById.get(`${currentPage.lang}:${moduleDir}/${name}`))
    .filter(Boolean)
    .map((page) => renderNavLink(page, currentPage))
    .join("\n");

  return `<details class="nav-group" ${isOpen ? "open" : ""}>
    <summary>${escapeHtml(moduleLabels[moduleDir]?.[currentPage.lang] ?? meta.title)}</summary>
    ${links}
  </details>`;
}

function renderNavLink(page, currentPage) {
  const active = page.output === currentPage.output ? " active" : "";
  return `<a class="nav-link${active}" href="${relativePageUrl(currentPage.output, page.output)}">${escapeHtml(page.title)}</a>`;
}

function groupLabel(group, lang) {
  const found = rootGroups.find((item) => item.key === group);
  return found ? found.labels[lang] : "Docs";
}

function renderMarkdown(markdown, page) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(`<pre><code${language ? ` class="language-${escapeAttr(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level}>${renderInline(text, page)}</h${level}>`);
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines, page));
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderTaskOrInline(item, page)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item, page)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^(#{2,6})\s+/.test(lines[i]) &&
      !isTableStart(lines, i) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "), page)}</p>`);
  }

  return html.join("\n");
}

function renderTaskOrInline(raw, page) {
  const task = raw.match(/^\[([ xX])\]\s+(.+)$/);
  if (!task) return renderInline(raw, page);
  const checked = task[1].toLowerCase() === "x" ? " checked" : "";
  return `<label class="task"><input type="checkbox" disabled${checked}> ${renderInline(task[2], page)}</label>`;
}

function isTableStart(lines, index) {
  return (
    lines[index]?.trim().startsWith("|") &&
    lines[index + 1]?.trim().startsWith("|") &&
    splitTableRow(lines[index + 1]).every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
  );
}

function renderTable(lines, page) {
  const header = splitTableRow(lines[0]);
  const body = lines.slice(2).map(splitTableRow);

  return `<div class="table-wrap"><table>
    <thead><tr>${header.map((cell) => `<th>${renderInline(cell.trim(), page)}</th>`).join("")}</tr></thead>
    <tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell.trim(), page)}</td>`).join("")}</tr>`)
      .join("")}</tbody>
  </table></div>`;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
}

function renderInline(raw, page) {
  let html = escapeHtml(raw);

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    return `<a href="${escapeAttr(resolveLink(href, page))}">${label}</a>`;
  });

  return html;
}

function resolveLink(href, page) {
  if (/^(https?:|mailto:|tel:)/.test(href) || href.startsWith("#")) return href;

  const [linkPath, hash = ""] = href.split("#");
  if (!linkPath) return `#${hash}`;

  const sourceDir = path.posix.dirname(page.source);
  const normalized = path.posix.normalize(path.posix.join(sourceDir === "." ? "" : sourceDir, linkPath));
  const withoutExt = normalized.replace(/\.mdx$/, "");
  const candidates = page.lang === "zh"
    ? [`${withoutExt}.zh.mdx`, `${withoutExt}/index.zh.mdx`, `${withoutExt}.mdx`, `${withoutExt}/index.mdx`]
    : [`${withoutExt}.mdx`, `${withoutExt}/index.mdx`, `${withoutExt}.zh.mdx`, `${withoutExt}/index.zh.mdx`];

  const target = candidates.map((candidate) => pagesBySource.get(candidate)).find(Boolean);
  if (!target) return href;

  const suffix = hash ? `#${hash}` : "";
  return `${relativePageUrl(page.output, target.output)}${suffix}`;
}

function relativePageUrl(fromOutput, toOutput) {
  const fromDir = path.posix.dirname(fromOutput);
  const targetIsIndex = path.posix.basename(toOutput) === "index.html";
  const target = targetIsIndex ? path.posix.dirname(toOutput) : toOutput;
  let relative = path.posix.relative(fromDir, target);

  if (!relative) return "./";
  if (targetIsIndex) relative = `${relative}/`;
  return relative;
}

function relativeFileUrl(fromOutput, toOutput) {
  const fromDir = path.posix.dirname(fromOutput);
  const relative = path.posix.relative(fromDir, toOutput);
  return relative || path.posix.basename(toOutput);
}

function render404() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found | NimBuild Docs</title>
    <link rel="stylesheet" href="assets/styles.css">
  </head>
  <body class="not-found">
    <main class="not-found-panel">
      <p class="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The requested documentation page does not exist.</p>
      <a class="button" href="./">Back to documentation</a>
    </main>
  </body>
</html>`;
}

function verifyGeneratedLinks() {
  const errors = [];
  const generatedHtml = listFiles(outDir).filter((file) => file.endsWith(".html"));

  for (const file of generatedHtml) {
    const html = fs.readFileSync(file, "utf8");
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

    for (const href of hrefs) {
      if (/^(https?:|mailto:|tel:)/.test(href) || href.startsWith("#")) continue;
      const [linkPath] = href.split("#");
      if (!linkPath || linkPath.endsWith(".css")) continue;

      const absolute = path.resolve(path.dirname(file), linkPath);
      const target = fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()
        ? path.join(absolute, "index.html")
        : absolute;

      if (!fs.existsSync(target)) {
        errors.push(`${path.relative(outDir, file)} -> ${href}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Broken generated links:\n${errors.join("\n")}`);
  }
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function styles() {
  return `:root {
  color-scheme: light;
  --bg: #f8fafc;
  --panel: #ffffff;
  --text: #172033;
  --muted: #5d6b82;
  --line: #dbe3ee;
  --soft: #edf3f8;
  --accent: #0f766e;
  --accent-strong: #0b5f59;
  --code-bg: #111827;
  --code-text: #e5edf6;
}

* {
  box-sizing: border-box;
}

html {
  scroll-padding-top: 88px;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.65;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-strong);
  text-decoration: underline;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
}

.brand,
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  color: var(--text);
  font-weight: 700;
}

.brand:hover {
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 800;
}

.top-actions a {
  border-radius: 7px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
}

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  max-width: 1320px;
  margin: 0 auto;
}

.sidebar {
  position: sticky;
  top: 64px;
  align-self: start;
  height: calc(100vh - 64px);
  overflow: auto;
  padding: 28px 20px 40px;
  border-right: 1px solid var(--line);
}

.nav-section + .nav-section {
  margin-top: 24px;
}

.nav-section h2 {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.nav-link,
.nav-group summary {
  display: block;
  width: 100%;
  border-radius: 7px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}

.nav-link {
  padding: 8px 10px;
}

.nav-group summary {
  cursor: pointer;
  padding: 8px 10px;
}

.nav-group .nav-link {
  margin-left: 10px;
  padding-left: 14px;
  border-left: 1px solid var(--line);
}

.nav-link:hover,
.nav-group summary:hover,
.nav-link.active {
  background: var(--soft);
  color: var(--text);
  text-decoration: none;
}

.content {
  min-width: 0;
  padding: 42px 36px 72px;
}

.doc {
  max-width: 860px;
  margin: 0 auto;
}

.doc-header {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 1.7em 0 0.55em;
  color: var(--text);
  line-height: 1.2;
  letter-spacing: 0;
}

.doc-header h1 {
  margin: 0 0 10px;
  font-size: 42px;
}

.doc-header p:last-child {
  max-width: 720px;
  margin: 0;
  color: var(--muted);
  font-size: 18px;
}

h2 {
  font-size: 28px;
}

h3 {
  font-size: 21px;
}

p,
ul,
ol,
pre,
.table-wrap {
  margin: 0 0 18px;
}

ul,
ol {
  padding-left: 24px;
}

li + li {
  margin-top: 6px;
}

code {
  border-radius: 5px;
  background: var(--soft);
  color: #24364f;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.92em;
  padding: 0.12em 0.35em;
}

pre {
  overflow: auto;
  border-radius: 8px;
  background: var(--code-bg);
  color: var(--code-text);
  padding: 18px;
}

pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}

th {
  background: var(--soft);
  font-size: 13px;
}

tr:last-child td {
  border-bottom: 0;
}

.task {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.not-found {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
}

.not-found-panel {
  max-width: 520px;
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}

.button {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 7px;
  background: var(--accent);
  color: white;
  font-weight: 700;
}

.button:hover {
  background: var(--accent-strong);
  color: white;
  text-decoration: none;
}

@media (max-width: 860px) {
  .topbar {
    position: static;
    flex-wrap: wrap;
    padding: 14px 18px;
  }

  .layout {
    display: block;
  }

  .sidebar {
    position: static;
    height: auto;
    padding: 18px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .content {
    padding: 30px 18px 56px;
  }

  .doc-header h1 {
    font-size: 34px;
  }
}
`;
}
