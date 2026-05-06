#!/usr/bin/env node
/**
 * generate-training-docx.js
 *
 * Combines all Training/ Markdown chapters into a single DOCX file.
 *
 * Usage:
 *   node generate-training-docx.js
 *
 * Output:
 *   Training/EBookLibrary-Training-Guide.docx
 *
 * Strategy:
 *   1. Check if pandoc is installed → use it (best quality, handles Mermaid as code blocks)
 *   2. Fallback → use the 'docx' npm package to generate from Markdown
 */

const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ─── Chapter order ────────────────────────────────────────────────────────────
const CHAPTERS = [
  'README.md',
  '00-INTRODUCTION.md',
  '01-ARCHITECTURE-DEEP-DIVE.md',
  '02-SOLUTION-SETUP.md',
  '03-DOMAIN-LAYER.md',
  '04-APPLICATION-LAYER.md',
  '05-INFRASTRUCTURE-LAYER.md',
  '06-WEBAPI-LAYER.md',
  '07-AUTHENTICATION.md',
  '08-DATABASE-MIGRATIONS.md',
  '09-REACT-FRONTEND.md',
  '10-BLAZOR-FRONTEND.md',
  '11-UNIT-TESTS.md',
  '12-E2E-TESTS.md',
  '13-COPILOT-COMPARISON.md',
  '14-DEPLOYMENT-CHECKLIST.md',
  'APPENDIX-A-API-REFERENCE.md',
  'APPENDIX-B-EXERCISES.md',
];

