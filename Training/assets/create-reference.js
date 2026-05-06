/**
 * create-reference.js
 *
 * Generates Training/assets/reference.docx by:
 *   1. Getting pandoc's own default reference.docx (binary-safe via execFileSync)
 *   2. Patching word/styles.xml to apply our Navy + Burgundy color scheme
 *   3. Saving the patched DOCX with adm-zip
 *
 * Why this approach: pandoc ignores styles added by third-party DOCX libraries.
 * It only reads styles correctly when the base file was itself produced by pandoc.
 *
 * Color scheme:
 *   Navy     #1a3c7c  (Heading 1, Heading 2, Title, borders)
 *   Burgundy #b0133a  (Heading 3, warning borders, inline code)
 *   Green    #1a7c4a  (Checkpoint callout borders)
 *   Purple   #7c1a7c  (AI-Assisted callout borders)
 */

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');

const ASSETS_DIR     = path.dirname(__filename);
const REFERENCE_DOCX = path.join(ASSETS_DIR, 'reference.docx');

// â”€â”€â”€ Color + size constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  NAVY:     '1a3c7c',
  BURGUNDY: 'b0133a',
  GREEN:    '1a7c4a',
  PURPLE:   '7c1a7c',
  GRAY:     '555555',
  MID_GRAY: '888888',
  BG_CODE:  'F5F5F5',
  BG_TIP:   'EFF4FF',
  BG_WARN:  'FFF0F0',
  BG_CHECK: 'F0FFF4',
  BG_AI:    'F9F0FF',
};

// Font sizes in half-points (pt Ã— 2) â€” Word XML unit
const SZ = {
  TITLE:    72,  // 36pt
  H1:       48,  // 24pt
  H2:       32,  // 16pt
  H3:       26,  // 13pt
  AUTHOR:   26,  // 13pt
  SUBTITLE: 32,  // 16pt
  CODE:     18,  // 9pt
  NORMAL:   22,  // 11pt
};

// â”€â”€â”€ Find pandoc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function findPandoc() {
  const w = spawnSync('where', ['pandoc'], { encoding: 'utf8', timeout: 5000 });
  if (w.status === 0 && w.stdout && w.stdout.trim()) {
    return w.stdout.trim().split(/\r?\n/)[0].trim();
  }
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe'),
    'C:\\Program Files\\Pandoc\\pandoc.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// â”€â”€â”€ XML style patching helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Find the start/end indices of a <w:style> element by styleId. */
function findStyle(xml, styleId) {
  const idAttr = `w:styleId="${styleId}"`;
  const idPos  = xml.indexOf(idAttr);
  if (idPos === -1) return null;
  const start  = xml.lastIndexOf('<w:style', idPos);
  const end    = xml.indexOf('</w:style>', idPos) + '</w:style>'.length;
  return { start, end, block: xml.substring(start, end) };
}

/** Replace (or create) the <w:rPr> section inside a style block. */
function setRpr(styleBlock, props) {
  let rprContent = '';
  if (props.font)    rprContent += `<w:rFonts w:ascii="${props.font}" w:hAnsi="${props.font}" w:cs="${props.font}"/>`;
  if (props.bold)    rprContent += '<w:b/>';
  if (props.italic)  rprContent += '<w:i/>';
  if (props.caps)    rprContent += '<w:caps/>';
  if (props.color)   rprContent += `<w:color w:val="${props.color}"/>`;
  if (props.sz) {
    rprContent += `<w:sz w:val="${props.sz}"/>`;
    rprContent += `<w:szCs w:val="${props.sz}"/>`;
  }
  if (props.noProof) rprContent += '<w:noProof/>';

  const newRpr   = rprContent ? `<w:rPr>${rprContent}</w:rPr>` : '';
  const rprStart = styleBlock.indexOf('<w:rPr>');
  const rprEnd   = styleBlock.indexOf('</w:rPr>');
  if (rprStart !== -1 && rprEnd !== -1) {
    return styleBlock.substring(0, rprStart) + newRpr + styleBlock.substring(rprEnd + '</w:rPr>'.length);
  }
  return styleBlock.replace('</w:style>', newRpr + '\n</w:style>');
}

