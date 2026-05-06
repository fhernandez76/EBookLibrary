'use strict';
// Phase 2 – C4 Level 3 & 4 Diagrams (Component + Code/Domain)

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'diagrams');
fs.mkdirSync(OUT, { recursive: true });

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
  fs.writeFileSync(path.join(OUT, fname), xml, 'utf8');
  console.log(`  ✓  ${fname}`);
}

const S = {
  titleBar: 'rounded=0;fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=15;fontStyle=1;html=1;align=center;',
  boundary: 'rounded=1;fillColor=none;strokeColor=#888888;dashed=1;dashPattern=8 4;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  midBg:    'rounded=1;fillColor=#fce4ec;strokeColor=#c62828;fontColor=#c62828;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  midItem:  'rounded=1;fillColor=#ffebee;strokeColor=#e53935;fontColor=#333333;fontSize=10;html=1;whiteSpace=wrap;',
  ctrlBg:   'rounded=1;fillColor=#e8f5e9;strokeColor=#2e7d32;fontColor=#2e7d32;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  ctrlItem: 'rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontColor=#212121;fontSize=10;html=1;whiteSpace=wrap;',
  appBg:    'rounded=1;fillColor=#e3f2fd;strokeColor=#1565c0;fontColor=#1565c0;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  appItem:  'rounded=1;fillColor=#e3f2fd;strokeColor=#1e88e5;fontColor=#212121;fontSize=10;html=1;whiteSpace=wrap;',
  infrBg:   'rounded=1;fillColor=#f3e5f5;strokeColor=#6a1b9a;fontColor=#6a1b9a;fontSize=11;fontStyle=3;verticalAlign=top;html=1;',
  infrItem: 'rounded=1;fillColor=#f3e5f5;strokeColor=#8e24aa;fontColor=#212121;fontSize=10;html=1;whiteSpace=wrap;',
  arr:      'endArrow=block;endFill=1;html=1;strokeColor=#555555;fontSize=10;labelBackgroundColor=#ffffff;',
  // Domain/Code diagram styles
  classHdr: 'fillColor=#1e3a5f;strokeColor=#0d2a4a;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;',
  classRow: 'fillColor=#ffffff;strokeColor=#aaaaaa;fontSize=10;html=1;align=left;',
  classAlt: 'fillColor=#f5f5f5;strokeColor=#aaaaaa;fontSize=10;html=1;align=left;',
  classPK:  'fillColor=#fff9c4;strokeColor=#f9a825;fontSize=10;html=1;align=left;fontStyle=3;',
  enumBox:  'rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontSize=10;html=1;whiteSpace=wrap;',
  voBox:    'rounded=1;fillColor=#fff8e1;strokeColor=#f9a825;fontSize=10;html=1;whiteSpace=wrap;',
  relOne:   'endArrow=ERone;startArrow=ERone;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;',
  relMany:  'endArrow=ERmany;startArrow=ERone;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;',
};

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 3 — C4 Level 3: Component (Web API)
// ══════════════════════════════════════════════════════════════════════════════
function diagram3_Component() {
  rst();
  const cells = [];

  cells.push(v('title', 'EBook Library — Component Diagram: Web API  (C4 Level 3)', S.titleBar, 20, 15, 1760, 55));

  // ── Section backgrounds ───────────────
  cells.push(v('mid_bg', 'Middleware Pipeline\n(ordered)', S.midBg,  40,  90, 260, 980));
  cells.push(v('ctrl_bg','Controllers',                    S.ctrlBg, 360, 90, 290, 980));
  cells.push(v('app_bg', 'Application Layer (MediatR)',    S.appBg,  720, 90, 490, 980));
  cells.push(v('inf_bg', 'Infrastructure / Services',      S.infrBg,1280, 90, 470, 980));

  // ── Middleware (left column) ───────────
  const midItems = [
    ['mid1', '① ExceptionHandlingMiddleware\nMaps exceptions → HTTP codes'],
    ['mid2', '② Security Headers Middleware\nX-Frame-Options · X-XSS-Prot.'],
    ['mid3', '③ HTTPS Redirection'],
    ['mid4', '④ CORS  (AllowFrontends policy)'],
    ['mid5', '⑤ Rate Limiter\nFixed window · 10 req/min (auth)'],
    ['mid6', '⑥ Authentication  (JWT Bearer)\nValidates Bearer token'],
    ['mid7', '⑦ Authorization\n[Authorize] / Roles="Admin"'],
  ];
  midItems.forEach(([id, label], i) => {
    cells.push(v(id, label, S.midItem, 55, 140 + i * 120, 230, 100));
  });

  // ── Controllers (second column) ───────
  const ctrlItems = [
    ['c1', 'AuthController\n/api/auth\nPOST register · POST login'],
    ['c2', 'BooksController\n/api/books\nSearch · GetById · Create\nUpdate · Delete · Download'],
    ['c3', 'AuthorsController\n/api/authors\nCRUD, paged list'],
    ['c4', 'GenresController\n/api/genres\nCRUD, full list'],
    ['c5', 'UsersController\n/api/users  [Admin]\nPaged list · Update role'],
    ['c6', 'FilesController\n/api/files  [Admin]\nPOST upload .epub'],
  ];
  ctrlItems.forEach(([id, label], i) => {
    cells.push(v(id, label, S.ctrlItem, 375, 140 + i * 150, 260, 130));
  });

  // ── Application Layer (third column) ──
  const appItems = [
    ['a1', 'MediatR ISender\n[Command / Query dispatcher]'],
    ['a2', 'LoggingBehavior\n[Pipeline: logs every request]'],
    ['a3', 'ValidationBehavior\n[Pipeline: FluentValidation]'],
    ['a4', 'Auth Handlers\nRegisterUserCommand · LoginUserCommand\nGetCurrentUserQuery'],
    ['a5', 'Book Handlers\nCreateBook · UpdateBook · DeleteBook\nSearchBooks · GetBookById\nDownloadBook · UploadBookFile'],
    ['a6', 'Author / Genre / User Handlers\nCRUD + paged queries'],
  ];
  appItems.forEach(([id, label], i) => {
    cells.push(v(id, label, S.appItem, 735, 140 + i * 150, 460, 130));
  });

  // ── Infrastructure column ─────────────
  const infItems = [
    ['i1', 'AppDbContext  (EF Core)\n7 DbSets · soft-delete filters\nauto-UpdatedAt tracking'],
    ['i2', 'UnitOfWork + Repositories\nIBookRepository\nIUserRepository\nIAuthorRepository\nIGenreRepository\nIBookDownloadRepository'],
    ['i3', 'JwtTokenService\nHMAC-SHA256 · ExpiryInMinutes\nGenerateToken · ValidateToken'],
    ['i4', 'PasswordHashService\nBCrypt work factor 12'],
    ['i5', 'FileStorageService\n.epub only · genre sub-folders'],
    ['i6', 'CurrentUserService\nReads JWT claims\nfrom IHttpContextAccessor'],
  ];
  infItems.forEach(([id, label], i) => {
    cells.push(v(id, label, S.infrItem, 1300, 140 + i * 150, 430, 130));
  });

  // ── Arrow: middleware → controllers ───
  cells.push(e(uid(), 'routes to', 'mid7', 'c1', S.arr + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  // Controller → MediatR
  cells.push(e(uid(), 'sends command/query', 'c1', 'a1', S.arr + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  // MediatR → Handlers
  cells.push(e(uid(), 'dispatches', 'a1', 'a4', S.arr + 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;'));
  // Handlers → Infra
  cells.push(e(uid(), 'uses IUnitOfWork', 'a5', 'i2', S.arr + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));

  save('03-c4-component-api.drawio', wrap('C4 Level 3 – Component: Web API', 1800, 1100, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 4 — C4 Level 4: Code / Domain Layer Class Diagram
// ══════════════════════════════════════════════════════════════════════════════
function tableRows(baseX, baseY, colW, rows) {
  const cells = [];
  const rowH = 26;
  rows.forEach(([label, style], i) => {
    cells.push(v(uid(), label, style, baseX, baseY + rowH * i, colW, rowH));
  });
  return cells;
}

function classBox(cells, id, title, x, y, colW, fieldRows) {
  const rowH = 26;
  const h = 30 + rowH * fieldRows.length;
  cells.push(v(id + '_hdr', `<b>${title}</b>`, S.classHdr, x, y, colW, 30));
  fieldRows.forEach(([label, style], i) => {
    cells.push(v(`${id}_r${i}`, label, style || S.classRow, x, y + 30 + rowH * i, colW, rowH));
  });
  return { x, y, w: colW, h };
}

function diagram4_CodeDomain() {
  rst();
  const cells = [];
  const CW = 320; // column width per entity box

  cells.push(v('title', 'EBook Library — Domain Layer Class Diagram  (C4 Level 4)', S.titleBar, 20, 15, 1880, 55));
  cells.push(v('note', '«abstract» BaseEntity: Id · CreatedAt · UpdatedAt · IsDeleted', 'rounded=1;fillColor=#fff9c4;strokeColor=#f9a825;fontSize=10;html=1;', 20, 90, 500, 35));

  // ── Book ─────────────────────────────
  const book = classBox(cells, 'book', '«Entity»  Book  : BaseEntity', 40, 160, CW, [
    ['  Id : Guid  (PK)', S.classPK],
    ['  Title : string  NOT NULL max 500', S.classRow],
    ['  Pages : int', S.classAlt],
    ['  PublicationYear : int?', S.classRow],
    ['  Isbn : string?  max 20  unique', S.classAlt],
    ['  Description : string?  max 4000', S.classRow],
    ['  FilePath : string?  max 1000', S.classAlt],
    ['  CoverImagePath : string?  max 1000', S.classRow],
    ['  Language : BookLanguage  →  nvarchar(20)', S.classAlt],
    ['  Status : BookStatus  →  nvarchar(20)', S.classRow],
    ['  HasFile : bool  (computed)', S.classAlt],
    ['  BookAuthors : ICollection<BookAuthor>', S.classRow],
    ['  BookGenres : ICollection<BookGenre>', S.classAlt],
    ['  Downloads : ICollection<BookDownload>', S.classRow],
  ]);

  // ── BookAuthor join ───────────────────
  const ba = classBox(cells, 'ba', '«Join»  BookAuthor', 450, 160, CW - 20, [
    ['  BookId : Guid  (PK, FK → Books)', S.classPK],
    ['  AuthorId : Guid  (PK, FK → Authors)', S.classPK],
    ['  IsPrimary : bool  default true', S.classRow],
    ['  Book : Book  (nav)', S.classAlt],
    ['  Author : Author  (nav)', S.classRow],
  ]);

  // ── Author ────────────────────────────
  const auth = classBox(cells, 'author', '«Entity»  Author  : BaseEntity', 840, 160, CW, [
    ['  Id : Guid  (PK)', S.classPK],
    ['  Name : string  NOT NULL max 300', S.classRow],
    ['  Biography : string?  max 2000', S.classAlt],
    ['  BookAuthors : ICollection<BookAuthor>', S.classRow],
  ]);

  // ── BookGenre join ────────────────────
  const bg = classBox(cells, 'bg', '«Join»  BookGenre', 450, 450, CW - 20, [
    ['  BookId : Guid  (PK, FK → Books)', S.classPK],
    ['  GenreId : Guid  (PK, FK → Genres)', S.classPK],
    ['  Book : Book  (nav)', S.classRow],
    ['  Genre : Genre  (nav)', S.classAlt],
  ]);

  // ── Genre ────────────────────────────
  const genre = classBox(cells, 'genre', '«Entity»  Genre  : BaseEntity', 840, 450, CW, [
    ['  Id : Guid  (PK)', S.classPK],
    ['  Name : string  NOT NULL max 100  unique', S.classRow],
    ['  Description : string?  max 500', S.classAlt],
    ['  BookGenres : ICollection<BookGenre>', S.classRow],
  ]);

  // ── User ─────────────────────────────
  const user = classBox(cells, 'user', '«Entity»  User  : BaseEntity', 40, 550, CW, [
    ['  Id : Guid  (PK)', S.classPK],
    ['  Email : string  NOT NULL max 256  unique', S.classRow],
    ['  PasswordHash : string  max 500', S.classAlt],
    ['  FirstName : string?  max 100', S.classRow],
    ['  LastName : string?  max 100', S.classAlt],
    ['  Role : UserRole  →  nvarchar(20)', S.classRow],
    ['  IsActive : bool  default true', S.classAlt],
    ['  Downloads : ICollection<BookDownload>', S.classRow],
    ['  FullName : string?  (computed)', S.classAlt],
  ]);

  // ── BookDownload ──────────────────────
  const dl = classBox(cells, 'dl', '«Entity»  BookDownload', 1250, 350, CW, [
    ['  Id : Guid  (PK)', S.classPK],
    ['  UserId : Guid  (FK → Users  RESTRICT)', S.classRow],
    ['  BookId : Guid  (FK → Books  RESTRICT)', S.classAlt],
    ['  DownloadedAt : DateTime  UTC', S.classRow],
    ['  IpAddress : string?  max 45 (IPv6)', S.classAlt],
    ['  User : User  (nav)', S.classRow],
    ['  Book : Book  (nav)', S.classAlt],
  ]);

  // ── Enums ─────────────────────────────
  cells.push(v('e1', '<b>«enum»  UserRole</b><br/>Regular = 1<br/>Admin = 2', S.enumBox, 1250, 160, 260, 80));
  cells.push(v('e2', '<b>«enum»  BookLanguage</b><br/>Spanish = 1 · English = 2 · Other = 3', S.enumBox, 1250, 260, 260, 60));
  cells.push(v('e3', '<b>«enum»  BookStatus</b><br/>Available = 1 · Unavailable = 2 · Removed = 3', S.enumBox, 1250, 140, 260, 100));
  cells.push(v('vo', '<b>«ValueObject»  Email</b><br/>Value : string<br/>Create(email) : Email<br/>implicit string cast', S.voBox, 40, 860, 260, 80));

  // ── Relationships ─────────────────────
  const rel = 'endArrow=ERmany;startArrow=ERone;html=1;strokeColor=#666666;fontSize=9;labelBackgroundColor=#ffffff;';
  const rel1 = 'endArrow=ERone;startArrow=ERmany;html=1;strokeColor=#666666;fontSize=9;labelBackgroundColor=#ffffff;';
  cells.push(e(uid(), '1  has many', 'book_hdr', 'ba_hdr', rel + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'belongs to  1', 'ba_hdr', 'author_hdr', rel1 + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), '1  has many', 'book_hdr', 'bg_hdr', rel + 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), 'belongs to  1', 'bg_hdr', 'genre_hdr', rel1 + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), '1 : N downloads', 'user_hdr', 'dl_hdr', rel + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.7;entryDx=0;entryDy=0;'));
  cells.push(e(uid(), '1 : N downloads', 'book_hdr', 'dl_hdr', rel + 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.3;entryDx=0;entryDy=0;'));

  save('04-c4-code-domain.drawio', wrap('C4 Level 4 – Code: Domain Layer', 1600, 1000, cells));
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('Phase 2 — C4 Level 3 & 4 Diagrams');
try { diagram3_Component();  } catch (err) { console.error('  ✗  03:', err.message); }
try { diagram4_CodeDomain(); } catch (err) { console.error('  ✗  04:', err.message); }
console.log('Phase 2 complete.\n');