const TRAINING_DIR    = __dirname;
const ASSETS_DIR      = path.join(TRAINING_DIR, 'assets');
const OUTPUT_FILE     = path.join(TRAINING_DIR, 'EBookLibrary-Training-Guide.docx');
const COMBINED_MD     = path.join(TRAINING_DIR, '_combined.md');
const REFERENCE_DOCX  = path.join(ASSETS_DIR, 'reference.docx');
const LUA_FILTER      = path.join(ASSETS_DIR, 'callouts.lua');
const CREATE_REF_JS   = path.join(ASSETS_DIR, 'create-reference.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg)  { console.log(`[generate-training-docx] ${msg}`); }
function error(msg){ console.error(`[generate-training-docx] ERROR: ${msg}`); }

// Resolve pandoc path: use `where.exe` first, then check known locations with fs.existsSync
function findPandoc() {
  // 1. Ask Windows where.exe — works if pandoc is on PATH
  const w = spawnSync('where', ['pandoc'], { encoding: 'utf8', timeout: 5000, shell: false });
  if (w.status === 0 && w.stdout && w.stdout.trim()) {
    return w.stdout.trim().split(/\r?\n/)[0].trim();
  }

  // 2. Check known install locations by file existence (no exec needed)
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe'),
    process.env.APPDATA       && path.join(process.env.APPDATA,      'Pandoc', 'pandoc.exe'),
    'C:\\Program Files\\Pandoc\\pandoc.exe',
    'C:\\Program Files (x86)\\Pandoc\\pandoc.exe',
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function isPandocAvailable() {
  return findPandoc() !== null;
}

// ─── YAML frontmatter (cover page metadata) ──────────────────────────────────
const YAML_FRONTMATTER = `---
title: "EBook Library"
subtitle: "Full-Stack Training Guide — .NET 10 · React · Blazor"
author: "Francisco Hernandez\\nSoftware Engineering Manager"
date: "2026  ·  Version 1.0"
subject: "Full-Stack Software Development"
keywords: [".NET 10", "C#", "React 18", "Blazor WebAssembly", "Clean Architecture", "CQRS", "Entity Framework", "JWT"]
lang: en-US
toc-title: "Table of Contents"
---

`;

// ─── Ensure reference.docx exists ────────────────────────────────────────────
function ensureReferenceDocx() {
  if (!fs.existsSync(REFERENCE_DOCX)) {
    log('reference.docx not found — generating from create-reference.js...');
    const result = spawnSync(process.execPath, [CREATE_REF_JS], { encoding: 'utf8', stdio: 'inherit' });
    if (result.status !== 0) {
      error('Failed to generate reference.docx');
      process.exit(1);
    }
  } else {
    log('reference.docx already exists ✓');
  }
}

function combineMarkdown() {
  log('Combining Markdown chapters...');
  const parts = [YAML_FRONTMATTER];

  for (const chapter of CHAPTERS) {
    const filePath = path.join(TRAINING_DIR, chapter);
    if (!fs.existsSync(filePath)) {
      log(`  ⚠  Skipping missing file: ${chapter}`);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    // Add a page-break comment between chapters (pandoc respects \newpage)
    parts.push(content);
    parts.push('\n\n\\newpage\n\n');
    log(`  ✓  ${chapter}`);
  }

  const combined = parts.join('\n');
  fs.writeFileSync(COMBINED_MD, combined, 'utf8');
  log(`Combined ${parts.length - 1} chapters into _combined.md (+ YAML cover metadata)`);
  return COMBINED_MD;
}

// ─── Strategy 1: pandoc ───────────────────────────────────────────────────────
function generateWithPandoc(combinedMdPath) {
  const pandocBin = findPandoc();
  log(`Generating DOCX with pandoc (${pandocBin})...`);

  const pandocArgs = [
    combinedMdPath,
    '-o', OUTPUT_FILE,
    '-f', 'markdown+yaml_metadata_block+smart+pipe_tables+fenced_code_attributes',
    '--reference-doc', REFERENCE_DOCX,   // Custom Word styles template
    '--lua-filter',    LUA_FILTER,       // Callout box transformer
    '--toc',                             // Table of contents
    '--toc-depth=2',                     // TOC depth
    '--syntax-highlighting=tango',       // Code block highlighting
    '--wrap=none',                       // Don't rewrap long lines
    '--columns=100',                     // Soft column limit for code
  ];

  const result = spawnSync(pandocBin, pandocArgs, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    error('pandoc failed:');
    error(result.stderr);
    return false;
  }

  log(`✓ DOCX generated with pandoc: ${OUTPUT_FILE}`);
  return true;
}

// ─── Strategy 2: docx npm package ────────────────────────────────────────────
async function generateWithDocxPackage() {
  log('pandoc not found. Using docx npm package as fallback...');

  // Check if docx is installed
  let Document, Paragraph, TextRun, HeadingLevel, Packer;
  try {
    const docxModule = require('docx');
    ({ Document, Paragraph, TextRun, HeadingLevel, Packer } = docxModule);
  } catch {
    error('"docx" npm package is not installed.');
    error('Install it with: npm install docx');
    error('Or install pandoc: https://pandoc.org/installing.html');
    return false;
  }

  log('Building DOCX document from combined Markdown...');

  const combined = fs.readFileSync(COMBINED_MD, 'utf8');
  const lines = combined.split('\n');
  const children = [];

  let inCodeBlock = false;
  let codeLines = [];

  for (const line of lines) {
    // Code block detection
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        // End of code block — add as monospace paragraph
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeLines.join('\n'),
                font: 'Courier New',
                size: 18,
              }),
            ],
            shading: { type: 'clear', color: 'auto', fill: 'F5F5F5' },
          })
        );
        inCodeBlock = false;
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.slice(2),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.slice(4),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.trim() === '\\newpage') {
      // Page break
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ children: [] }));
    } else {
      // Regular paragraph — strip basic Markdown inline formatting
      const text = line
        .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
        .replace(/\*(.+?)\*/g, '$1')          // italic
        .replace(/`(.+?)`/g, '$1')            // inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // links

      children.push(new Paragraph({
        children: [new TextRun({ text })],
      }));
    }
  }

  const doc = new Document({
    creator: 'EBookLibrary Training Guide Generator',
    title: 'EBook Library — Full-Stack Training Guide',
    description: 'A step-by-step guide to building a full-stack .NET + React + Blazor application',
    sections: [{ children }],
  });

  // Packer.toBuffer returns a Promise in docx v7+
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);
  log(`✓ DOCX generated with docx package: ${OUTPUT_FILE}`);
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('=== EBook Library Training Guide — DOCX Generator ===');
  log(`Output: ${OUTPUT_FILE}`);

  // Step 1: Ensure the Word style template (reference.docx) exists
  if (isPandocAvailable()) ensureReferenceDocx();

  // Step 2: Combine all chapters into a single Markdown file
  const combinedPath = combineMarkdown();

  // Step 3: Try pandoc first, then fall back to docx package
  let success = false;
  if (isPandocAvailable()) {
    success = generateWithPandoc(combinedPath);
  } else {
    success = await generateWithDocxPackage();
  }

  // Step 3: Cleanup temporary file
  if (fs.existsSync(COMBINED_MD)) {
    fs.unlinkSync(COMBINED_MD);
    log('Cleaned up _combined.md');
  }

  if (success) {
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    log(`\n✅ Done! Output: ${OUTPUT_FILE} (${sizeMb} MB)`);
  } else {
    error('\n❌ DOCX generation failed. See errors above.');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