/** Replace (or create) the <w:pPr> section inside a style block. */
function setPpr(styleBlock, pprContent) {
  const newPpr   = `<w:pPr>${pprContent}</w:pPr>`;
  const pprStart = styleBlock.indexOf('<w:pPr>');
  const pprEnd   = styleBlock.indexOf('</w:pPr>');
  if (pprStart !== -1 && pprEnd !== -1) {
    return styleBlock.substring(0, pprStart) + newPpr + styleBlock.substring(pprEnd + '</w:pPr>'.length);
  }
  const insertBefore = styleBlock.indexOf('<w:rPr>') !== -1 ? '<w:rPr>' : '</w:style>';
  return styleBlock.replace(insertBefore, newPpr + '\n' + insertBefore);
}

/** Patch a named style in the full styles XML string. */
function patchStyle(xml, styleId, rprProps, pprContent) {
  const found = findStyle(xml, styleId);
  if (!found) return xml;
  let block = found.block;
  if (rprProps)             block = setRpr(block, rprProps);
  if (pprContent !== undefined) block = setPpr(block, pprContent);
  return xml.substring(0, found.start) + block + xml.substring(found.end);
}

// â”€â”€â”€ Custom style definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function calloutStyle(id, name, bgColor, borderColor) {
  return `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}">
  <w:name w:val="${name}"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>
    <w:pBdr>
      <w:left w:val="single" w:sz="36" w:space="4" w:color="${borderColor}"/>
    </w:pBdr>
    <w:spacing w:before="80" w:after="80"/>
    <w:ind w:left="360" w:right="180"/>
  </w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
    <w:sz w:val="${SZ.NORMAL}"/>
  </w:rPr>
</w:style>`;
}

const SOURCE_CODE_STYLE = `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="SourceCode">
  <w:name w:val="Source Code"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:shd w:val="clear" w:color="auto" w:fill="${C.BG_CODE}"/>
    <w:pBdr>
      <w:top    w:val="single" w:sz="4" w:space="1" w:color="DDDDDD"/>
      <w:bottom w:val="single" w:sz="4" w:space="1" w:color="DDDDDD"/>
      <w:left   w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
      <w:right  w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
    </w:pBdr>
    <w:spacing w:before="60" w:after="60"/>
    <w:ind w:left="180" w:right="180"/>
  </w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>
    <w:sz w:val="${SZ.CODE}"/>
    <w:szCs w:val="${SZ.CODE}"/>
    <w:noProof/>
  </w:rPr>
</w:style>`;

const VERBATIM_CHAR_STYLE = `
<w:style w:type="character" w:customStyle="1" w:styleId="VerbatimChar">
  <w:name w:val="Verbatim Char"/>
  <w:basedOn w:val="DefaultParagraphFont"/>
  <w:rPr>
    <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>
    <w:color w:val="${C.BURGUNDY}"/>
    <w:sz w:val="${SZ.NORMAL}"/>
    <w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>
  </w:rPr>
</w:style>`;

const BLOCK_TEXT_STYLE = `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="BlockText">
  <w:name w:val="Block Text"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:pBdr>
      <w:left w:val="single" w:sz="24" w:space="8" w:color="${C.NAVY}"/>
    </w:pBdr>
    <w:spacing w:before="80" w:after="80"/>
    <w:ind w:left="360" w:right="180"/>
  </w:pPr>
  <w:rPr>
    <w:i/>
    <w:color w:val="${C.GRAY}"/>
    <w:sz w:val="${SZ.NORMAL}"/>
  </w:rPr>
</w:style>`;

