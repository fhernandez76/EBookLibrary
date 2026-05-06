/**
 * create-reference.js  —  Book Edition reference.docx generator
 * =============================================================
 * Patches pandoc's default reference.docx to apply the EBook Library
 * *Book Edition* visual identity:
 *
 *   • US Letter page (8.5" × 11"), 1" margins
 *   • Body: Cambria 11pt   |  Headings: Calibri sans
 *   • Navy + Burgundy color palette + four sidebar accent colors
 *
 * Custom paragraph styles emitted (matched in callouts.lua):
 *   Foundations Box     (green   tint)  — junior expansions
 *   Architect Box       (navy    tint)  — trade-offs / alternatives
 *   Pitfall Box         (red     tint)  — common mistakes
 *   Practice Box        (gray    tint)  — real-team patterns
 *   Tip Box / Warning Box / Checkpoint Box / AI Assisted Box  (legacy)
 *   Source Code  /  Verbatim Char  /  Block Text
 *   Figure Caption  /  Listing Caption  /  Table Caption
 *
 * Usage:
 *   node assets/styles/create-reference.js
 *
 * Output:
 *   assets/styles/reference.docx
 */
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const path   = require('path');
const fs     = require('fs');

const STYLES_DIR     = path.dirname(__filename);
const REFERENCE_DOCX = path.join(STYLES_DIR, 'reference.docx');

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  NAVY:     '1a3c7c',
  BURGUNDY: 'b0133a',
  GREEN:    '1a7c4a',
  PURPLE:   '7c1a7c',
  RED:      'b32424',
  GRAY_FG:  '555555',
  GRAY_MID: '888888',
  GRAY_BG:  'F2F2F2',

  BG_CODE:  'F5F5F5',
  BG_TIP:   'EFF4FF',
  BG_WARN:  'FFF0F0',
  BG_CHECK: 'F0FFF4',
  BG_AI:    'F9F0FF',
  BG_FOUND: 'EFFAF1',
  BG_ARCH:  'EFF2FA',
  BG_PIT:   'FFF2F2',
  BG_PRAC:  'F4F4F4',
};

// Half-points (Word XML unit)
const SZ = {
  TITLE:    72,  // 36pt — book title
  SUBTITLE: 36,  // 18pt
  H1:       40,  // 20pt — chapter
  H2:       30,  // 15pt — section
  H3:       24,  // 12pt — subsection
  AUTHOR:   28,  // 14pt
  CODE:     18,  // 9pt
  BODY:     22,  // 11pt
  CAPTION:  20,  // 10pt
};

