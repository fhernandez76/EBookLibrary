'use strict';
// export-jpeg.js
// Exports every .drawio file in ./diagrams/ to JPEG in ./images/
// Uses the draw.io desktop CLI (Electron headless export)

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DRAWIO  = 'C:\\Program Files\\draw.io\\draw.io.exe';
const DIAG_DIR = path.join(__dirname, 'diagrams');
const IMG_DIR  = path.join(__dirname, 'images');

fs.mkdirSync(IMG_DIR, { recursive: true });

const files = fs.readdirSync(DIAG_DIR)
  .filter(f => f.endsWith('.drawio'))
  .sort();

if (files.length === 0) {
  console.error('No .drawio files found in', DIAG_DIR);
  process.exit(1);
}

console.log(`\nExporting ${files.length} diagrams to JPEG...\n`);

let ok = 0, fail = 0;

for (const file of files) {
  const drawioPath = path.join(DIAG_DIR, file);
  const jpgName    = file.replace('.drawio', '.jpg');
  const jpgPath    = path.join(IMG_DIR, jpgName);

  process.stdout.write(`  ${file.padEnd(48)} → `);

  // Remove stale output if it exists
  if (fs.existsSync(jpgPath)) fs.unlinkSync(jpgPath);

  const result = spawnSync(
    DRAWIO,
    ['--export', '--format', 'jpeg', '--quality', '95', '--output', jpgPath, drawioPath],
    { timeout: 45000, windowsHide: true, encoding: 'utf8' }
  );

  if (fs.existsSync(jpgPath)) {
    const kb = (fs.statSync(jpgPath).size / 1024).toFixed(0);
    console.log(`✓  (${kb} KB)`);
    ok++;
  } else {
    const errMsg = result.stderr || result.error?.message || `exit ${result.status}`;
    console.log(`✗  FAILED — ${errMsg.split('\n')[0]}`);
    fail++;
  }
}

console.log(`\nExport complete: ${ok} succeeded, ${fail} failed.\n`);
if (fail > 0) process.exit(1);
