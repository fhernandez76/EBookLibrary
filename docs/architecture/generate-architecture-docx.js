'use strict';
// generate-architecture-docx.js
// Generates ARCHITECTURE.docx with all 17 diagrams embedded as JPEG images
// Uses the docx package from the parent docs/node_modules/

const fs   = require('fs');
const path = require('path');

// Resolve docx from parent docs/ folder
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle, WidthType,
  AlignmentType, ShadingType, Header, Footer,
  PageNumber, NumberFormat, UnderlineType,
  ImageRun, convertInchesToTwip, PageBreak,
} = require('../node_modules/docx');

const IMG_DIR  = path.join(__dirname, 'images');
const OUT_FILE = path.join(__dirname, 'ARCHITECTURE.docx');

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY      = '1A3C7C';
const BURGUNDY  = 'B0133A';
const DARK_GRAY = '333333';
const CODE_BG   = 'F5F5F5';
const TBL_HDR   = '1A3C7C';
const TBL_ALT   = 'EEF2F8';

// ── Helpers ───────────────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    border: { bottom: { color: NAVY, size: 4, value: BorderStyle.SINGLE } },
    children: [new TextRun({ text, bold: true, size: 36, color: NAVY, font: 'Cambria' })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: BURGUNDY, font: 'Cambria' })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: DARK_GRAY, font: 'Calibri' })],
  });
}
function p(text, opts = {}) {
  if (!text.trim()) return new Paragraph({ children: [new TextRun({ text: '' })] });
  return new Paragraph({
    spacing: { after: 120, before: 60 },
    children: inlineRuns(text),
    ...opts,
  });
}
function inlineRuns(text) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|([^`*]+|\*(?!\*))/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) runs.push(new TextRun({ text: m[1], bold: true, font:'Calibri', size:22 }));
    else if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], font:'Courier New', size:20, color:BURGUNDY, shading:{type:ShadingType.SOLID,color:'F0F0F0',fill:'F0F0F0'} }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], font:'Calibri', size:22 }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text, font:'Calibri', size:22 }));
  return runs;
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: inlineRuns(text),
  });
}
function code(lines) {
  return lines.map(line => new Paragraph({
    spacing: { after: 40 },
    shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
    children: [new TextRun({ text: line || ' ', font:'Courier New', size:18 })],
  }));
}
function blank() {
  return new Paragraph({ children: [new TextRun({ text: '' })] });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function caption(text) {
  return new Paragraph({
    spacing: { before: 60, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, italics: true, size: 18, color: '666666', font: 'Calibri' })],
  });
}

// Load a JPEG image and return an ImageRun paragraph
function imagePara(jpgName, widthPt, heightPt, alt) {
  const jpgPath = path.join(IMG_DIR, jpgName);
  if (!fs.existsSync(jpgPath)) {
    return [p(`[Image not found: ${jpgName}]`)];
  }
  const data = fs.readFileSync(jpgPath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          data,
          transformation: { width: widthPt, height: heightPt },
          type: 'jpg',
        }),
      ],
    }),
  ];
}

function makeTable(headers, rows) {
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { type: ShadingType.SOLID, fill: TBL_HDR, color: TBL_HDR },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing:{before:60,after:60},
          children: [new TextRun({ text: h, bold: true, color:'FFFFFF', font:'Calibri', size:18 })] })],
      })),
    }),
    ...rows.map((row, ri) => new TableRow({
      children: row.map(cell => new TableCell({
        shading: ri % 2 !== 0 ? { type: ShadingType.SOLID, fill: TBL_ALT, color: TBL_ALT } : undefined,
        children: [new Paragraph({ spacing:{before:40,after:40}, children: inlineRuns(cell) })],
      })),
    })),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom:        { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:          { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:         { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideH:       { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideV:       { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });
}

// ── Image dimensions (width × height in points, 1pt = 1/72 inch) ──────────────
// Target: ~6.5-inch wide page area = 468pt wide
// Original diagram canvases: ~1600 × 1050px → aspect ratio ≈ 1.52
const WIDE  = { w: 460, ratio: 1.52 };   // standard landscape
const TALL  = { w: 460, ratio: 0.80 };   // sequence portrait-ish
const XWIDE = { w: 460, ratio: 1.70 };   // extra wide DB diagrams

function imgW(spec) { return [ Math.round(spec.w), Math.round(spec.w / spec.ratio) ]; }

// Diagram specs: [filename, width, height, caption]
const DIAGRAMS = {
  c4l1:  ['01-c4-system-context.jpg',   ...imgW(WIDE),  'Figure 1 — C4 Level 1: System Context Diagram'],
  c4l2:  ['02-c4-container.jpg',        ...imgW(WIDE),  'Figure 2 — C4 Level 2: Container Diagram'],
  c4l3:  ['03-c4-component-api.jpg',    ...imgW({w:460,ratio:1.64}), 'Figure 3 — C4 Level 3: Component Diagram (Web API)'],
  c4l4:  ['04-c4-code-domain.jpg',      ...imgW({w:460,ratio:1.60}), 'Figure 4 — C4 Level 4: Domain Layer Class Diagram'],
  arch:  ['05-clean-architecture-layers.jpg', ...imgW({w:460,ratio:1.60}), 'Figure 5 — Clean Architecture Layers'],
  dep:   ['06-dependency-flow.jpg',     ...imgW({w:400,ratio:2.20}), 'Figure 6 — Dependency Flow'],
  seq1:  ['07-seq-user-registration.jpg',...imgW({w:460,ratio:2.00}), 'Figure 7 — Sequence Diagram: User Registration'],
  seq2:  ['08-seq-book-search.jpg',     ...imgW({w:440,ratio:1.70}), 'Figure 8 — Sequence Diagram: Book Search'],
  seq3:  ['09-seq-book-download.jpg',   ...imgW({w:460,ratio:2.00}), 'Figure 9 — Sequence Diagram: Book Download'],
  seq4:  ['10-seq-admin-create-book.jpg',...imgW({w:460,ratio:2.00}), 'Figure 10 — Sequence Diagram: Admin Create Book'],
  seq5:  ['11-seq-api-pipeline.jpg',    ...imgW({w:460,ratio:2.10}), 'Figure 11 — Sequence Diagram: API Request Pipeline'],
  er:    ['12-db-er-diagram.jpg',       ...imgW({w:460,ratio:2.00}), 'Figure 12 — Database Entity Relationship Diagram'],
  tbl:   ['13-db-table-details.jpg',    ...imgW(XWIDE), 'Figure 13 — Database Table Details'],
  ui1:   ['14-ui-home-page.jpg',        ...imgW({w:440,ratio:1.14}), 'Figure 14 — UI Mockup: Home Page'],
  ui2:   ['15-ui-login-register.jpg',   ...imgW({w:400,ratio:1.25}), 'Figure 15 — UI Mockup: Login / Register'],
  ui3:   ['16-ui-admin-dashboard.jpg',  ...imgW({w:460,ratio:1.37}), 'Figure 16 — UI Mockup: Admin Dashboard'],
  ui4:   ['17-ui-book-detail.jpg',      ...imgW({w:440,ratio:1.22}), 'Figure 17 — UI Mockup: Book Detail Page'],
};
function img(key) {
  const [fn, w, h, cap] = DIAGRAMS[key];
  return [...imagePara(fn, w, h, cap), caption(cap)];
}

// ── Build document ─────────────────────────────────────────────────────────────
const sections = [];

// ── Cover page ────────────────────────────────────────────────────────────────
sections.push(
  new Paragraph({
    spacing: { before: 2000, after: 400 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'EBook Library', bold: true, size: 72, color: NAVY, font: 'Cambria' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'Architecture Documentation', bold: true, size: 48, color: BURGUNDY, font: 'Cambria' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 2000 },
    children: [new TextRun({ text: 'ASP.NET Core 10  ·  Blazor WASM  ·  React  ·  SQL Server', size: 28, color: '555555', font: 'Calibri' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'April 2026', size: 22, color: '888888', font: 'Calibri' })],
  }),
  pageBreak(),
);

// ── Section 1: System Overview ────────────────────────────────────────────────
sections.push(
  h1('1. System Overview'),
  p('EBook Library is a full-stack ebook management and distribution platform built on .NET 10. It provides a REST API for catalog management and authenticated ebook downloads, with two SPA frontends (Blazor WebAssembly and React + TypeScript) and JWT role-based security.'),
  blank(),
  h2('Projects'),
  makeTable(
    ['Project', 'Type', 'Responsibility'],
    [
      ['EBookLibrary.Domain', 'Class Library', 'Entities · Enums · Value Objects · Repository Interfaces · Domain Events'],
      ['EBookLibrary.Application', 'Class Library', 'CQRS Handlers (MediatR) · FluentValidation · AutoMapper · Pipeline Behaviors · DTOs'],
      ['EBookLibrary.Infrastructure', 'Class Library', 'EF Core 10 · SQL Server · BCrypt · JWT · FileStorage · Repository implementations'],
      ['EBookLibrary.WebApi', 'ASP.NET Core 10 API', 'REST controllers · Middleware pipeline · OpenAPI + Scalar · Rate limiting'],
      ['EBookLibrary.Blazor', 'Blazor WebAssembly', 'Primary SPA — 11 pages · Auth state · JWT interceptor'],
      ['EBookLibrary.React', 'Vite + React + TypeScript', 'Alternative SPA — Tailwind CSS · Axios'],
      ['*.Tests (3 projects)', 'xUnit', '67 tests total — Domain · Application · WebApi integration'],
    ]
  ),
  blank(),
  pageBreak(),
);

// ── Section 2: Architecture Principles ────────────────────────────────────────
sections.push(
  h1('2. Architecture Principles'),
  h2('Clean Architecture (Dependency Rule)'),
  p('Source code dependencies point only inward. Inner layers (Domain, Application) have no knowledge of outer layers (Infrastructure, WebApi). This is enforced by C# project references — WebApi cannot reference Infrastructure directly.'),
  blank(),
  ...code([
    'Presentation  →  Application  →  Domain',
    '                    ↑',
    'Infrastructure  ────┘  (implements Domain interfaces)',
  ]),
  blank(),
  h2('CQRS with MediatR'),
  p('All operations are expressed as Commands (write) or Queries (read), dispatched through MediatR\'s `ISender`. The pipeline applies two behaviors to every request:'),
  bullet('`LoggingBehavior` — logs request name and execution time'),
  bullet('`ValidationBehavior` — runs all FluentValidation validators; throws `ApplicationValidationException` on failure'),
  blank(),
  h2('Soft Delete'),
  p('Entities are never physically deleted. `BaseEntity.IsDeleted = true` marks them as deleted. EF Core global query filters (`WHERE IsDeleted = 0`) make deleted records transparent to all queries.'),
  blank(),
  pageBreak(),
);

// ── Section 3: C4 Architecture Diagrams ───────────────────────────────────────
sections.push(
  h1('3. C4 Architecture Diagrams'),
  p('The following diagrams follow the C4 Model (Simon Brown) — four levels of abstraction from system context down to individual class relationships.'),
  blank(),

  h2('3.1 Level 1 — System Context'),
  ...img('c4l1'),
  blank(),
  p('The **EBook Library System** is the central software system. Two user personas interact with it: Regular Users (browse and download ebooks) and Admin Users (manage the catalog). The system stores data in SQL Server and .epub files in the local file system.'),
  blank(),

  h2('3.2 Level 2 — Container Diagram'),
  ...img('c4l2'),
  blank(),
  p('Inside the system boundary, four containers work together. The Blazor WASM SPA and React SPA are both delivered to the browser and make HTTPS calls to the Web API using JWT Bearer tokens. The Web API uses EF Core (AppDbContext) to read/write to SQL Server and the FileStorageService to manage epub files.'),
  blank(),
  makeTable(
    ['Container', 'Technology', 'Description'],
    [
      ['Blazor WASM SPA', 'Blazor WebAssembly (.NET 10)', 'Primary SPA — 11 pages, JWT auth, served at port 5001'],
      ['React SPA', 'React 18 + TypeScript + Vite', 'Alternative SPA — Tailwind CSS, served at port 3000'],
      ['Web API', 'ASP.NET Core 10', 'REST API — JWT auth, rate limiting, CQRS, OpenAPI + Scalar at port 5000'],
      ['AppDbContext', 'EF Core 10 + SQL Server', 'Code-First DbContext — 7 entities, global filters, auto-migrations'],
    ]
  ),
  blank(),

  h2('3.3 Level 3 — Component Diagram (Web API)'),
  ...img('c4l3'),
  blank(),
  p('The Web API container decomposes into four areas: a middleware pipeline (7 ordered stages), 6 controllers, an application layer (MediatR + CQRS handlers), and infrastructure services. All controller actions dispatch Commands or Queries through MediatR, which routes through `LoggingBehavior → ValidationBehavior → Handler`.'),
  blank(),

  h2('3.4 Level 4 — Code / Domain Layer Class Diagram'),
  ...img('c4l4'),
  blank(),
  p('The Domain layer contains 6 core entities (Book, User, Author, Genre, BookAuthor, BookGenre) and 1 audit entity (BookDownload). All primary entities extend `BaseEntity` (Id, CreatedAt, UpdatedAt, IsDeleted). Join entities use composite primary keys.'),
  blank(),
  pageBreak(),
);

// ── Section 4: Architecture Layer Diagrams ────────────────────────────────────
sections.push(
  h1('4. Architecture Layer Diagrams'),

  h2('4.1 Clean Architecture Layers'),
  ...img('arch'),
  blank(),
  p('The four concentric layers show how the solution is structured. Each outer layer can see all inner layers, but inner layers cannot reference outer ones:'),
  bullet('**Domain** — no dependencies; pure C# classes and interfaces'),
  bullet('**Application** — depends on Domain; uses interfaces only (no EF Core, no HTTP)'),
  bullet('**Infrastructure** — depends on Application; implements all interfaces using EF Core, BCrypt, JWT'),
  bullet('**Presentation** — depends on Application; hosts controllers, middleware, and serves the SPAs'),
  blank(),

  h2('4.2 Dependency Flow'),
  ...img('dep'),
  blank(),
  p('The key insight: Infrastructure depends on Application (to implement its interfaces), and WebApi depends on Application (to dispatch commands/queries). Neither Infrastructure nor WebApi are known to the Application or Domain layers. This is the **Dependency Inversion Principle** in practice.'),
  blank(),
  pageBreak(),
);

// ── Section 5: Sequence Diagrams ──────────────────────────────────────────────
sections.push(
  h1('5. Sequence Diagrams'),
  p('The following diagrams show the message flow for the five most important operations in the system.'),
  blank(),

  h2('5.1 User Registration'),
  ...img('seq1'),
  blank(),
  p('The registration flow validates input via FluentValidation before executing any business logic, hashes the password with BCrypt (work factor 12), persists the user to SQL Server via EF Core, and returns a JWT token on success.'),
  blank(),

  h2('5.2 Book Search'),
  ...img('seq2'),
  blank(),
  p('Book search is entirely anonymous — no authentication required. The `BookRepository.SearchAsync()` method builds a dynamic LINQ query and returns a paged result. AutoMapper transforms domain `Book` entities to `BookSummaryDto` records for the API response.'),
  blank(),

  h2('5.3 Book Download'),
  ...img('seq3'),
  blank(),
  p('Downloading requires authentication. The middleware validates the JWT Bearer token before the request reaches the controller. Every successful download is logged as a `BookDownload` audit record with the user ID, book ID, timestamp, and IP address.'),
  blank(),

  h2('5.4 Admin Create Book'),
  ...img('seq4'),
  blank(),
  p('Creating a book requires the Admin role. Both author and genre IDs are validated against the database before the book is persisted. The new book starts with `Status = Unavailable` — it becomes `Available` only after an epub file is uploaded via the Files endpoint.'),
  blank(),

  h2('5.5 API Request Pipeline'),
  ...img('seq5'),
  blank(),
  p('Every API request traverses 7 middleware stages in order. Security headers are added on both request and response passes. Rate limiting, authentication, and authorization all run before the request reaches any controller. Any exception at any stage is caught by `ExceptionHandlingMiddleware` and converted to an `ApiResponse` with the appropriate HTTP status code (400, 401, 403, 404, or 500).'),
  blank(),
  pageBreak(),
);

// ── Section 6: Database Diagrams ──────────────────────────────────────────────
sections.push(
  h1('6. Database Diagrams'),

  h2('6.1 Entity Relationship Diagram'),
  ...img('er'),
  blank(),
  p('The database has 7 tables connected by 6 foreign key relationships. Books form the center — they have many-to-many relationships with both Authors and Genres (through explicit join tables with additional columns), and a one-to-many relationship with BookDownloads. Users also have a one-to-many relationship with BookDownloads.'),
  blank(),
  makeTable(
    ['Relationship', 'Cardinality', 'Delete Rule'],
    [
      ['Books → BookAuthors', '1 : N', 'CASCADE — deleting a book removes its author associations'],
      ['Authors → BookAuthors', '1 : N', 'RESTRICT — cannot delete an author with books'],
      ['Books → BookGenres', '1 : N', 'CASCADE — deleting a book removes its genre associations'],
      ['Genres → BookGenres', '1 : N', 'RESTRICT — cannot delete a genre with books'],
      ['Books → BookDownloads', '1 : N', 'RESTRICT — download history preserved'],
      ['Users → BookDownloads', '1 : N', 'RESTRICT — download history preserved'],
    ]
  ),
  blank(),

  h2('6.2 Table Details'),
  ...img('tbl'),
  blank(),
  p('**Migration:** `20260330192513_InitialCreate` — SQL Server provider, code-first.'),
  bullet('All PKs are `uniqueidentifier` (GUID) — safe for distributed generation'),
  bullet('Enum columns stored as `nvarchar(20)` — human-readable, survives enum renaming'),
  bullet('`Books.Isbn` uses a filtered unique index (`WHERE Isbn IS NOT NULL`) — allows nullable ISBN'),
  bullet('`Genres.Name` and `Users.Email` have unique database indexes enforced at the DB level'),
  bullet('12 total indexes covering title search, status filtering, join traversal, and download history'),
  blank(),
  pageBreak(),
);

// ── Section 7: UI Mockups ─────────────────────────────────────────────────────
sections.push(
  h1('7. UI Mockups'),
  p('These wireframe mockups represent the Blazor WebAssembly SPA. The React SPA has the same functional layout with Tailwind CSS styling.'),
  blank(),

  h2('7.1 Home Page — Book Catalog'),
  ...img('ui1'),
  blank(),
  p('The home page shows the book catalog with a search bar in the navbar, filter dropdowns by genre/language/year, and a responsive grid of `BookCard` components. Each card shows a cover image placeholder, title, author, genre tag, and a Download button. Pagination navigates through the full catalog.'),
  blank(),

  h2('7.2 Login / Register Pages'),
  ...img('ui2'),
  blank(),
  p('The authentication pages show login form (left) and registration form (right). Both are rate-limited to 10 requests per minute. Validation errors from the API (400 responses) are displayed inline. On successful login/register, the JWT is stored in `localStorage` and the user is redirected to the home page.'),
  blank(),

  h2('7.3 Admin Dashboard'),
  ...img('ui3'),
  blank(),
  p('The admin dashboard uses a two-column layout: a dark sidebar with navigation links and a main content area. The dashboard shows stats cards (total books, authors, users, downloads) and a paginated books table with Edit/Delete action buttons for each row.'),
  blank(),

  h2('7.4 Book Detail Page'),
  ...img('ui4'),
  blank(),
  p('The book detail page shows the cover image on the left with availability and language badges. The right column contains full metadata, a Download button (requires login), author biography, and a related books section at the bottom.'),
  blank(),
  pageBreak(),
);

// ── Section 8: Technology Stack ───────────────────────────────────────────────
sections.push(
  h1('8. Technology Stack'),
  h2('Backend'),
  makeTable(
    ['Component', 'Technology', 'Version'],
    [
      ['Runtime', '.NET', '10.0'],
      ['Web Framework', 'ASP.NET Core', '10.0'],
      ['ORM', 'Entity Framework Core', '10.0'],
      ['Database', 'SQL Server', '2022'],
      ['Messaging/CQRS', 'MediatR', '12.x'],
      ['Validation', 'FluentValidation', '11.x'],
      ['Object Mapping', 'AutoMapper', '13.x'],
      ['Authentication', 'JWT Bearer (ASP.NET Core)', '10.0'],
      ['Password Hashing', 'BCrypt.Net-Next', '4.0 (work factor 12)'],
      ['API Documentation', 'Microsoft.AspNetCore.OpenApi + Scalar', '10.*'],
      ['Rate Limiting', 'ASP.NET Core built-in', '10.0 (fixed window)'],
    ]
  ),
  blank(),
  h2('Frontend — Blazor WASM'),
  makeTable(
    ['Component', 'Technology'],
    [
      ['Framework', 'Blazor WebAssembly (.NET 10)'],
      ['Token Storage', 'Blazored.LocalStorage'],
      ['Auth', 'Microsoft.AspNetCore.Components.Authorization + CustomAuthStateProvider'],
      ['HTTP', 'HttpClient + AuthorizationMessageHandler (auto-injects JWT)'],
    ]
  ),
  blank(),
  h2('Testing'),
  makeTable(
    ['Component', 'Technology'],
    [
      ['Framework', 'xUnit 2.x / 3.x'],
      ['Assertions', 'FluentAssertions 6.x (Domain/App) · 8.x (WebApi)'],
      ['Mocking', 'Moq 4.x'],
      ['Integration', 'WebApplicationFactory + EF Core InMemory'],
    ]
  ),
  blank(),
  pageBreak(),
);

// ── Section 9: Key Design Decisions ───────────────────────────────────────────
sections.push(
  h1('9. Key Design Decisions'),
  makeTable(
    ['Decision', 'Rationale'],
    [
      ['All PKs are GUIDs (uniqueidentifier)', 'Conflict-free distributed ID generation; no identity column management'],
      ['Soft delete with EF global filters', 'Data never physically lost; audit trail preserved; transparent to all queries'],
      ['Enums stored as nvarchar strings', 'Human-readable in raw SQL; safe to rename enum values without migrations'],
      ['Explicit join entities (BookAuthor, BookGenre)', 'BookAuthor has IsPrimary column — cannot use EF shadow join tables'],
      ['CQRS + MediatR pipeline', 'Clear separation of commands/queries; pipeline behaviors extensible without touching handlers'],
      ['FluentValidation in ValidationBehavior', 'Validation separated from business logic; reusable validators; consistent error shape'],
      ['BCrypt work factor 12', 'Resistant to GPU brute-force (~300ms per hash); safe even if DB is exfiltrated'],
      ['JWT ClockSkew = TimeSpan.Zero', 'Tokens expire at exact stated time; no tolerance window exploitable by attackers'],
      ['Rate limiting on auth endpoints', '10 req/min fixed window prevents credential stuffing without blocking legitimate users'],
      ['FileStorageService: .epub only', 'Validates extension before saving; prevents arbitrary file upload/execution'],
      ['Auto-migrate on startup (Dev only)', 'Simplifies developer onboarding; skipped in Production via IsDevelopment() check'],
    ]
  ),
  blank(),
  pageBreak(),
);

// ── Section 10: Security Architecture ────────────────────────────────────────
sections.push(
  h1('10. Security Architecture'),
  h2('Authentication Flow'),
  ...code([
    '1. Client POST /api/auth/login {email, password}',
    '2. Server: BCrypt.Verify(password, storedHash)',
    '3. On success: generate HMAC-SHA256 JWT',
    '   Claims: sub (userId), email, role, jti, iat',
    '   Expiry: JwtSettings.ExpiryInMinutes (default 60)',
    '4. Client stores JWT in localStorage',
    '5. Future requests: Authorization: Bearer <token>',
    '6. Middleware validates: signature + issuer + audience + expiry (ClockSkew=0)',
    '7. [Authorize] = IsAuthenticated check',
    '8. [Authorize(Roles="Admin")] = role claim check',
  ]),
  blank(),
  h2('Authorization Matrix'),
  makeTable(
    ['Endpoint', 'Anonymous', 'Regular', 'Admin'],
    [
      ['GET /api/books/search', 'YES', 'YES', 'YES'],
      ['GET /api/books/{id}', 'YES', 'YES', 'YES'],
      ['GET /api/books/{id}/download', 'NO', 'YES', 'YES'],
      ['POST /api/books', 'NO', 'NO', 'YES'],
      ['PUT /api/books/{id}', 'NO', 'NO', 'YES'],
      ['DELETE /api/books/{id}', 'NO', 'NO', 'YES'],
      ['GET /api/authors', 'YES', 'YES', 'YES'],
      ['POST /api/authors', 'NO', 'NO', 'YES'],
      ['GET /api/genres', 'YES', 'YES', 'YES'],
      ['POST /api/genres', 'NO', 'NO', 'YES'],
      ['GET /api/users', 'NO', 'NO', 'YES'],
      ['PATCH /api/users/{id}/role', 'NO', 'NO', 'YES'],
      ['POST /api/files/books/{id}/upload', 'NO', 'NO', 'YES'],
      ['POST /api/auth/register (rate-limited)', 'YES', 'YES', 'YES'],
      ['POST /api/auth/login (rate-limited)', 'YES', 'YES', 'YES'],
    ]
  ),
  blank(),
  h2('OWASP Top 10 Mitigations'),
  makeTable(
    ['Risk', 'Mitigation'],
    [
      ['A01 — Broken Access Control', 'Role-based JWT claims + [Authorize(Roles)] on every write endpoint; no IDOR (GUIDs are not guessable)'],
      ['A02 — Cryptographic Failures', 'BCrypt-12 for passwords (not reversible); HMAC-SHA256 JWT; HTTPS enforced globally'],
      ['A03 — Injection', 'EF Core parameterized queries (LINQ); no raw SQL; user input never concatenated into queries'],
      ['A04 — Insecure Design', 'CQRS + FluentValidation pipeline; all inputs validated before handler execution'],
      ['A05 — Security Misconfiguration', 'OWASP headers middleware (X-Frame-Options, X-XSS-Protection, Referrer-Policy); CORS origin whitelist'],
      ['A07 — Auth Failures', 'Fixed window rate limiting on auth; ClockSkew=0; short JWT expiry (60 min); no refresh token stored on server'],
      ['A08 — Software Integrity', 'NuGet package lock files; known vulnerability (AutoMapper 13) noted for remediation'],
    ]
  ),
  blank(),
);

// ── Assemble Document ─────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'GitHub Copilot – EBook Library Project',
  title: 'EBook Library Architecture Documentation',
  description: 'C4 diagrams, sequence diagrams, database diagrams, and UI mockups for EBook Library',
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { color: NAVY, size: 2, value: BorderStyle.SINGLE } },
              children: [
                new TextRun({ text: 'EBook Library — Architecture Documentation', size: 16, color: NAVY, font: 'Calibri' }),
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
              children: [
                new TextRun({ text: 'Page ', size: 16, color: NAVY, font: 'Calibri' }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 16, color: NAVY, font: 'Calibri',
                }),
                new TextRun({ text: ' of ', size: 16, color: NAVY, font: 'Calibri' }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 16, color: NAVY, font: 'Calibri',
                }),
              ],
            }),
          ],
        }),
      },
      children: sections,
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUT_FILE, buffer);
  const kb = (buffer.length / 1024).toFixed(0);
  console.log(`\n✓  ARCHITECTURE.docx  (${kb} KB)\n`);
}).catch(err => {
  console.error('ERROR generating DOCX:', err.message);
  process.exit(1);
});
