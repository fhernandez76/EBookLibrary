'use strict';
// Phase 3 – Architecture Layers + Sequence Diagrams

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
  arr:      'endArrow=block;endFill=1;html=1;strokeColor=#555555;fontSize=10;labelBackgroundColor=#ffffff;',
  arrDown:  'endArrow=block;endFill=1;html=1;strokeColor=#555555;fontSize=10;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;labelBackgroundColor=#ffffff;',
};

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 5 — Clean Architecture Layers
// ══════════════════════════════════════════════════════════════════════════════
function diagram5_CleanArch() {
  rst();
  const cells = [];
  cells.push(v('title', 'EBook Library — Clean Architecture Layers', S.titleBar, 20, 15, 1560, 55));

  const layers = [
    { id:'l4', label:'Presentation Layer',  sub:'EBookLibrary.WebApi  |  EBookLibrary.Blazor  |  EBookLibrary.React', fill:'#e3f2fd', stroke:'#1565c0', font:'#1565c0', x:40,  w:1520, h:160 },
    { id:'l3', label:'Infrastructure Layer', sub:'EBookLibrary.Infrastructure  —  EF Core · SQL Server · BCrypt · JWT · FileStorage', fill:'#f3e5f5', stroke:'#6a1b9a', font:'#6a1b9a', x:120, w:1360, h:160 },
    { id:'l2', label:'Application Layer',   sub:'EBookLibrary.Application  —  MediatR CQRS · FluentValidation · AutoMapper · Pipeline Behaviors · DTOs', fill:'#e8f5e9', stroke:'#2e7d32', font:'#2e7d32', x:220, w:1160, h:160 },
    { id:'l1', label:'Domain Layer',        sub:'EBookLibrary.Domain  —  Entities · Enums · Value Objects · Repository Interfaces · Domain Events', fill:'#fff9c4', stroke:'#f9a825', font:'#6d4c41', x:320, w:960,  h:160 },
  ];

  let y = 100;
  layers.forEach(l => {
    const style = `rounded=1;fillColor=${l.fill};strokeColor=${l.stroke};fontColor=${l.font};fontSize=14;fontStyle=1;html=1;verticalAlign=top;`;
    cells.push(v(l.id, l.label, style, l.x, y, l.w, l.h));
    cells.push(v(l.id+'_sub', l.sub,
      `text;html=1;fontSize=10;align=center;verticalAlign=middle;fontColor=${l.font};`, l.x+20, y+45, l.w-40, 80));
    y += 180;
  });

  // Dependency arrows (outer depends on inner)
  y = 100;
  [layers[0],layers[1],layers[2]].forEach((l,i) => {
    const nxt = layers[i+1];
    const ay = y + l.h / 2;
    cells.push(v(uid(), 'depends on →',
      `text;html=1;fontSize=10;fontStyle=2;align=center;fontColor=#888888;`, 1320, ay - 10, 120, 20));
    y += 180;
  });

  // Legend
  const LX = 1320, LY = 830;
  cells.push(v('leg', 'Dependency Rule:\nOuter layers depend on inner layers.\nInner layers are unaware of outer ones.\nArrows point inward.',
    'rounded=1;fillColor=#fffde7;strokeColor=#f57f17;fontSize=10;html=1;whiteSpace=wrap;', LX, LY, 260, 100));

  save('05-clean-architecture-layers.drawio', wrap('Clean Architecture Layers', 1600, 1000, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 6 — Dependency Flow
// ══════════════════════════════════════════════════════════════════════════════
function diagram6_DependencyFlow() {
  rst();
  const cells = [];
  cells.push(v('title', 'EBook Library — Dependency Flow  (Clean Architecture)', S.titleBar, 20, 15, 1560, 55));

  const boxes = [
    { id:'p', label:'<b>Presentation</b><br/><i>WebApi · Blazor · React</i>', fill:'#e3f2fd', stroke:'#1565c0', x:50  },
    { id:'a', label:'<b>Application</b><br/><i>CQRS · Validators · DTOs</i>', fill:'#e8f5e9', stroke:'#2e7d32', x:380 },
    { id:'d', label:'<b>Domain</b><br/><i>Entities · Interfaces</i>',         fill:'#fff9c4', stroke:'#f9a825', x:710 },
    { id:'i', label:'<b>Infrastructure</b><br/><i>EF Core · Services</i>',     fill:'#f3e5f5', stroke:'#6a1b9a', x:380, y2: true },
  ];

  const BY=280, BW=280, BH=120;
  boxes.forEach(b => {
    const style = `rounded=1;fillColor=${b.fill};strokeColor=${b.stroke};fontSize=13;fontStyle=0;html=1;whiteSpace=wrap;`;
    const bY = b.y2 ? BY + 200 : BY;
    cells.push(v(b.id, b.label, style, b.x, bY, BW, BH));
  });

  // Arrows
  const EA='endArrow=block;endFill=1;html=1;strokeColor=#555555;fontSize=9;labelBackgroundColor=#ffffff;';
  cells.push(`<mxCell id="${uid()}" value="depends on" style="${xe(EA)}" edge="1" source="p" target="a" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${uid()}" value="depends on" style="${xe(EA)}" edge="1" source="a" target="d" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${uid()}" value="implements interfaces\n(Dependency Inversion)" style="${xe(EA)}" edge="1" source="i" target="a" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${uid()}" value="implements interfaces" style="${xe(EA)}" edge="1" source="i" target="d" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`);

  // Notes
  cells.push(v('n1', 'Key: Infrastructure does NOT depend on WebApi.\nWebApi does NOT reference Infrastructure directly.\nDependency Inversion through Interfaces in Domain.',
    'rounded=1;fillColor=#fff8e1;strokeColor=#f9a825;fontSize=10;html=1;whiteSpace=wrap;', 750, 420, 460, 80));

  save('06-dependency-flow.drawio', wrap('Dependency Flow', 1300, 600, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// Sequence diagram builder
// ══════════════════════════════════════════════════════════════════════════════
function buildSequence(title, participants, messages) {
  rst();
  const cells = [];
  const PW = 175, PH = 50, PGAP = 25;
  const MSGY0 = 140, STEP = 62;

  const nMsg  = messages.length;
  const nPart = participants.length;
  const totalW = 40 + nPart * (PW + PGAP) + 40;
  const totalH = MSGY0 + nMsg * STEP + 80;

  cells.push(v('title', title, S.titleBar, 20, 15, totalW - 40, 50));

  const cx = {};
  participants.forEach((p, i) => {
    const x = 40 + i * (PW + PGAP);
    const c = x + PW / 2;
    cx[p.id] = c;
    const style = `rounded=1;fillColor=${p.color || '#1e3a5f'};strokeColor=#0d2a4a;fontColor=#ffffff;fontSize=10;fontStyle=1;html=1;whiteSpace=wrap;`;
    cells.push(v(`p${i}`, p.label, style, x, 75, PW, PH));
    // lifeline
    cells.push(`<mxCell id="ll${i}" value="" style="endArrow=none;dashed=1;dashPattern=8 4;html=1;strokeColor=#aaaaaa;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${c}" y="${75+PH}" as="sourcePoint"/><mxPoint x="${c}" y="${totalH-20}" as="targetPoint"/></mxGeometry></mxCell>`);
  });

  messages.forEach((m, i) => {
    const y = MSGY0 + i * STEP;
    const x1 = cx[m.from];
    const x2 = cx[m.to] || x1 + 40; // self-message fallback
    const isSelf = m.from === m.to;
    const isRet  = !!m.ret;
    const ea = isRet
      ? 'endArrow=open;endFill=0;dashed=1;html=1;fontSize=9;labelBackgroundColor=#ffffff;'
      : 'endArrow=block;endFill=1;html=1;fontSize=9;labelBackgroundColor=#ffffff;';

    if (isSelf) {
      // Self-arrow: right-bent loop
      cells.push(`<mxCell id="m${i}" value="${xe(m.label)}" style="${xe(ea)}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y}" as="sourcePoint"/><mxPoint x="${x1}" y="${y+30}" as="targetPoint"/><Array as="points"><mxPoint x="${x1+40}" y="${y}"/><mxPoint x="${x1+40}" y="${y+30}"/></Array></mxGeometry></mxCell>`);
    } else {
      cells.push(`<mxCell id="m${i}" value="${xe(m.label)}" style="${xe(ea)}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y}" as="sourcePoint"/><mxPoint x="${x2}" y="${y}" as="targetPoint"/></mxGeometry></mxCell>`);
    }

    // Optional annotation box
    if (m.note) {
      const nx = Math.min(x1,x2) + Math.abs(x2-x1)*0.4;
      cells.push(v(uid(), m.note, 'text;html=1;fontSize=8;fontStyle=2;align=center;fontColor=#888888;', nx-60, y+6, 120, 18));
    }
  });

  return { xml: wrap(title, totalW, totalH, cells), totalW, totalH };
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 7 — Sequence: User Registration
// ══════════════════════════════════════════════════════════════════════════════
function diagram7_SeqRegister() {
  const { xml } = buildSequence(
    'Sequence — User Registration  (POST /api/auth/register)',
    [
      { id:'client',  label:'Client\n(Browser / SPA)',   color:'#37474f' },
      { id:'mw',      label:'ExceptionMiddleware\n+ Auth Middleware', color:'#c62828' },
      { id:'ctrl',    label:'AuthController', color:'#1e3a5f' },
      { id:'med',     label:'MediatR\nPipeline',          color:'#6a1b9a' },
      { id:'val',     label:'ValidationBehavior\n(FluentValidation)', color:'#6a1b9a' },
      { id:'handler', label:'RegisterUserCommand\nHandler',           color:'#1565c0' },
      { id:'uow',     label:'IUnitOfWork\nUserRepository',            color:'#2e7d32' },
      { id:'pwd',     label:'IPasswordHash\nService',                 color:'#e65100' },
      { id:'jwt',     label:'IJwtToken\nService',                     color:'#e65100' },
    ],
    [
      { from:'client',  to:'mw',      label:'POST /api/auth/register  {email, password, confirm, firstName, lastName}' },
      { from:'mw',      to:'ctrl',    label:'(passes through — no auth required on /register)' },
      { from:'ctrl',    to:'med',     label:'ISender.Send(RegisterUserCommand)' },
      { from:'med',     to:'val',     label:'pipe → ValidationBehavior' },
      { from:'val',     to:'val',     label:'Validate: email format · password rules · confirm match', ret:true },
      { from:'val',     to:'handler', label:'passes validation → handler.Handle()' },
      { from:'handler', to:'uow',     label:'UserRepository.EmailExistsAsync(email)' },
      { from:'uow',     to:'handler', label:'returns false  (email not found)', ret:true },
      { from:'handler', to:'pwd',     label:'PasswordHashService.HashPassword(password)' },
      { from:'pwd',     to:'handler', label:'returns BCrypt hash (work factor 12)', ret:true },
      { from:'handler', to:'handler', label:'User.Create(email, passwordHash)' },
      { from:'handler', to:'uow',     label:'UserRepository.AddAsync(user)' },
      { from:'handler', to:'uow',     label:'UnitOfWork.SaveChangesAsync()' },
      { from:'uow',     to:'handler', label:'returns 1 (row saved)', ret:true },
      { from:'handler', to:'jwt',     label:'JwtTokenService.GenerateToken(userId, email, "Regular")' },
      { from:'jwt',     to:'handler', label:'returns signed JWT string', ret:true },
      { from:'handler', to:'ctrl',    label:'returns AuthResponseDto { Token, Email, Role, ExpiresAt }', ret:true },
      { from:'ctrl',    to:'client',  label:'201 Created   ApiResponse<AuthResponseDto>', ret:true },
    ]
  );
  save('07-seq-user-registration.drawio', xml);
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 8 — Sequence: Book Search
// ══════════════════════════════════════════════════════════════════════════════
function diagram8_SeqSearch() {
  const { xml } = buildSequence(
    'Sequence — Book Search  (GET /api/books/search)',
    [
      { id:'client',  label:'Client\n(Browser / SPA)', color:'#37474f' },
      { id:'ctrl',    label:'BooksController',          color:'#1e3a5f' },
      { id:'med',     label:'MediatR\nPipeline',         color:'#6a1b9a' },
      { id:'handler', label:'SearchBooksQuery\nHandler', color:'#1565c0' },
      { id:'repo',    label:'IBookRepository',           color:'#2e7d32' },
      { id:'db',      label:'AppDbContext\n(SQL Server)', color:'#2e7d32' },
      { id:'mapper',  label:'AutoMapper',                color:'#e65100' },
    ],
    [
      { from:'client',  to:'ctrl',    label:'GET /api/books/search?title=xyz&pageNumber=1&pageSize=20  [no auth required]' },
      { from:'ctrl',    to:'med',     label:'ISender.Send(SearchBooksQuery(BookSearchFilterDto))' },
      { from:'med',     to:'handler', label:'passes logging → validation → handler' },
      { from:'handler', to:'repo',    label:'IBookRepository.SearchAsync(title, authorName, genreName, year, page, size)' },
      { from:'repo',    to:'db',      label:'EF Core LINQ: WHERE title LIKE · Include Authors/Genres · OrderBy Title · Skip/Take' },
      { from:'db',      to:'repo',    label:'returns (IEnumerable<Book>, totalCount)', ret:true },
      { from:'repo',    to:'handler', label:'returns (books, 25)', ret:true },
      { from:'handler', to:'mapper',  label:'IMapper.Map<BookSummaryDto>(book) × N' },
      { from:'mapper',  to:'handler', label:'returns BookSummaryDto[]', ret:true },
      { from:'handler', to:'ctrl',    label:'PagedResult<BookSummaryDto> { Items, TotalCount=25, TotalPages=2, HasNext=true }', ret:true },
      { from:'ctrl',    to:'client',  label:'200 OK  ApiResponse<PagedResult<BookSummaryDto>>', ret:true },
    ]
  );
  save('08-seq-book-search.drawio', xml);
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 9 — Sequence: Book Download
// ══════════════════════════════════════════════════════════════════════════════
function diagram9_SeqDownload() {
  const { xml } = buildSequence(
    'Sequence — Book Download  (GET /api/books/{id}/download)',
    [
      { id:'client',  label:'Client\n(Authenticated)', color:'#37474f' },
      { id:'authmw',  label:'Authentication\nMiddleware',   color:'#c62828' },
      { id:'ctrl',    label:'BooksController',              color:'#1e3a5f' },
      { id:'handler', label:'DownloadBookCommand\nHandler', color:'#1565c0' },
      { id:'cur',     label:'ICurrentUser\nService',        color:'#e65100' },
      { id:'book',    label:'IBookRepository',              color:'#2e7d32' },
      { id:'dlRepo',  label:'IBookDownload\nRepository',    color:'#2e7d32' },
      { id:'file',    label:'IFileStorage\nService',        color:'#e65100' },
    ],
    [
      { from:'client',  to:'authmw',  label:'GET /api/books/{id}/download  Authorization: Bearer <token>' },
      { from:'authmw',  to:'authmw',  label:'ValidateToken() → ClaimsPrincipal set on HttpContext' },
      { from:'authmw',  to:'ctrl',    label:'request proceeds (authenticated)' },
      { from:'ctrl',    to:'handler', label:'ISender.Send(DownloadBookCommand(bookId))' },
      { from:'handler', to:'cur',     label:'ICurrentUserService.IsAuthenticated' },
      { from:'cur',     to:'handler', label:'true  (UserId = Guid)', ret:true },
      { from:'handler', to:'book',    label:'IBookRepository.GetByIdAsync(bookId)' },
      { from:'book',    to:'handler', label:'returns Book (Status=Available, HasFile=true)', ret:true },
      { from:'handler', to:'handler', label:'check book.HasFile → true' },
      { from:'handler', to:'dlRepo',  label:'BookDownloadRepository.AddAsync(BookDownload.Create(...))' },
      { from:'handler', to:'dlRepo',  label:'UnitOfWork.SaveChangesAsync()' },
      { from:'handler', to:'file',    label:'FileStorageService.GetAbsolutePath(book.FilePath)' },
      { from:'file',    to:'handler', label:'returns "C:\\ebooks\\fiction\\book.epub"', ret:true },
      { from:'handler', to:'ctrl',    label:'DownloadBookResult { AbsoluteFilePath, FileName }', ret:true },
      { from:'ctrl',    to:'client',  label:'200 OK  PhysicalFile(path, "application/epub+zip")  (file stream)', ret:true },
    ]
  );
  save('09-seq-book-download.drawio', xml);
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 10 — Sequence: Admin Create Book
// ══════════════════════════════════════════════════════════════════════════════
function diagram10_SeqCreateBook() {
  const { xml } = buildSequence(
    'Sequence — Admin Create Book  (POST /api/books)',
    [
      { id:'admin',   label:'Admin Client',             color:'#4a148c' },
      { id:'ctrl',    label:'BooksController\n[Authorize(Admin)]', color:'#1e3a5f' },
      { id:'val',     label:'ValidationBehavior',       color:'#6a1b9a' },
      { id:'handler', label:'CreateBookCommand\nHandler',          color:'#1565c0' },
      { id:'authors', label:'IAuthorRepository',        color:'#2e7d32' },
      { id:'genres',  label:'IGenreRepository',         color:'#2e7d32' },
      { id:'books',   label:'IBookRepository',          color:'#2e7d32' },
      { id:'uow',     label:'IUnitOfWork\n(DB commit)', color:'#2e7d32' },
    ],
    [
      { from:'admin',   to:'ctrl',    label:'POST /api/books  { title, pages, language, authorIds:[], genreIds:[] }  Roles=Admin check passes' },
      { from:'ctrl',    to:'val',     label:'ISender.Send(CreateBookCommand)  →  ValidationBehavior' },
      { from:'val',     to:'val',     label:'Validate: title required · pages ≥ 0 · language valid enum · authorIds not empty' },
      { from:'val',     to:'handler', label:'passes → handler.Handle()' },
      { from:'handler', to:'authors', label:'foreach authorId: IAuthorRepository.GetByIdAsync(authorId)' },
      { from:'authors', to:'handler', label:'returns Author entity (or throws NotFoundException)', ret:true },
      { from:'handler', to:'genres',  label:'foreach genreId: IGenreRepository.GetByIdAsync(genreId)' },
      { from:'genres',  to:'handler', label:'returns Genre entity', ret:true },
      { from:'handler', to:'handler', label:'Book.Create(title, pages, language)' },
      { from:'handler', to:'handler', label:'book.BookAuthors.Add(new BookAuthor { IsPrimary=true })' },
      { from:'handler', to:'handler', label:'book.BookGenres.Add(new BookGenre)' },
      { from:'handler', to:'books',   label:'IBookRepository.AddAsync(book)' },
      { from:'handler', to:'uow',     label:'UnitOfWork.SaveChangesAsync()' },
      { from:'uow',     to:'handler', label:'returns 1  (persisted)', ret:true },
      { from:'handler', to:'ctrl',    label:'returns book.Id : Guid', ret:true },
      { from:'ctrl',    to:'admin',   label:'201 Created  ApiResponse<Guid> { Data: "new-book-guid" }', ret:true },
    ]
  );
  save('10-seq-admin-create-book.drawio', xml);
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 11 — Sequence: API Request Pipeline
// ══════════════════════════════════════════════════════════════════════════════
function diagram11_SeqPipeline() {
  const { xml } = buildSequence(
    'Sequence — ASP.NET Core Request Pipeline  (any authenticated API request)',
    [
      { id:'client', label:'Client',               color:'#37474f' },
      { id:'exc',    label:'Exception\nMiddleware', color:'#c62828' },
      { id:'sec',    label:'Security\nHeaders',     color:'#b71c1c' },
      { id:'https',  label:'HTTPS\nRedirection',    color:'#880e4f' },
      { id:'cors',   label:'CORS\nMiddleware',      color:'#6a1b9a' },
      { id:'rate',   label:'Rate\nLimiter',         color:'#4527a0' },
      { id:'auth',   label:'Authentication\n(JWT)', color:'#283593' },
      { id:'authz',  label:'Authorization\n[Roles]', color:'#01579b' },
      { id:'ctrl',   label:'Controller\n+ Handler', color:'#1e3a5f' },
    ],
    [
      { from:'client', to:'exc',   label:'HTTP/HTTPS request' },
      { from:'exc',    to:'sec',   label:'try { next(context) }  — wraps entire pipeline in try/catch' },
      { from:'sec',    to:'https', label:'adds: X-Frame-Options: DENY · X-XSS-Protection · Referrer-Policy' },
      { from:'https',  to:'cors',  label:'301 redirect HTTP→HTTPS (if scheme=http)' },
      { from:'cors',   to:'rate',  label:'CORS headers: Access-Control-Allow-Origin from AllowedOrigins config' },
      { from:'rate',   to:'auth',  label:'check window limit (auth endpoints: 10 req/min) — 429 if exceeded' },
      { from:'auth',   to:'authz', label:'JWT Bearer: validate signature · issuer · audience · expiry · ClockSkew=0' },
      { from:'authz',  to:'ctrl',  label:'[Authorize] check / [Authorize(Roles="Admin")] check — 403 if fails' },
      { from:'ctrl',   to:'authz', label:'200 OK  ApiResponse<T>', ret:true },
      { from:'authz',  to:'auth',  label:'', ret:true },
      { from:'auth',   to:'rate',  label:'', ret:true },
      { from:'rate',   to:'cors',  label:'', ret:true },
      { from:'cors',   to:'https', label:'', ret:true },
      { from:'https',  to:'sec',   label:'', ret:true },
      { from:'sec',    to:'exc',   label:'', ret:true },
      { from:'exc',    to:'client', label:'response with OWASP security headers', ret:true },
    ]
  );
  save('11-seq-api-pipeline.drawio', xml);
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('Phase 3 — Architecture Layers + Sequence Diagrams');
try { diagram5_CleanArch();    } catch (err) { console.error('  ✗  05:', err.message); }
try { diagram6_DependencyFlow();} catch (err) { console.error('  ✗  06:', err.message); }
try { diagram7_SeqRegister();  } catch (err) { console.error('  ✗  07:', err.message); }
try { diagram8_SeqSearch();    } catch (err) { console.error('  ✗  08:', err.message); }
try { diagram9_SeqDownload();  } catch (err) { console.error('  ✗  09:', err.message); }
try { diagram10_SeqCreateBook();} catch (err) { console.error('  ✗  10:', err.message); }
try { diagram11_SeqPipeline(); } catch (err) { console.error('  ✗  11:', err.message); }
console.log('Phase 3 complete.\n');
