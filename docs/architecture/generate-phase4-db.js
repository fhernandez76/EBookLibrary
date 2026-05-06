'use strict';
// Phase 4 – Database Diagrams: ER Diagram + Table Details

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'diagrams');
fs.mkdirSync(OUT, { recursive: true });

let _gid = 10;
const uid  = () => `g${ _gid++ }`;
const rst  = () => { _gid = 10; };

function xe(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function v(id, val, style, x, y, w, h, parent='1') {
  return `<mxCell id="${id}" value="${xe(val)}" style="${xe(style)}" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}
function e(id, val, src, tgt, style, parent='1') {
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
  fs.writeFileSync(path.join(OUT, fname), xml, 'utf8');
  console.log(`  ✓  ${fname}`);
}

const S = {
  titleBar:  'rounded=0;fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=15;fontStyle=1;html=1;align=center;',
  tblHdr:    'fillColor=#1e3a5f;strokeColor=#0d2a4a;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;align=center;',
  tblPK:     'fillColor=#fff9c4;strokeColor=#d4a800;fontSize=10;html=1;align=left;',
  tblFK:     'fillColor=#e8f5e9;strokeColor=#43a047;fontSize=10;html=1;align=left;',
  tblRow:    'fillColor=#ffffff;strokeColor=#cccccc;fontSize=10;html=1;align=left;',
  tblAlt:    'fillColor=#f5f5f5;strokeColor=#cccccc;fontSize=10;html=1;align=left;',
  tblCB:     'fillColor=#e3f2fd;strokeColor=#1e88e5;fontSize=10;html=1;align=left;',  // composite PK + FK
  relOne:    'endArrow=ERmandOne;startArrow=ERmandOne;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;endFill=0;startFill=0;',
  relMany:   'endArrow=ERmany;startArrow=ERmandOne;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;endFill=0;startFill=0;',
  relOptMany:'endArrow=ERmany;startArrow=ERone;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;endFill=0;startFill=0;',
};

// Helper: build a table block
function table(cells, id, title, x, y, w, rows) {
  // rows = [[label, style], ...]
  const RH = 24;
  const h = 30 + RH * rows.length;
  cells.push(v(`${id}_h`, title, S.tblHdr, x, y, w, 30));
  rows.forEach(([label, style], i) => {
    cells.push(v(`${id}_r${i}`, '  ' + label, style || S.tblRow, x, y+30+i*RH, w, RH));
  });
  return { top: `${id}_h`, x, y, w, h };
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 12 — DB Entity Relationship Diagram
// ══════════════════════════════════════════════════════════════════════════════
function diagram12_ERDiagram() {
  rst();
  const cells = [];
  cells.push(v('title', 'EBook Library — Entity Relationship Diagram  (SQL Server)', S.titleBar, 20, 15, 1760, 55));

  // Legend
  cells.push(v('leg', 'PK = Primary Key\nFK = Foreign Key\n(Arrow tip = "many" side)',
    'rounded=1;fillColor=#f5f5f5;strokeColor=#aaaaaa;fontSize=10;html=1;whiteSpace=wrap;', 1520, 85, 260, 80));

  const TW = 320; // table width

  // -- Books --
  const books = table(cells, 'books', 'Books', 40, 90, TW, [
    ['PK  Id : uniqueidentifier', S.tblPK],
    ['    Title : nvarchar(500)  NOT NULL', S.tblRow],
    ['    Pages : int  NOT NULL', S.tblAlt],
    ['    PublicationYear : int  NULL', S.tblRow],
    ['    Isbn : nvarchar(20)  NULL  UNIQUE FILTERED', S.tblAlt],
    ['    Description : nvarchar(4000)  NULL', S.tblRow],
    ['    FilePath : nvarchar(1000)  NULL', S.tblAlt],
    ['    CoverImagePath : nvarchar(1000)  NULL', S.tblRow],
    ['    Language : nvarchar(20)  NOT NULL', S.tblAlt],
    ['    Status : nvarchar(20)  NOT NULL', S.tblRow],
    ['    CreatedAt · UpdatedAt · IsDeleted', S.tblAlt],
  ]);

  // -- Authors --
  const authors = table(cells, 'authors', 'Authors', 40, 540, TW, [
    ['PK  Id : uniqueidentifier', S.tblPK],
    ['    Name : nvarchar(300)  NOT NULL', S.tblRow],
    ['    Biography : nvarchar(2000)  NULL', S.tblAlt],
    ['    CreatedAt · UpdatedAt · IsDeleted', S.tblRow],
  ]);

  // -- BookAuthors --
  const bookAuthors = table(cells, 'ba', 'BookAuthors', 460, 350, TW - 20, [
    ['PK+FK  BookId : uniqueidentifier (Books CASCADE)', S.tblCB],
    ['PK+FK  AuthorId : uniqueidentifier (Authors RESTRICT)', S.tblCB],
    ['       IsPrimary : bit  NOT NULL  DEFAULT 1', S.tblRow],
  ]);

  // -- Genres --
  const genres = table(cells, 'genres', 'Genres', 850, 540, TW, [
    ['PK  Id : uniqueidentifier', S.tblPK],
    ['    Name : nvarchar(100)  NOT NULL  UNIQUE', S.tblRow],
    ['    Description : nvarchar(500)  NULL', S.tblAlt],
    ['    CreatedAt · UpdatedAt · IsDeleted', S.tblRow],
  ]);

  // -- BookGenres --
  const bookGenres = table(cells, 'bg', 'BookGenres', 460, 580, TW - 20, [
    ['PK+FK  BookId : uniqueidentifier (Books CASCADE)', S.tblCB],
    ['PK+FK  GenreId : uniqueidentifier (Genres RESTRICT)', S.tblCB],
  ]);

  // -- Users --
  const users = table(cells, 'users', 'Users', 1240, 90, TW, [
    ['PK  Id : uniqueidentifier', S.tblPK],
    ['    Email : nvarchar(256)  NOT NULL  UNIQUE', S.tblRow],
    ['    PasswordHash : nvarchar(500)  NOT NULL', S.tblAlt],
    ['    FirstName : nvarchar(100)  NULL', S.tblRow],
    ['    LastName : nvarchar(100)  NULL', S.tblAlt],
    ['    Role : nvarchar(20)  NOT NULL', S.tblRow],
    ['    IsActive : bit  NOT NULL  DEFAULT 1', S.tblAlt],
    ['    CreatedAt · UpdatedAt · IsDeleted', S.tblRow],
  ]);

  // -- BookDownloads --
  const downloads = table(cells, 'dl', 'BookDownloads', 850, 200, TW, [
    ['PK  Id : uniqueidentifier', S.tblPK],
    ['FK  UserId : uniqueidentifier  (Users RESTRICT)', S.tblFK],
    ['FK  BookId : uniqueidentifier  (Books RESTRICT)', S.tblFK],
    ['    DownloadedAt : datetime2  NOT NULL', S.tblRow],
    ['    IpAddress : nvarchar(45)  NULL', S.tblAlt],
  ]);

  // ── Relationships ─────────────────────
  // Books ←→ BookAuthors ←→ Authors
  cells.push(e('r1','FK  CASCADE',  'books_h', 'ba_h',   S.relMany + 'exitX=0.7;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e('r2','FK  RESTRICT', 'authors_h','ba_h',  S.relMany + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.8;entryDx=0;entryDy=0;'));
  cells.push(e('r3','FK  CASCADE',  'books_h', 'bg_h',   S.relMany + 'exitX=0.7;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e('r4','FK  RESTRICT', 'genres_h','bg_h',  S.relMany + 'exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.8;entryDx=0;entryDy=0;'));
  // Books ←→ BookDownloads ←→ Users
  cells.push(e('r5','FK  RESTRICT (1:N downloads)', 'books_h', 'dl_h', S.relMany + 'exitX=1;exitY=0.3;exitDx=0;exitDy=0;entryX=0;entryY=0.7;entryDx=0;entryDy=0;'));
  cells.push(e('r6','FK  RESTRICT (1:N downloads)', 'users_h', 'dl_h', S.relMany + 'exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.3;entryDx=0;entryDy=0;'));

  // ── Indexes note ──────────────────────
  cells.push(v('idx', 'Indexes:  IX_Books_Title | IX_Books_Status | IX_Books_IsDeleted | IX_Books_Isbn (unique filtered)\nIX_Authors_Name | IX_Genres_Name (unique) | IX_Users_Email (unique)\nIX_BookAuthors_AuthorId | IX_BookGenres_GenreId\nIX_BookDownloads_UserId | IX_BookDownloads_BookId | IX_BookDownloads_DownloadedAt',
    'rounded=1;fillColor=#e3f2fd;strokeColor=#1565c0;fontSize=10;html=1;whiteSpace=wrap;', 40, 760, 700, 80));

  save('12-db-er-diagram.drawio', wrap('DB Entity Relationship Diagram', 1800, 900, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 13 — DB Table Details
// ══════════════════════════════════════════════════════════════════════════════
function diagram13_TableDetails() {
  rst();
  const cells = [];
  cells.push(v('title', 'EBook Library — Database Table Details  (SQL Server Schema)', S.titleBar, 20, 15, 1760, 55));

  const TW = 380;
  let x = 40, y = 90;

  // Books full detail
  table(cells, 'books', 'Books  (14 rows)', x, y, TW, [
    ['PK  Id  uniqueidentifier  NOT NULL', S.tblPK],
    ['    Title  nvarchar(500)  NOT NULL', S.tblRow],
    ['    Pages  int  NOT NULL', S.tblAlt],
    ['    PublicationYear  int  NULL', S.tblRow],
    ['    Isbn  nvarchar(20)  UNIQUE FILTERED  NULL', S.tblAlt],
    ['    Description  nvarchar(4000)  NULL', S.tblRow],
    ['    FilePath  nvarchar(1000)  NULL', S.tblAlt],
    ['    CoverImagePath  nvarchar(1000)  NULL', S.tblRow],
    ['    Language  nvarchar(20)  NOT NULL', S.tblAlt],
    ['    Status  nvarchar(20)  NOT NULL', S.tblRow],
    ['    CreatedAt  datetime2  NOT NULL', S.tblAlt],
    ['    UpdatedAt  datetime2  NULL', S.tblRow],
    ['    IsDeleted  bit  NOT NULL  DEFAULT 0', S.tblAlt],
    ['IDX: IX_Books_Title · IX_Books_Status · IX_Books_IsDeleted · IX_Books_Isbn', S.tblAlt],
  ]);

  // Authors
  x = 460;
  table(cells, 'authors', 'Authors', x, y, TW, [
    ['PK  Id  uniqueidentifier  NOT NULL', S.tblPK],
    ['    Name  nvarchar(300)  NOT NULL', S.tblRow],
    ['    Biography  nvarchar(2000)  NULL', S.tblAlt],
    ['    CreatedAt  datetime2  NOT NULL', S.tblRow],
    ['    UpdatedAt  datetime2  NULL', S.tblAlt],
    ['    IsDeleted  bit  NOT NULL  DEFAULT 0', S.tblRow],
    ['IDX: IX_Authors_Name', S.tblAlt],
  ]);

  // Genres
  x = 880;
  table(cells, 'genres', 'Genres', x, y, TW, [
    ['PK  Id  uniqueidentifier  NOT NULL', S.tblPK],
    ['    Name  nvarchar(100)  NOT NULL  UNIQUE', S.tblRow],
    ['    Description  nvarchar(500)  NULL', S.tblAlt],
    ['    CreatedAt  datetime2  NOT NULL', S.tblRow],
    ['    UpdatedAt  datetime2  NULL', S.tblAlt],
    ['    IsDeleted  bit  NOT NULL  DEFAULT 0', S.tblRow],
    ['IDX: IX_Genres_Name (UNIQUE)', S.tblAlt],
  ]);

  // Users
  x = 1300;
  table(cells, 'users', 'Users', x, y, TW, [
    ['PK  Id  uniqueidentifier  NOT NULL', S.tblPK],
    ['    Email  nvarchar(256)  NOT NULL  UNIQUE', S.tblRow],
    ['    PasswordHash  nvarchar(500)  NOT NULL', S.tblAlt],
    ['    FirstName  nvarchar(100)  NULL', S.tblRow],
    ['    LastName  nvarchar(100)  NULL', S.tblAlt],
    ['    Role  nvarchar(20)  NOT NULL', S.tblRow],
    ['    IsActive  bit  NOT NULL  DEFAULT 1', S.tblAlt],
    ['    CreatedAt  datetime2  NOT NULL', S.tblRow],
    ['    UpdatedAt  datetime2  NULL', S.tblAlt],
    ['    IsDeleted  bit  NOT NULL  DEFAULT 0', S.tblRow],
    ['IDX: IX_Users_Email (UNIQUE)', S.tblAlt],
  ]);

  // Second row: join tables + downloads
  x = 40; y = 560;
  table(cells, 'ba', 'BookAuthors  (join)', x, y, TW, [
    ['PK+FK  BookId  uniqueidentifier  (→Books CASCADE)', S.tblCB],
    ['PK+FK  AuthorId  uniqueidentifier  (→Authors RESTRICT)', S.tblCB],
    ['       IsPrimary  bit  NOT NULL  DEFAULT 1', S.tblRow],
    ['IDX: IX_BookAuthors_AuthorId', S.tblAlt],
  ]);

  x = 460;
  table(cells, 'bg', 'BookGenres  (join)', x, y, TW, [
    ['PK+FK  BookId  uniqueidentifier  (→Books CASCADE)', S.tblCB],
    ['PK+FK  GenreId  uniqueidentifier  (→Genres RESTRICT)', S.tblCB],
    ['IDX: IX_BookGenres_GenreId', S.tblAlt],
  ]);

  x = 880;
  table(cells, 'dl', 'BookDownloads', x, y, TW, [
    ['PK  Id  uniqueidentifier  NOT NULL', S.tblPK],
    ['FK  UserId  uniqueidentifier  NOT NULL  (→Users RESTRICT)', S.tblFK],
    ['FK  BookId  uniqueidentifier  NOT NULL  (→Books RESTRICT)', S.tblFK],
    ['    DownloadedAt  datetime2  NOT NULL', S.tblRow],
    ['    IpAddress  nvarchar(45)  NULL', S.tblAlt],
    ['IDX: IX_BookDownloads_UserId · _BookId · _DownloadedAt', S.tblAlt],
  ]);

  // Migration note
  cells.push(v('mig', '<b>Migration:</b>  20260330192513_InitialCreate\nDatabase: SQL Server 2022  |  Provider: Microsoft.EntityFrameworkCore.SqlServer\nAll enum columns stored as nvarchar (not int) — human-readable in DB.\nGlobal soft-delete query filters on Books · Authors · Genres · Users.',
    'rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontSize=10;html=1;whiteSpace=wrap;', 1300, 560, 380, 105));

  save('13-db-table-details.drawio', wrap('DB Table Details', 1750, 850, cells));
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('Phase 4 — Database Diagrams');
try { diagram12_ERDiagram();    } catch (err) { console.error('  ✗  12:', err.message); }
try { diagram13_TableDetails(); } catch (err) { console.error('  ✗  13:', err.message); }
console.log('Phase 4 complete.\n');