// ─── Find pandoc ─────────────────────────────────────────────────────────────
function findPandoc() {
  const w = spawnSync('where', ['pandoc'], { encoding: 'utf8', timeout: 5000 });
  if (w.status === 0 && w.stdout && w.stdout.trim()) {
    return w.stdout.trim().split(/\r?\n/)[0].trim();
  }
  for (const c of [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Pandoc', 'pandoc.exe'),
    'C:\\Program Files\\Pandoc\\pandoc.exe',
  ].filter(Boolean)) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ─── XML patch helpers ───────────────────────────────────────────────────────
function findStyle(xml, styleId) {
  const idAttr = `w:styleId="${styleId}"`;
  const idPos  = xml.indexOf(idAttr);
  if (idPos === -1) return null;
  const start  = xml.lastIndexOf('<w:style', idPos);
  const end    = xml.indexOf('</w:style>', idPos) + '</w:style>'.length;
  return { start, end, block: xml.substring(start, end) };
}

function setRpr(styleBlock, props) {
  let c = '';
  if (props.fontAscii)  c += `<w:rFonts w:ascii="${props.fontAscii}" w:hAnsi="${props.fontAscii}" w:cs="${props.fontAscii}"/>`;
  if (props.bold)       c += '<w:b/>';
  if (props.italic)     c += '<w:i/>';
  if (props.caps)       c += '<w:caps/>';
  if (props.color)      c += `<w:color w:val="${props.color}"/>`;
  if (props.sz) { c += `<w:sz w:val="${props.sz}"/><w:szCs w:val="${props.sz}"/>`; }
  if (props.noProof)    c += '<w:noProof/>';

  const newRpr = c ? `<w:rPr>${c}</w:rPr>` : '';
  const start  = styleBlock.indexOf('<w:rPr>');
  const end    = styleBlock.indexOf('</w:rPr>');
  if (start !== -1 && end !== -1) {
    return styleBlock.substring(0, start) + newRpr + styleBlock.substring(end + '</w:rPr>'.length);
  }
  return styleBlock.replace('</w:style>', newRpr + '\n</w:style>');
}

function setPpr(styleBlock, pprContent) {
  const newPpr = `<w:pPr>${pprContent}</w:pPr>`;
  const start  = styleBlock.indexOf('<w:pPr>');
  const end    = styleBlock.indexOf('</w:pPr>');
  if (start !== -1 && end !== -1) {
    return styleBlock.substring(0, start) + newPpr + styleBlock.substring(end + '</w:pPr>'.length);
  }
  const insertBefore = styleBlock.indexOf('<w:rPr>') !== -1 ? '<w:rPr>' : '</w:style>';
  return styleBlock.replace(insertBefore, newPpr + '\n' + insertBefore);
}

function patchStyle(xml, styleId, rprProps, pprContent) {
  const found = findStyle(xml, styleId);
  if (!found) return xml;
  let block = found.block;
  if (rprProps)             block = setRpr(block, rprProps);
  if (pprContent !== undefined) block = setPpr(block, pprContent);
  return xml.substring(0, found.start) + block + xml.substring(found.end);
}

// ─── Style fragments ─────────────────────────────────────────────────────────
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
    <w:spacing w:before="120" w:after="120"/>
    <w:ind w:left="360" w:right="180"/>
  </w:pPr>
  <w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
    <w:sz w:val="${SZ.BODY}"/>
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
    <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>
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
    <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>
    <w:color w:val="${C.BURGUNDY}"/>
    <w:sz w:val="${SZ.BODY}"/>
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
    <w:color w:val="${C.GRAY_FG}"/>
    <w:sz w:val="${SZ.BODY}"/>
  </w:rPr>
</w:style>`;

const FIGURE_CAPTION_STYLE = `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="FigureCaption">
  <w:name w:val="Figure Caption"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="40" w:after="200"/>
  </w:pPr>
  <w:rPr>
    <w:i/>
    <w:color w:val="${C.GRAY_FG}"/>
    <w:sz w:val="${SZ.CAPTION}"/>
  </w:rPr>
</w:style>`;

const LISTING_CAPTION_STYLE = `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="ListingCaption">
  <w:name w:val="Listing Caption"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:spacing w:before="160" w:after="40"/>
  </w:pPr>
  <w:rPr>
    <w:b/>
    <w:color w:val="${C.NAVY}"/>
    <w:sz w:val="${SZ.CAPTION}"/>
  </w:rPr>
</w:style>`;

const TABLE_CAPTION_STYLE = `
<w:style w:type="paragraph" w:customStyle="1" w:styleId="TableCaption">
  <w:name w:val="Table Caption"/>
  <w:basedOn w:val="Normal"/>
  <w:pPr>
    <w:spacing w:before="160" w:after="40"/>
  </w:pPr>
  <w:rPr>
    <w:b/>
    <w:color w:val="${C.NAVY}"/>
    <w:sz w:val="${SZ.CAPTION}"/>
  </w:rPr>
</w:style>`;

// ─── Apply all patches ───────────────────────────────────────────────────────
function patchStylesXml(xml) {
  // Body
  xml = patchStyle(xml, 'Normal',
    { fontAscii: 'Cambria', sz: SZ.BODY },
    `<w:spacing w:before="0" w:after="120" w:line="288" w:lineRule="auto"/><w:jc w:val="left"/>`
  );

  // Heading 1 = Chapter
  xml = patchStyle(xml, 'Heading1',
    { fontAscii: 'Calibri', color: C.NAVY, sz: SZ.H1, bold: true, caps: true },
    `<w:keepNext/><w:pageBreakBefore/>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="${C.NAVY}"/></w:pBdr>` +
    `<w:spacing w:before="240" w:after="240"/><w:outlineLvl w:val="0"/>`
  );

  // Heading 2 = Section
  xml = patchStyle(xml, 'Heading2',
    { fontAscii: 'Calibri', color: C.NAVY, sz: SZ.H2, bold: true },
    `<w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/>`
  );

  // Heading 3 = Subsection
  xml = patchStyle(xml, 'Heading3',
    { fontAscii: 'Calibri', color: C.BURGUNDY, sz: SZ.H3, bold: true },
    `<w:keepNext/><w:spacing w:before="160" w:after="40"/><w:outlineLvl w:val="2"/>`
  );

  // Title
  xml = patchStyle(xml, 'Title',
    { fontAscii: 'Calibri', color: C.NAVY, sz: SZ.TITLE, bold: true },
    `<w:jc w:val="center"/><w:spacing w:before="2880" w:after="240"/>`
  );

  // Subtitle
  xml = patchStyle(xml, 'Subtitle',
    { fontAscii: 'Calibri', color: C.GRAY_FG, sz: SZ.SUBTITLE, italic: true },
    `<w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/>`
  );

  // Author
  xml = patchStyle(xml, 'Author',
    { fontAscii: 'Calibri', color: C.NAVY, sz: SZ.AUTHOR, bold: true },
    `<w:jc w:val="center"/><w:spacing w:before="720" w:after="120"/>`
  );

  // Date
  xml = patchStyle(xml, 'Date',
    { fontAscii: 'Calibri', color: C.GRAY_MID, sz: SZ.BODY },
    `<w:jc w:val="center"/><w:spacing w:before="120" w:after="1200"/>`
  );

  // Append custom styles
  const customStyles =
    SOURCE_CODE_STYLE +
    VERBATIM_CHAR_STYLE +
    BLOCK_TEXT_STYLE +
    FIGURE_CAPTION_STYLE +
    LISTING_CAPTION_STYLE +
    TABLE_CAPTION_STYLE +
    calloutStyle('TipBox',         'Tip Box',         C.BG_TIP,   C.NAVY)     +
    calloutStyle('WarningBox',     'Warning Box',     C.BG_WARN,  C.BURGUNDY) +
    calloutStyle('CheckpointBox',  'Checkpoint Box',  C.BG_CHECK, C.GREEN)    +
    calloutStyle('AIAssistedBox',  'AI Assisted Box', C.BG_AI,    C.PURPLE)   +
    calloutStyle('FoundationsBox', 'Foundations Box', C.BG_FOUND, C.GREEN)    +
    calloutStyle('ArchitectBox',   'Architect Box',   C.BG_ARCH,  C.NAVY)     +
    calloutStyle('PitfallBox',     'Pitfall Box',     C.BG_PIT,   C.RED)      +
    calloutStyle('PracticeBox',    'Practice Box',    C.BG_PRAC,  C.GRAY_FG);

  xml = xml.replace('</w:styles>', customStyles + '\n</w:styles>');
  return xml;
}

// ─── Patch document.xml: US Letter page size + 1-inch margins ────────────────
// Pandoc's default reference.docx uses A4. We rewrite the sectPr at end of
// document.xml so DOCX is consistently US Letter.
function patchDocumentXml(xml) {
  // US Letter: 12240 × 15840 twentieths-of-a-point  (8.5" × 11")
  // Margins: 1440 = 1 inch
  const sectPr =
    '<w:sectPr>' +
    '<w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" ' +
            'w:header="720" w:footer="720" w:gutter="0"/>' +
    '<w:cols w:space="720"/>' +
    '<w:docGrid w:linePitch="360"/>' +
    '</w:sectPr>';
  return xml.replace(/<w:sectPr>[\s\S]*?<\/w:sectPr>/, sectPr);
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const pandocBin = findPandoc();
  if (!pandocBin) {
    console.error('ERROR: pandoc not found.');
    process.exit(1);
  }
  console.log(`[create-reference:book] Using pandoc: ${pandocBin}`);

  const baseBuffer = execFileSync(
    pandocBin,
    ['--print-default-data-file', 'reference.docx'],
    { maxBuffer: 10 * 1024 * 1024 }
  );

  const zip = new AdmZip(baseBuffer);

  const stylesEntry = zip.getEntry('word/styles.xml');
  if (!stylesEntry) { console.error('ERROR: word/styles.xml not found.'); process.exit(1); }
  const newStyles = patchStylesXml(stylesEntry.getData().toString('utf8'));
  zip.updateFile('word/styles.xml', Buffer.from(newStyles, 'utf8'));

  const docEntry = zip.getEntry('word/document.xml');
  if (docEntry) {
    const newDoc = patchDocumentXml(docEntry.getData().toString('utf8'));
    zip.updateFile('word/document.xml', Buffer.from(newDoc, 'utf8'));
  }

  zip.writeZip(REFERENCE_DOCX);
  console.log(`[create-reference:book] ✓ ${REFERENCE_DOCX}`);
}

main();
