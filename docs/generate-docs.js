// generate-docs.js
// Converts all .md files in the docs folder to professional .docx files
// Run: node generate-docs.js

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  UnderlineType,
  convertInchesToTwip,
} = require('docx');

// ── Color palette ─────────────────────────────────────────────────────────────
const NAVY = '1A3C7C';
const BURGUNDY = 'B0133A';
const DARK_GRAY = '333333';
const LIGHT_GRAY = 'F2F2F2';
const CODE_BG = 'F5F5F5';
const TABLE_HEADER_BG = '1A3C7C';
const TABLE_ROW_ALT = 'EEF2F8';

// ── Styles ────────────────────────────────────────────────────────────────────

function makeDocTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 400, before: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 56,
        color: NAVY,
        font: 'Cambria',
      }),
    ],
  });
}

function makeH1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 180 },
    border: { bottom: { color: NAVY, size: 4, value: BorderStyle.SINGLE } },
    children: [
      new TextRun({ text, bold: true, size: 36, color: NAVY, font: 'Cambria' }),
    ],
  });
}

function makeH2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 28, color: BURGUNDY, font: 'Cambria' }),
    ],
  });
}

function makeH3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: DARK_GRAY, font: 'Calibri' }),
    ],
  });
}

function makeParagraph(text, options = {}) {
  if (!text.trim()) return new Paragraph({ text: '' });
  return new Paragraph({
    spacing: { after: 120, before: 60 },
    children: renderInlineMarkdown(text),
    ...options,
  });
}

function makeBullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: renderInlineMarkdown(text),
  });
}

function makeSubBullet(text) {
  return new Paragraph({
    bullet: { level: 1 },
    spacing: { after: 60 },
    children: renderInlineMarkdown(text),
  });
}

function makeCodeBlock(lines) {
  const children = [];
  for (const line of lines) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Courier New',
            size: 18,
            color: '222222',
          }),
        ],
      })
    );
  }
  return children;
}

function renderInlineMarkdown(text) {
  const runs = [];
  // Handle **bold**, `code`, and plain text
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`|([^`*]+|\*[^*]|\*$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true, font: 'Calibri', size: 22 }));
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({
        text: match[2], font: 'Courier New', size: 20, color: BURGUNDY,
        shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' },
      }));
    } else if (match[3] !== undefined) {
      runs.push(new TextRun({ text: match[3], font: 'Calibri', size: 22 }));
    }
  }
  if (runs.length === 0)
    runs.push(new TextRun({ text, font: 'Calibri', size: 22 }));
  return runs;
}

function makeTable(rows) {
  if (!rows || rows.length < 2) return null;

  const isAligned = rows[1] && rows[1].every(c => /^:?-+:?$/.test(c.trim()));
  const dataRows = isAligned ? rows.slice(2) : rows.slice(1);
  const headers = rows[0];

  const tableRows = [
    // Header row
    new TableRow({
      tableHeader: true,
      children: headers.map((cell) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, fill: TABLE_HEADER_BG, color: TABLE_HEADER_BG },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text: cell.trim(), bold: true, color: 'FFFFFF', font: 'Calibri', size: 20 })],
            }),
          ],
        })
      ),
    }),
    // Data rows
    ...dataRows.map((row, i) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            shading: i % 2 === 0 ? undefined : { type: ShadingType.SOLID, fill: TABLE_ROW_ALT, color: TABLE_ROW_ALT },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: renderInlineMarkdown(cell.trim()),
              }),
            ],
          })
        ),
      })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });
}

// ── Markdown Parser ───────────────────────────────────────────────────────────