// â”€â”€â”€ Apply all patches to styles XML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function patchStylesXml(xml) {
  // Heading 1: Navy, 24pt, Bold, ALL CAPS, page-break-before, navy bottom rule
  xml = patchStyle(xml, 'Heading1',
    { color: C.NAVY, sz: SZ.H1, bold: true, caps: true },
    `<w:keepNext/><w:pageBreakBefore/>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="${C.NAVY}"/></w:pBdr>` +
    `<w:spacing w:before="240" w:after="160"/><w:outlineLvl w:val="0"/>`
  );

  // Heading 2: Navy, 16pt, Bold
  xml = patchStyle(xml, 'Heading2',
    { color: C.NAVY, sz: SZ.H2, bold: true },
    `<w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/>`
  );

  // Heading 3: Burgundy, 13pt, Bold
  xml = patchStyle(xml, 'Heading3',
    { color: C.BURGUNDY, sz: SZ.H3, bold: true },
    `<w:keepNext/><w:spacing w:before="160" w:after="40"/><w:outlineLvl w:val="2"/>`
  );

  // Title: Navy, 36pt, Bold, Centered
  xml = patchStyle(xml, 'Title',
    { color: C.NAVY, sz: SZ.TITLE, bold: true },
    `<w:jc w:val="center"/><w:spacing w:before="1440" w:after="240"/>`
  );

  // Subtitle: Gray, 16pt, Italic, Centered
  xml = patchStyle(xml, 'Subtitle',
    { color: C.GRAY, sz: SZ.SUBTITLE, italic: true },
    `<w:jc w:val="center"/><w:spacing w:before="0" w:after="160"/>`
  );

  // Author: Navy, 13pt, Bold, Centered
  xml = patchStyle(xml, 'Author',
    { color: C.NAVY, sz: SZ.AUTHOR, bold: true },
    `<w:jc w:val="center"/><w:spacing w:before="480" w:after="80"/>`
  );

  // Date: Mid-gray, 11pt, Centered
  xml = patchStyle(xml, 'Date',
    { color: C.MID_GRAY, sz: SZ.NORMAL },
    `<w:jc w:val="center"/><w:spacing w:before="80" w:after="960"/>`
  );

  // Append custom styles
  const customStyles =
    SOURCE_CODE_STYLE +
    VERBATIM_CHAR_STYLE +
    BLOCK_TEXT_STYLE +
    calloutStyle('TipBox',         'Tip Box',         C.BG_TIP,   C.NAVY)     +
    calloutStyle('WarningBox',     'Warning Box',     C.BG_WARN,  C.BURGUNDY) +
    calloutStyle('CheckpointBox',  'Checkpoint Box',  C.BG_CHECK, C.GREEN)    +
    calloutStyle('AIAssistedBox',  'AI Assisted Box', C.BG_AI,    C.PURPLE);

  xml = xml.replace('</w:styles>', customStyles + '\n</w:styles>');
  return xml;
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function main() {
  const pandocBin = findPandoc();
  if (!pandocBin) {
    console.error('ERROR: pandoc not found.');
    process.exit(1);
  }
  console.log(`[create-reference] Using pandoc: ${pandocBin}`);

  // 1. Get pandoc's built-in default reference.docx as a raw Buffer
  console.log('[create-reference] Fetching pandoc default reference.docx...');
  let baseBuffer;
  try {
    baseBuffer = execFileSync(pandocBin, ['--print-default-data-file', 'reference.docx'], {
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  // 2. Open the ZIP (DOCX is a ZIP)
  console.log('[create-reference] Patching styles...');
  const zip = new AdmZip(baseBuffer);

  // 3. Patch word/styles.xml
  const stylesEntry = zip.getEntry('word/styles.xml');
  if (!stylesEntry) {
    console.error('ERROR: word/styles.xml not found in pandoc reference.docx');
    process.exit(1);
  }
  const originalXml = stylesEntry.getData().toString('utf8');
  const patchedXml  = patchStylesXml(originalXml);
  zip.updateFile('word/styles.xml', Buffer.from(patchedXml, 'utf8'));

  // 4. Save
  zip.writeZip(REFERENCE_DOCX);
  const sizeKB = (fs.statSync(REFERENCE_DOCX).size / 1024).toFixed(0);
  console.log(`[create-reference] âœ“ reference.docx written (${sizeKB} KB): ${REFERENCE_DOCX}`);
}

main().catch(err => { console.error('ERROR:', err); process.exit(1); });

