#!/usr/bin/env node
/**
 * build-book.js  —  EBook Library Book Edition builder
 * =====================================================
 * Combines the manuscript files in `book/src/` (in the order declared in
 * `MANUSCRIPT` below) into a single Markdown stream, then runs pandoc to
 * produce three artifacts in `book/dist/`:
 *
 *   EBookLibrary-Training-Guide-v2.docx   (always)
 *   EBookLibrary-Training-Guide-v2.epub   (always)
 *   EBookLibrary-Training-Guide-v2.pdf    (only if a PDF engine is found)
 *
 * Usage:
 *   node build-book.js                # build all available artifacts
 *   node build-book.js --docx-only    # skip EPUB and PDF
 *   node build-book.js --no-pdf       # skip the PDF attempt even if engine found
 *
 * Pre-requisites:
 *   - pandoc on PATH (verified)
 *   - node + adm-zip + mermaid-filter (npm install in this folder)
 *   - For PDF: weasyprint (Python) WITH the GTK runtime installed,
 *     OR xelatex on PATH. If neither is present, PDF is skipped with a hint.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Manuscript order ─────────────────────────────────────────────────────────
// Files relative to book/src/. Missing files are skipped with a warning.
const MANUSCRIPT = [
  // Front matter
  'frontmatter/00-cover.md',
  'frontmatter/01-copyright.md',
  'frontmatter/02-preface.md',
  'frontmatter/03-about-author.md',
  'frontmatter/04-conventions.md',
  'frontmatter/05-acknowledgments.md',
  // Part I — Foundations
  'part-1-foundations/00-part-cover.md',
  'part-1-foundations/01-introduction.md',
  'part-1-foundations/02-architecture-deep-dive.md',
  'part-1-foundations/03-solution-setup.md',
  // Part II — Implementation
  'part-2-implementation/00-part-cover.md',
  'part-2-implementation/04-domain-layer.md',
  'part-2-implementation/05-application-layer.md',
  'part-2-implementation/06-infrastructure-layer.md',
  'part-2-implementation/07-web-api.md',
  'part-2-implementation/08-authentication.md',
  'part-2-implementation/09-database-migrations.md',
  'part-2-implementation/10-react-frontend.md',
  'part-2-implementation/11-blazor-frontend.md',
  // Part III — Architecture & Scale
  'part-3-architecture-scale/00-part-cover.md',
  'part-3-architecture-scale/12-unit-tests.md',
  'part-3-architecture-scale/13-e2e-tests.md',
  'part-3-architecture-scale/14-ai-assisted-dev.md',
  'part-3-architecture-scale/15-deployment-operations.md',
  // Back matter
  'backmatter/A-api-reference.md',
  'backmatter/B-exercises.md',
  'backmatter/C-architecture-decision-records.md',
  'backmatter/D-glossary.md',
  'backmatter/E-bibliography.md',
  'backmatter/F-index.md',
];

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT          = __dirname;
const SRC_DIR       = path.join(ROOT, 'src');
const ASSETS_DIR    = path.join(ROOT, 'assets');
const STYLES_DIR    = path.join(ASSETS_DIR, 'styles');
const FIGURES_DIR   = path.join(ASSETS_DIR, 'figures');
const TMP_DIR       = path.join(ROOT, 'tmp');
const DIST_DIR      = path.join(ROOT, 'dist');

const COMBINED_MD   = path.join(TMP_DIR, '_book.md');
const REFERENCE_DOCX = path.join(STYLES_DIR, 'reference.docx');
const CALLOUTS_LUA  = path.join(STYLES_DIR, 'callouts.lua');
const EPUB_CSS      = path.join(STYLES_DIR, 'epub.css');
const CREATE_REF_JS = path.join(STYLES_DIR, 'create-reference.js');

const BASE_NAME     = 'EBookLibrary-Training-Guide-v2';
const OUT_DOCX      = path.join(DIST_DIR, `${BASE_NAME}.docx`);
const OUT_EPUB      = path.join(DIST_DIR, `${BASE_NAME}.epub`);
const OUT_PDF       = path.join(DIST_DIR, `${BASE_NAME}.pdf`);

// ─── Args ────────────────────────────────────────────────────────────────────
const args      = new Set(process.argv.slice(2));
const DOCX_ONLY = args.has('--docx-only');
const NO_PDF    = args.has('--no-pdf') || DOCX_ONLY;
const NO_EPUB   = DOCX_ONLY;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const log   = (m) => console.log(`[build-book] ${m}`);
const warn  = (m) => console.warn(`[build-book] WARN: ${m}`);
const error = (m) => console.error(`[build-book] ERROR: ${m}`);

function findOnPath(name) {
  const w = spawnSync('where', [name], { encoding: 'utf8', timeout: 5000 });
  if (w.status === 0 && w.stdout && w.stdout.trim()) {
    return w.stdout.trim().split(/\r?\n/)[0].trim();
  }
  return null;
}

function findPandoc() {
  return findOnPath('pandoc') ||
    (process.env.LOCALAPPDATA && [
      path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe'),
    ].find(p => p && fs.existsSync(p))) ||
    (fs.existsSync('C:\\Program Files\\Pandoc\\pandoc.exe')
      ? 'C:\\Program Files\\Pandoc\\pandoc.exe' : null);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ensureReferenceDocx(pandocBin) {
  if (fs.existsSync(REFERENCE_DOCX)) {
    log(`reference.docx present ✓`);
    return;
  }
  log(`reference.docx not found — generating...`);
  const r = spawnSync(process.execPath, [CREATE_REF_JS], {
    encoding: 'utf8', stdio: 'inherit',
  });
  if (r.status !== 0) { error('Failed to generate reference.docx'); process.exit(1); }
}

// ─── YAML metadata block (cover + ebook metadata) ────────────────────────────
const YAML_FRONTMATTER = `---
title: "EBook Library"
subtitle: "Full-Stack Engineering with .NET 10, React, and Blazor — Book Edition"
author:
  - "Francisco Hernandez"
date: "Edition 1.0 · 2026"
publisher: "EBook Library Press"
rights: "© 2026 Francisco Hernandez. All rights reserved."
subject: "Full-Stack Software Engineering"
description: "A book-form treatment of the EBook Library project: Clean Architecture, CQRS, EF Core, JWT, React 18, Blazor WASM, testing, and deployment."
keywords:
  - .NET 10
  - C# 14
  - ASP.NET Core
  - Clean Architecture
  - CQRS
  - Entity Framework Core
  - JWT
  - React 18
  - Blazor WebAssembly
  - Playwright
lang: en-US
toc-title: "Contents"
---

`;

// ─── Combine sources ─────────────────────────────────────────────────────────
function combineManuscript() {
  log('Combining manuscript chapters...');
  const parts = [YAML_FRONTMATTER];
  let included = 0;
  let missing  = 0;

  for (const rel of MANUSCRIPT) {
    const abs = path.join(SRC_DIR, rel);
    if (!fs.existsSync(abs)) {
      warn(`  skip (missing): ${rel}`);
      missing++;
      continue;
    }
    parts.push(fs.readFileSync(abs, 'utf8'));
    parts.push('\n\n\\newpage\n\n');
    log(`  ✓  ${rel}`);
    included++;
  }

  ensureDir(TMP_DIR);
  fs.writeFileSync(COMBINED_MD, parts.join('\n'), 'utf8');
  log(`Wrote ${COMBINED_MD} (${included} files, ${missing} missing)`);
  if (included === 0) {
    error('No manuscript files found. Add at least one file to book/src/.');
    process.exit(1);
  }
  return COMBINED_MD;
}

// ─── Pandoc invocations ──────────────────────────────────────────────────────
function commonPandocArgs() {
  return [
    '-f', 'markdown+yaml_metadata_block+smart+pipe_tables+fenced_code_attributes+implicit_figures',
    '--lua-filter', CALLOUTS_LUA,
    '--toc',
    '--toc-depth=2',
    '--syntax-highlighting=tango',
    '--wrap=none',
    '--columns=100',
    '--resource-path', `.;${SRC_DIR};${FIGURES_DIR};${ASSETS_DIR}`,
  ];
}

function buildDocx(pandocBin, mdPath) {
  log('→ DOCX (pandoc + reference.docx + callouts.lua)');
  const args = [
    mdPath,
    '-o', OUT_DOCX,
    '--reference-doc', REFERENCE_DOCX,
    ...commonPandocArgs(),
  ];
  const r = spawnSync(pandocBin, args, { encoding: 'utf8', stdio: 'pipe' });
  if (r.status !== 0) { error(`pandoc DOCX failed:\n${r.stderr}`); return false; }
  log(`✓ ${OUT_DOCX}`);
  return true;
}

function buildEpub(pandocBin, mdPath) {
  log('→ EPUB');
  const args = [
    mdPath,
    '-o', OUT_EPUB,
    '--css', EPUB_CSS,
    '--epub-title-page=true',
    ...commonPandocArgs(),
  ];
  const r = spawnSync(pandocBin, args, { encoding: 'utf8', stdio: 'pipe' });
  if (r.status !== 0) { error(`pandoc EPUB failed:\n${r.stderr}`); return false; }
  log(`✓ ${OUT_EPUB}`);
  return true;
}

function buildPdf(pandocBin, mdPath) {
  // Prefer xelatex (if installed); else weasyprint; else skip with hint.
  const xelatex    = findOnPath('xelatex');
  const weasyprint = findOnPath('weasyprint');

  let engineFlag = null;
  if (xelatex)        engineFlag = ['--pdf-engine=xelatex'];
  else if (weasyprint) engineFlag = ['--pdf-engine=weasyprint'];

  if (!engineFlag) {
    warn('No PDF engine found (xelatex / weasyprint).');
    warn('  Skipping PDF.  Easiest path on Windows:');
    warn('    1. Open the generated DOCX in Word.');
    warn('    2. File ▸ Save As ▸ PDF.');
    warn('  Or install xelatex (TeX Live / MiKTeX) or weasyprint+GTK.');
    return false;
  }

  log(`→ PDF via ${engineFlag[0].split('=')[1]}`);
  const args = [
    mdPath,
    '-o', OUT_PDF,
    ...engineFlag,
    '-V', 'geometry:letterpaper',
    '-V', 'geometry:margin=1in',
    '-V', 'mainfont=Cambria',
    '-V', 'sansfont=Calibri',
    '-V', 'monofont=Consolas',
    '-V', 'colorlinks=true',
    '-V', 'linkcolor=NavyBlue',
    ...commonPandocArgs(),
  ];
  const r = spawnSync(pandocBin, args, { encoding: 'utf8', stdio: 'pipe' });
  if (r.status !== 0) { error(`pandoc PDF failed:\n${r.stderr}`); return false; }
  log(`✓ ${OUT_PDF}`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const pandocBin = findPandoc();
  if (!pandocBin) { error('pandoc not found on PATH.'); process.exit(1); }
  log(`Using pandoc: ${pandocBin}`);

  ensureDir(TMP_DIR);
  ensureDir(DIST_DIR);
  ensureReferenceDocx(pandocBin);

  const md = combineManuscript();

  const results = {
    docx: buildDocx(pandocBin, md),
    epub: NO_EPUB ? null : buildEpub(pandocBin, md),
    pdf:  NO_PDF  ? null : buildPdf(pandocBin, md),
  };

  log('───── Summary ─────');
  for (const [k, v] of Object.entries(results)) {
    const sym = v === true ? '✓' : v === false ? '✗' : '○ (skipped)';
    log(`  ${sym}  ${k.toUpperCase()}`);
  }
  if (results.docx === false) process.exit(1);
}

main();