function parseMdToDocx(mdContent, title) {
  const lines = mdContent.split('\n');
  const elements = [];
  let i = 0;

  // Document title (from filename / first H1)
  let docTitle = title;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(...makeCodeBlock(codeLines));
      i++;
      continue;
    }

    // Heading
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const h4 = line.match(/^#### (.+)/);

    if (h1) {
      if (elements.length === 0) {
        docTitle = h1[1];
        elements.push(makeDocTitle(h1[1]));
      } else {
        elements.push(makeH1(h1[1]));
      }
      i++;
      continue;
    }
    if (h2) { elements.push(makeH2(h2[1])); i++; continue; }
    if (h3) { elements.push(makeH3(h3[1])); i++; continue; }
    if (h4) {
      elements.push(new Paragraph({
        spacing: { before: 180, after: 60 },
        children: [new TextRun({ text: h4[1], bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Calibri', size: 22, color: DARK_GRAY })],
      }));
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i].split('|').slice(1, -1));
        i++;
      }
      const table = makeTable(tableLines);
      if (table) {
        elements.push(new Paragraph({ text: '', spacing: { before: 120, after: 60 } }));
        elements.push(table);
        elements.push(new Paragraph({ text: '', spacing: { before: 60, after: 120 } }));
      }
      continue;
    }

    // Bullet list  
    const bulletMatch = line.match(/^(\s*)[-*] (.+)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const text = bulletMatch[2];
      if (indent >= 2) {
        elements.push(makeSubBullet(text));
      } else {
        elements.push(makeBullet(text));
      }
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\s*)\d+\. (.+)/);
    if (numMatch) {
      elements.push(new Paragraph({
        numbering: { reference: 'default-numbering', level: 0 },
        spacing: { after: 80 },
        children: renderInlineMarkdown(numMatch[2]),
      }));
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+/) || line.match(/^\*\*\*+/)) {
      elements.push(new Paragraph({
        border: { bottom: { color: NAVY, size: 2, value: BorderStyle.SINGLE } },
        text: '',
        spacing: { before: 240, after: 240 },
      }));
      i++;
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^> (.+)/);
    if (bqMatch) {
      elements.push(new Paragraph({
        indent: { left: convertInchesToTwip(0.5) },
        spacing: { after: 120 },
        border: { left: { color: BURGUNDY, size: 20, value: BorderStyle.SINGLE } },
        shading: { type: ShadingType.SOLID, fill: 'F8F8F8', color: 'F8F8F8' },
        children: [new TextRun({ text: bqMatch[1], italics: true, font: 'Calibri', size: 22, color: '555555' })],
      }));
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(makeParagraph(line));
    i++;
  }

  return { elements, docTitle };
}

// ── Document Builder ──────────────────────────────────────────────────────────

function buildDocument(elements, docTitle, filename) {
  return new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: NumberFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.START,
        }],
      }],
    },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: DARK_GRAY },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { color: NAVY, size: 4, value: BorderStyle.SINGLE } },
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: 'EBook Library — ', font: 'Calibri', size: 18, color: '888888' }),
                  new TextRun({ text: docTitle, bold: true, font: 'Calibri', size: 18, color: NAVY }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { color: NAVY, size: 2, value: BorderStyle.SINGLE } },
                spacing: { before: 120 },
                children: [
                  new TextRun({ text: 'EBook Library Technical Documentation  |  Page ', font: 'Calibri', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: NAVY }),
                  new TextRun({ text: ' of ', font: 'Calibri', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 18, color: NAVY }),
                ],
              }),
            ],
          }),
        },
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
            },
          },
        },
        children: elements,
      },
    ],
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const docsDir = __dirname;
  const mdFiles = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Found ${mdFiles.length} Markdown files. Generating DOCX...\n`);

  for (const mdFile of mdFiles) {
    const mdPath = path.join(docsDir, mdFile);
    const docxPath = path.join(docsDir, mdFile.replace('.md', '.docx'));
    const titleGuess = mdFile.replace('.md', '').replace(/-/g, ' ').replace(/^\d+ /, '');

    try {
      const mdContent = fs.readFileSync(mdPath, 'utf-8');
      const { elements, docTitle } = parseMdToDocx(mdContent, titleGuess);
      const doc = buildDocument(elements, docTitle, mdFile);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(docxPath, buffer);
      console.log(`  ✓ ${mdFile.padEnd(40)} → ${path.basename(docxPath)}`);
    } catch (err) {
      console.error(`  ✗ ${mdFile}: ${err.message}`);
    }
  }

  console.log('\nDone! All DOCX files generated.');
}

main().catch(console.error);
