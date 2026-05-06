'use strict';
// Phase 1 – C4 Level 1 & 2 Diagrams (System Context + Container)

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'diagrams');
fs.mkdirSync(OUT, { recursive: true });

// ── XML helpers ────────────────────────────────────────────────────────────────
let _gid = 10;
const uid  = () => `g${ _gid++ }`;
const rst  = () => { _gid = 10; };

function xe(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function v(id, val, style, x, y, w, h, parent = '1') {
  return `<mxCell id="${id}" value="${xe(val)}" style="${xe(style)}" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function e(id, val, src, tgt, style, parent = '1') {
  return `<mxCell id="${id}" value="${xe(val)}" style="${xe(style)}" edge="1" source="${src}" target="${tgt}" parent="${parent}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}

function wrap(title, pw, ph, cells) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" version="21.0.0">
  <diagram id="d1" name="${xe(title)}">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" page="1" pageScale="1" pageWidth="${pw}" pageHeight="${ph}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function save(fname, xml) {
  const fp = path.join(OUT, fname);
  fs.writeFileSync(fp, xml, 'utf8');
  console.log(`  ✓  ${fname}`);
}

// ── Shared styles ──────────────────────────────────────────────────────────────
const S = {
  titleBar:  'rounded=0;fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=15;fontStyle=1;html=1;align=center;',
  person:    'shape=mxgraph.basic.person2;fillColor=#1e3a5f;strokeColor=#0d2a4a;fontColor=#1e3a5f;fontSize=11;fontStyle=1;verticalLabelPosition=bottom;verticalAlign=top;html=1;',
  sysMain:   'rounded=1;fillColor=#1e3a5f;strokeColor=#0d2a4a;fontColor=#ffffff;fontSize=12;fontStyle=1;html=1;whiteSpace=wrap;',
  sysExt:    'rounded=1;fillColor=#5a5a5a;strokeColor=#3d3d3d;fontColor=#ffffff;fontSize=11;html=1;whiteSpace=wrap;',
  dbCyl:     'shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#2e7d32;strokeColor=#1b5e20;fontColor=#ffffff;fontSize=11;fontStyle=1;',
  fileBox:   'shape=folder;whiteSpace=wrap;html=1;fillColor=#e65100;strokeColor=#bf360c;fontColor=#ffffff;fontSize=11;fontStyle=1;',
  boundary:  'rounded=1;fillColor=none;strokeColor=#888888;dashed=1;dashPattern=8 4;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  container: 'rounded=1;fillColor=#1565c0;strokeColor=#0d47a1;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;whiteSpace=wrap;',
  contBlazor:'rounded=1;fillColor=#6a1b9a;strokeColor=#4a148c;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;whiteSpace=wrap;',
  contReact: 'rounded=1;fillColor=#e65100;strokeColor=#bf360c;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;whiteSpace=wrap;',
  contInfra: 'rounded=1;fillColor=#2e7d32;strokeColor=#1b5e20;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;whiteSpace=wrap;',
  noteBox:   'rounded=1;fillColor=#fff8e1;strokeColor=#f57f17;fontSize=10;html=1;whiteSpace=wrap;',
  arrowH:    'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;labelBackgroundColor=#ffffff;',
  arrowV:    'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
  arrowVL:   'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;exitX=0.25;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
  arrowVR:   'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;exitX=0.75;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
  arrowL:    'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
  arrowR:    'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
};

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 1 — C4 Level 1: System Context
// ══════════════════════════════════════════════════════════════════════════════
function diagram1_SystemContext() {
  rst();
  const cells = [];

  // Title bar
  cells.push(v('title', 'EBook Library — System Context Diagram  (C4 Level 1)', S.titleBar, 20, 15, 1560, 55));

  // ── Legend ──────────────────────────
  cells.push(v('leg_bg', '', 'rounded=1;fillColor=#f5f5f5;strokeColor=#bbbbbb;fontSize=10;html=1;', 1220, 85, 360, 180));
  cells.push(v('leg_t',  'Legend', 'text;html=1;fontSize=11;fontStyle=1;align=center;', 1340, 90, 120, 20));
  cells.push(v('leg_p',  '',  S.person,    1235, 110, 30, 30));
  cells.push(v('leg_pt', 'Person (User)', 'text;html=1;fontSize=10;', 1280, 118, 130, 20));
  cells.push(v('leg_s',  '',  S.sysMain,   1235, 155, 60, 30));
  cells.push(v('leg_st', 'Software System', 'text;html=1;fontSize=10;', 1305, 163, 160, 20));
  cells.push(v('leg_e',  '',  S.sysExt,    1235, 200, 60, 30));
  cells.push(v('leg_et', 'External System', 'text;html=1;fontSize=10;', 1305, 208, 160, 20));
  cells.push(v('leg_d',  '',  S.dbCyl,     1235, 240, 40, 35));
  cells.push(v('leg_dt', 'Database', 'text;html=1;fontSize=10;', 1305, 250, 160, 20));

  // ── Regular User ──────────────────────
  const rUsr = uid();
  cells.push(v(rUsr, 'Regular User\n[Person]\n\nBrowses catalog.\nDownloads ebooks.', S.person, 90, 370, 100, 120));

  // ── Admin User ────────────────────────
  const aUsr = uid();
  cells.push(v(aUsr, 'Admin User\n[Person]\n\nManages books,\nauthors, genres &\nusers via the API.', S.person, 1410, 370, 100, 120));

  // ── EBook Library System ──────────────
  const sys = uid();
  cells.push(v(sys,
    '<b>EBook Library System</b><br/><i>[Software System]</i><br/><br/>Provides ebook catalog browsing,<br/>JWT-secured downloads, and<br/>admin catalog management.<br/><br/>ASP.NET Core 8  |  Blazor WASM  |  React',
    S.sysMain, 540, 310, 520, 240));

  // ── SQL Server ────────────────────────
  const sqlSrv = uid();
  cells.push(v(sqlSrv,
    '<b>SQL Server Database</b><br/><i>[External: Data Store]</i><br/><br/>Stores users, books, authors,<br/>genres, and download logs.',
    S.dbCyl, 370, 740, 240, 130));

  // ── File System ───────────────────────
  const fileSys = uid();
  cells.push(v(fileSys,
    '<b>File Storage</b><br/><i>[External: File System]</i><br/><br/>Local filesystem.<br/>Stores .epub files by genre.',
    S.fileBox, 990, 740, 240, 130));

  // ── Arrows ────────────────────────────
  cells.push(e(uid(), 'Browses catalog &amp; downloads ebooks [HTTPS]', rUsr, sys,
    S.arrowR + 'exitX=1;exitY=0.25;exitDx=0;exitDy=0;entryX=0;entryY=0.3;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;'));
  cells.push(e(uid(), 'Manages catalog [HTTPS]', aUsr, sys,
    S.arrowL + 'exitX=0;exitY=0.25;exitDx=0;exitDy=0;entryX=1;entryY=0.3;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;'));
  cells.push(e(uid(), 'Reads / writes data\n[EF Core · SQL over TCP/IP]', sys, sqlSrv,
    S.arrowVL));
  cells.push(e(uid(), 'Reads / writes .epub files\n[File I/O]', sys, fileSys,
    S.arrowVR));

  save('01-c4-system-context.drawio', wrap('C4 Level 1 – System Context', 1600, 1000, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 2 — C4 Level 2: Container Diagram
// ══════════════════════════════════════════════════════════════════════════════
function diagram2_Container() {
  rst();
  const cells = [];

  // Title
  cells.push(v('title', 'EBook Library — Container Diagram  (C4 Level 2)', S.titleBar, 20, 15, 1560, 55));

  // ── Users ─────────────────────────────
  const rUsr = uid();
  cells.push(v(rUsr, 'Regular User\n[Person]', S.person, 40, 440, 100, 120));
  const aUsr = uid();
  cells.push(v(aUsr, 'Admin User\n[Person]', S.person, 1460, 440, 100, 120));

  // ── System Boundary ───────────────────
  cells.push(v('bnd', 'EBook Library System', S.boundary, 240, 120, 1120, 820));

  // ── Blazor WASM SPA ───────────────────
  const blazor = uid();
  cells.push(v(blazor,
    '<b>Blazor WASM SPA</b><br/><i>[Container: Blazor WebAssembly]</i><br/><br/>Public-facing SPA for<br/>catalog browsing, auth,<br/>and ebook download.<br/>Served at port 5001.',
    S.contBlazor, 310, 200, 280, 180));

  // ── React SPA ─────────────────────────
  const react = uid();
  cells.push(v(react,
    '<b>React SPA</b><br/><i>[Container: React 18 + TypeScript]</i><br/><br/>Alternative SPA frontend.<br/>Tailwind CSS styling.<br/>Vite build toolchain.<br/>Served at port 3000.',
    S.contReact, 310, 440, 280, 180));

  // ── Web API ───────────────────────────
  const api = uid();
  cells.push(v(api,
    '<b>Web API</b><br/><i>[Container: ASP.NET Core 8]</i><br/><br/>REST API.  JWT Bearer auth.<br/>Rate-limited auth endpoints.<br/>CQRS via MediatR.<br/>FluentValidation.<br/>Swagger / OpenAPI.<br/>Port 5000.',
    S.container, 720, 240, 320, 320));

  // ── AppDbContext ──────────────────────
  const dbc = uid();
  cells.push(v(dbc,
    '<b>AppDbContext</b><br/><i>[Container: EF Core 8]</i><br/><br/>Code-First DbContext.<br/>7 entities, auto-migrations.<br/>Global soft-delete filters.<br/>SQL Server provider.',
    S.contInfra, 1150, 270, 160, 250));

  // ── External: SQL Server ──────────────
  const sql = uid();
  cells.push(v(sql,
    '<b>SQL Server DB</b><br/><i>[External: Database]</i><br/><br/>7 tables, 12 indexes.<br/>SQL Server 2022.',
    S.dbCyl, 1080, 750, 200, 150));

  // ── External: File Storage ────────────
  const fs2 = uid();
  cells.push(v(fs2,
    '<b>File Storage</b><br/><i>[External: Local FS]</i><br/><br/>{BasePath}/books/{genre}/*.epub',
    S.fileBox, 310, 750, 200, 130));

  // ── Arrows ────────────────────────────
  const arrAPI = 'endArrow=block;endFill=1;html=1;strokeColor=#444444;fontSize=10;labelBackgroundColor=#ffffff;';
  cells.push(e(uid(), '[HTTPS]\nBrowses catalog', rUsr, blazor, arrAPI));
  cells.push(e(uid(), '[HTTPS]\nBrowses catalog', rUsr, react,  arrAPI));
  cells.push(e(uid(), 'Manages catalog', aUsr, api, arrAPI + 'exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'API calls\n[JSON/HTTPS · JWT Bearer]', blazor, api, arrAPI + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.3;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'API calls\n[JSON/HTTPS · JWT Bearer]', react,  api, arrAPI + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.7;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'Queries &amp; commands\n[EF Core]', api, dbc, arrAPI + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'Reads &amp; writes\nepub files [File I/O]', api, fs2, arrAPI + 'exitX=0.25;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'SQL queries\n[SQL over TCP/IP]', dbc, sql, S.arrowV));

  save('02-c4-container.drawio', wrap('C4 Level 2 – Container', 1600, 1050, cells));
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('Phase 1 — C4 Level 1 & 2 Diagrams');
try { diagram1_SystemContext(); } catch (err) { console.error('  ✗  01:', err.message); }
try { diagram2_Container();     } catch (err) { console.error('  ✗  02:', err.message); }
console.log('Phase 1 complete.\n');
