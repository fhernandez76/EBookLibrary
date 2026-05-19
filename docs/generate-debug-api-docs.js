'use strict';
// generate-debug-api-docs.js
// Generates 11-DEBUG-GUIDE.docx and 12-API-TESTING-GUIDE.docx
// Run: node generate-debug-api-docs.js

const fs   = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle, WidthType,
  AlignmentType, ShadingType, Header, Footer,
  PageNumber, PageBreak, convertInchesToTwip, UnderlineType,
} = require('./node_modules/docx');

// ── Palette ─────────────────────────────────────────────────────────────────
const NAVY     = '1A3C7C';
const BURGUNDY = 'B0133A';
const DG       = '333333';
const CODE_BG  = 'F5F5F5';
const TBL_HDR  = '1A3C7C';
const TBL_ALT  = 'EEF2F8';
const GREEN    = '1A6B3C';

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    children: [new TextRun({ text, bold: true, size: 22, color: DG, font: 'Calibri' })],
  });
}
function inline(text) {
  const runs = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|([^`*]+|\*(?!\*))/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) runs.push(new TextRun({ text: m[1], bold: true, font: 'Calibri', size: 22 }));
    else if (m[2]) runs.push(new TextRun({ text: m[2], font: 'Courier New', size: 20, color: BURGUNDY, shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' } }));
    else if (m[3]) runs.push(new TextRun({ text: m[3], font: 'Calibri', size: 22 }));
  }
  return runs.length ? runs : [new TextRun({ text, font: 'Calibri', size: 22 })];
}
function p(text) {
  if (!text || !text.trim()) return new Paragraph({ children: [new TextRun('')] });
  return new Paragraph({ spacing: { after: 120, before: 60 }, children: inline(text) });
}
function bullet(text, level = 0) {
  return new Paragraph({ bullet: { level }, spacing: { after: 80 }, children: inline(text) });
}
function numBullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'main-numbering', level },
    spacing: { after: 80 },
    children: inline(text),
  });
}
function blank() { return new Paragraph({ children: [new TextRun('')] }); }
function pb()    { return new Paragraph({ children: [new PageBreak()] }); }

function code(lines) {
  return lines.map(line => new Paragraph({
    spacing: { after: 30, before: 30 },
    shading: { type: ShadingType.SOLID, color: CODE_BG, fill: CODE_BG },
    children: [new TextRun({ text: line === '' ? ' ' : line, font: 'Courier New', size: 18 })],
  }));
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    indent: { left: 360 },
    border: { left: { color: BURGUNDY, size: 6, value: BorderStyle.SINGLE } },
    children: [new TextRun({ text, font: 'Calibri', size: 20, italics: true, color: '444444' })],
  });
}

function badge(verb) {
  const colors = { GET:'1A6B3C', POST:'1A3C7C', PUT:'8B6000', PATCH:'5C3A7D', DELETE:'B0133A' };
  const bg     = { GET:'D4EDDA', POST:'D0E4FF', PUT:'FFF3CD', PATCH:'EDE0FF', DELETE:'FDDDE6' };
  const col = colors[verb] || DG;
  const bgc = bg[verb] || 'EEEEEE';
  return new TextRun({ text: ` ${verb} `, bold: true, font: 'Courier New', size: 20, color: col, shading: { type: ShadingType.SOLID, color: bgc, fill: bgc } });
}

function endpointTitle(verb, route, desc) {
  return new Paragraph({
    spacing: { before: 320, after: 80 },
    children: [
      badge(verb),
      new TextRun({ text: '  ' }),
      new TextRun({ text: route, font: 'Courier New', size: 24, bold: true, color: DG }),
      new TextRun({ text: `  — ${desc}`, font: 'Calibri', size: 22, color: '555555' }),
    ],
  });
}

function tbl(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:    { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:   { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideH: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideV: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
          shading: { type: ShadingType.SOLID, fill: TBL_HDR, color: TBL_HDR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Calibri', size: 18 })] })],
        })),
      }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map(cell => new TableCell({
          shading: ri % 2 !== 0 ? { type: ShadingType.SOLID, fill: TBL_ALT, color: TBL_ALT } : undefined,
          children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: inline(cell) })],
        })),
      })),
    ],
  });
}

function makeDoc(docTitle, subtitle, sections) {
  const numbering = {
    config: [{
      reference: 'main-numbering',
      levels: [{
        level: 0,
        format: 'decimal',
        text: '%1.',
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 360, hanging: 260 } } },
      }],
    }],
  };

  return new Document({
    numbering,
    creator: 'GitHub Copilot – EBook Library Project',
    title: docTitle,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1), bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1), right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { color: NAVY, size: 2, value: BorderStyle.SINGLE } },
            children: [new TextRun({ text: docTitle, size: 16, color: NAVY, font: 'Calibri' })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { color: NAVY, size: 2, value: BorderStyle.SINGLE } },
            children: [
              new TextRun({ text: 'Page ', size: 16, color: NAVY, font: 'Calibri' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: NAVY, font: 'Calibri' }),
              new TextRun({ text: ' of ', size: 16, color: NAVY, font: 'Calibri' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: NAVY, font: 'Calibri' }),
            ],
          })],
        }),
      },
      children: [
        // Cover
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 400 },
          children: [new TextRun({ text: 'EBook Library', bold: true, size: 72, color: NAVY, font: 'Cambria' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: docTitle, bold: true, size: 44, color: BURGUNDY, font: 'Cambria' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 2400 },
          children: [new TextRun({ text: subtitle, size: 26, color: '555555', font: 'Calibri' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'March 2026', size: 22, color: '888888', font: 'Calibri' })],
        }),
        pb(),
        ...sections,
      ],
    }],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT 1 — DEBUG GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

const debugSections = [

  // ── Prerequisites ──────────────────────────────────────────────────────────
  h1('Prerequisites'),
  tbl(
    ['Tool', 'Minimum Version', 'Notes'],
    [
      ['.NET SDK', '8.0', '`dotnet --version`'],
      ['SQL Server', '2019 or 2022', 'LocalDB, Express, or full edition'],
      ['Node.js', '18 LTS', 'Required for React SPA only'],
      ['Visual Studio 2022', '17.8+', 'Or VS Code with C# Dev Kit'],
      ['VS Code', 'Latest', 'Optional — for React/Blazor debugging'],
    ]
  ),
  blank(),
  pb(),

  // ── Part 1 ─────────────────────────────────────────────────────────────────
  h1('Part 1 — Environment Setup (First Run)'),

  h2('Step 1 — Open Solution'),
  p('Open the solution file in Visual Studio:'),
  ...code(['c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary\\EBookLibrary.sln']),
  blank(),
  p('Or from the terminal:'),
  ...code([
    'cd "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary"',
    'start EBookLibrary.sln',
  ]),
  blank(),

  h2('Step 2 — Verify SQL Server is Running'),
  p('The API connects to SQL Server using Windows Authentication and creates the database automatically on first run.'),
  ...code([
    '# Check SQL Server service status',
    "Get-Service -Name 'MSSQLSERVER','MSSQL$*' | Select-Object Name, Status",
  ]),
  blank(),
  p('If stopped, start it:'),
  ...code([
    'Start-Service MSSQLSERVER',
    '# or for LocalDB:',
    'sqllocaldb start MSSQLLocalDB',
  ]),
  blank(),
  p('The default connection string targets:'),
  ...code(['Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True']),
  blank(),
  p('To use LocalDB instead, create `appsettings.Development.json` in the WebApi project:'),
  ...code([
    '{',
    '  "ConnectionStrings": {',
    '    "DefaultConnection": "Server=(localdb)\\\\MSSQLLocalDB;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True"',
    '  }',
    '}',
  ]),
  blank(),

  h2('Step 3 — Verify the JWT Secret Key'),
  p('Open `src\\EBookLibrary.WebApi\\appsettings.json` and confirm `JwtSettings.SecretKey` is at least 64 characters. Replace the placeholder in development:'),
  ...code([
    '{',
    '  "JwtSettings": {',
    '    "SecretKey": "dev-secret-key-replace-in-production-at-least-64-characters-long-ok",',
    '    "Issuer": "EBookLibrary",',
    '    "Audience": "EBookLibraryUsers",',
    '    "ExpiryInMinutes": 60',
    '  }',
    '}',
  ]),
  blank(),

  h2('Step 4 — Create Book File Storage Folder'),
  p('The API stores uploaded `.epub` files at the path in `FileStorageSettings.BasePath`. Create the folder:'),
  ...code(['New-Item -ItemType Directory -Force -Path "C:\\EBookLibrary\\Books"']),
  blank(),
  pb(),

  // ── Part 2 ─────────────────────────────────────────────────────────────────
  h1('Part 2 — Starting the Web API'),

  h2('Step 2.1 — From Visual Studio (Recommended for Debugging)'),
  numBullet('In **Solution Explorer**, right-click `EBookLibrary.WebApi` → **Set as Startup Project**.'),
  numBullet('In the toolbar, select the **http** or **https** launch profile.'),
  numBullet('Press **F5** (with debugger) or **Ctrl+F5** (without debugger).'),
  blank(),
  tbl(
    ['Profile', 'URL'],
    [
      ['http', 'http://localhost:5000'],
      ['https', 'https://localhost:7000'],
    ]
  ),
  blank(),
  note('First-run behaviour: On startup in Development mode, EF Core automatically runs all pending migrations and seeds the admin user. This creates EBookLibraryDb in SQL Server automatically.'),

  h2('Step 2.2 — From Terminal'),
  ...code([
    'cd "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary\\src\\EBookLibrary.WebApi"',
    'dotnet run --launch-profile http',
    '# Or with hot-reload:',
    'dotnet watch --launch-profile http',
  ]),
  blank(),

  h2('Step 2.3 — Verify API is Running'),
  p('Open your browser and navigate to `http://localhost:5000/swagger`. You should see the **EBook Library API v1** Swagger UI confirming the API started, the database was created, and the admin user was seeded.'),
  blank(),

  h2('Step 2.4 — Create launchSettings.json (Optional)'),
  p('If the project does not have `Properties\\launchSettings.json`, create it at `src\\EBookLibrary.WebApi\\Properties\\launchSettings.json`:'),
  ...code([
    '{',
    '  "$schema": "http://json.schemastore.org/launchsettings.json",',
    '  "profiles": {',
    '    "http": {',
    '      "commandName": "Project",',
    '      "launchBrowser": true,',
    '      "launchUrl": "swagger",',
    '      "applicationUrl": "http://localhost:5000",',
    '      "environmentVariables": {',
    '        "ASPNETCORE_ENVIRONMENT": "Development"',
    '      }',
    '    }',
    '  }',
    '}',
  ]),
  blank(),
  pb(),

  // ── Part 3 ─────────────────────────────────────────────────────────────────
  h1('Part 3 — Starting the Blazor SPA'),

  h2('Step 3.1 — From Visual Studio'),
  numBullet('In **Solution Explorer**, right-click `EBookLibrary.Blazor` → **Set as Startup Project**.'),
  numBullet('Press **F5**.'),
  blank(),
  p('Blazor starts by default at `https://localhost:7001`.'),
  blank(),

  h2('Step 3.2 — Create Blazor launchSettings.json'),
  p('Create `src\\EBookLibrary.Blazor\\Properties\\launchSettings.json`:'),
  ...code([
    '{',
    '  "profiles": {',
    '    "http": {',
    '      "commandName": "Project",',
    '      "launchBrowser": true,',
    '      "applicationUrl": "http://localhost:5001",',
    '      "environmentVariables": {',
    '        "ASPNETCORE_ENVIRONMENT": "Development"',
    '      }',
    '    }',
    '  }',
    '}',
  ]),
  blank(),

  h2('Step 3.3 — API Connection'),
  p('Blazor reads `wwwroot/appsettings.json` at runtime. The value must match the API URL:'),
  ...code(['{ "ApiBaseUrl": "http://localhost:5000/api" }']),
  blank(),

  h2('Step 3.4 — Run Both Projects Simultaneously'),
  numBullet('Right-click the **Solution** → **Configure Startup Projects**.'),
  numBullet('Select **Multiple startup projects**.'),
  numBullet('Set `EBookLibrary.WebApi` → **Start**.'),
  numBullet('Set `EBookLibrary.Blazor` → **Start**.'),
  numBullet('Click **OK** and press **F5**.'),
  blank(),
  p('Both projects start in one debug session. Breakpoints in C# code in either project are active.'),
  blank(),
  pb(),

  // ── Part 4 ─────────────────────────────────────────────────────────────────
  h1('Part 4 — Starting the React SPA'),

  h2('Step 4.1 — Install Node Modules (First Run Only)'),
  ...code([
    'cd "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary\\src\\EBookLibrary.React"',
    'npm install',
  ]),
  blank(),

  h2('Step 4.2 — Configure API Base URL'),
  p('Create a `.env` file at the React project root:'),
  ...code(['VITE_API_BASE_URL=http://localhost:5000/api']),
  blank(),

  h2('Step 4.3 — Start the React Dev Server'),
  ...code([
    'cd "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary\\src\\EBookLibrary.React"',
    'npm run dev',
  ]),
  blank(),
  p('React starts at `http://localhost:5173`. The API `AllowedOrigins` already includes this URL — CORS is pre-configured.'),
  blank(),

  h2('Step 4.4 — Debug React in VS Code'),
  ...code([
    'code "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary\\src\\EBookLibrary.React"',
  ]),
  blank(),
  p('Create `.vscode/launch.json` in the React folder:'),
  ...code([
    '{',
    '  "version": "0.2.0",',
    '  "configurations": [',
    '    {',
    '      "type": "chrome",',
    '      "request": "launch",',
    '      "name": "Debug React (Chrome)",',
    '      "url": "http://localhost:5173",',
    '      "webRoot": "${workspaceFolder}/src"',
    '    }',
    '  ]',
    '}',
  ]),
  blank(),
  pb(),

  // ── Part 5 ─────────────────────────────────────────────────────────────────
  h1('Part 5 — Seeded Default Accounts'),
  p('On first API startup in Development, the database is seeded with:'),
  blank(),
  tbl(
    ['Account', 'Email', 'Password', 'Role'],
    [['Admin', 'admin@ebooklibrary.com', 'Admin@12345', 'Admin']]
  ),
  blank(),
  note('Change this password before any non-local deployment. The seeder only creates the admin if no Admin user exists.'),
  blank(),
  pb(),

  // ── Part 6 ─────────────────────────────────────────────────────────────────
  h1('Part 6 — UI Feature Testing Checklist'),
  p('Use this checklist to validate every implemented feature. Test with both Blazor (`http://localhost:5001`) and React (`http://localhost:5173`).'),
  blank(),

  h2('Anonymous Features (No Login Required)'),
  tbl(
    ['#', 'Feature', 'URL', 'Steps', 'Expected Result'],
    [
      ['1',  'Home Page loads',         '/',             'Navigate to root',                       'Book catalog grid shown, navbar visible'],
      ['2',  'Browse book catalog',     '/',             'Scroll page',                            'Books shown as cards with title, author, genre'],
      ['3',  'Search by title',         '/search',       'Enter title in search box',              'Filtered results shown'],
      ['4',  'Search by author name',   '/search',       'Enter an author name',                   'Books by that author shown'],
      ['5',  'Search by genre',         '/search',       'Select a genre from dropdown',           'Books in that genre shown'],
      ['6',  'Search by year',          '/search',       'Enter publication year',                 'Books from that year shown'],
      ['7',  'Pagination',              '/ or /search',  'Click next/previous page',               'Page changes, URL updates'],
      ['8',  'Book detail page',        '/books/{id}',   'Click on any book card',                 'Book metadata, authors, genres shown'],
      ['9',  'Browse genres',           'Via navbar',    'Navigate to genres',                     'Full list shown'],
      ['10', 'Browse authors',          'Via navbar',    'Navigate to authors',                    'Full list shown'],
    ]
  ),
  blank(),

  h2('Authentication Features'),
  tbl(
    ['#', 'Feature', 'URL', 'Steps', 'Expected Result'],
    [
      ['11', 'Register new user',          '/register', 'Fill form, submit',                  'Redirected to home, logged in automatically'],
      ['12', 'Register — weak password',   '/register', 'Submit with short password',         'Error messages shown inline'],
      ['13', 'Register — duplicate email', '/register', 'Re-register same email',             'Error: email already in use'],
      ['14', 'Login',                      '/login',    'Enter admin credentials',            'JWT stored, redirected to home'],
      ['15', 'Login — wrong password',     '/login',    'Enter wrong password',              'Error message shown'],
      ['16', 'Logout',                     'Navbar',    'Click Logout',                       'JWT cleared, redirected, Admin links hidden'],
      ['17', 'Protected route redirect',   '/profile',  'Navigate while unauthenticated',     'Redirected to /login'],
      ['18', 'Token persistence',          'Any page',  'Refresh browser while logged in',   'User remains logged in'],
    ]
  ),
  blank(),

  h2('Authenticated User Features'),
  tbl(
    ['#', 'Feature', 'URL', 'Steps', 'Expected Result'],
    [
      ['19', 'Download a book (with file)',    '/books/{id}', 'Click Download on book with epub', 'File downloads as .epub'],
      ['20', 'Download — no epub file',        '/books/{id}', 'Click on book without epub',       'Error or button disabled'],
      ['21', 'Download — unauthenticated',     '/books/{id}', 'Log out, try to download',         'Redirected to login or 401 shown'],
      ['22', 'View profile',                   '/profile',    'Navigate while logged in',          'Email, name, role displayed'],
    ]
  ),
  blank(),

  h2('Admin Features (Login as admin@ebooklibrary.com)'),
  tbl(
    ['#', 'Feature', 'URL', 'Steps', 'Expected Result'],
    [
      ['23', 'Admin dashboard',         '/admin',          'Navigate as Admin',                'Stats cards and navigation shown'],
      ['24', 'Admin route protected',   '/admin',          'Navigate as regular user',         'Blocked — 403 or redirect'],
      ['25', 'View all books (admin)',   '/admin/books',    'Navigate',                         'Paginated books table with Edit/Delete'],
      ['26', 'Create a book',           '/admin/books',    'Click Add Book, fill form, submit', 'Book appears in list'],
      ['27', 'Edit a book',             '/admin/books',    'Click Edit, change title, save',   'Updated title shown'],
      ['28', 'Delete a book',           '/admin/books',    'Click Delete',                     'Book removed from list (soft-deleted)'],
      ['29', 'View all authors',        '/admin/authors',  'Navigate',                         'Authors table shown'],
      ['30', 'Create an author',        '/admin/authors',  'Click Add Author, fill form',      'Author appears in list'],
      ['31', 'Edit an author',          '/admin/authors',  'Click Edit, update biography',     'Changes saved'],
      ['32', 'Delete an author',        '/admin/authors',  'Click Delete',                     'Author removed from list'],
      ['33', 'View all genres',         '/admin/genres',   'Navigate',                         'Genres table shown'],
      ['34', 'Create a genre',          '/admin/genres',   'Click Add Genre, fill name',       'Genre appears in list'],
      ['35', 'Edit a genre',            '/admin/genres',   'Click Edit, update description',   'Changes saved'],
      ['36', 'Delete a genre',          '/admin/genres',   'Click Delete',                     'Genre removed from list'],
      ['37', 'View all users',          '/admin/users',    'Navigate',                         'Users table with email, role, createdAt'],
      ['38', 'Promote user to Admin',   '/admin/users',    'Click Change Role on regular user', 'Role changes to Admin'],
      ['39', 'Upload epub file',        '/admin/upload',   'Type title in search box, select book from dropdown, choose .epub, click Upload', 'Success message, HasFile = true'],
      ['40', 'Upload invalid file',     '/admin/upload',   'Choose .pdf or .txt file',         'Error: only .epub accepted'],
    ]
  ),
  blank(),
  pb(),

  // ── Part 7 ─────────────────────────────────────────────────────────────────
  h1('Part 7 — Setting Breakpoints for API Debugging'),
  p('When running under the Visual Studio debugger (F5), set breakpoints in any C# file. Recommended locations:'),
  blank(),
  tbl(
    ['File', 'Breakpoint Location', 'What It Catches'],
    [
      ['AuthController.cs — Register',        'Line with Mediator.Send',   'All register requests'],
      ['AuthController.cs — Login',           'Line with Mediator.Send',   'All login requests'],
      ['BooksController.cs — Search',         'Line with Mediator.Send',   'All search requests'],
      ['BooksController.cs — Download',       'Line with Mediator.Send',   'All download requests'],
      ['ExceptionHandlingMiddleware.cs',       'catch block',               'Any unhandled exception'],
      ['ValidationBehavior.cs',               'throw line',                'Any FluentValidation error'],
      ['RegisterUserCommandHandler.cs',       'Inside Handle method',      'User creation logic'],
      ['LoginUserCommandHandler.cs',          'Inside Handle method',      'Password verification (BCrypt)'],
    ]
  ),
  blank(),
  h2('Inspect the JWT in the Browser'),
  numBullet('Open Chrome DevTools → **Application** → **Local Storage** → select the SPA origin.'),
  numBullet('Copy the value of the `authToken` key.'),
  numBullet('Paste it at **jwt.io** to decode the claims (`sub`, `email`, `role`, `exp`).'),
  blank(),
  pb(),

  // ── Part 8 ─────────────────────────────────────────────────────────────────
  h1('Part 8 — Common Problems & Solutions'),
  tbl(
    ['Problem', 'Cause', 'Solution'],
    [
      ['API fails to start — SQL Server error',    'SQL Server not running',              'Start SQL Server service; verify connection string'],
      ['API fails to start — migration error',     'Database permission issue',           'Run as Administrator, or grant db_owner rights'],
      ['Blazor shows CORS error in console',       'API on unexpected port',              'Verify API is on http://localhost:5000 and ApiBaseUrl in Blazor appsettings.json matches'],
      ['React shows network error',               'API not running or wrong base URL',   'Verify VITE_API_BASE_URL in .env; ensure API is running'],
      ['401 Unauthorized on download',            'JWT expired or not sent',             'Log out and log in again'],
      ['403 Forbidden on admin route',            'Logged in as regular user',           'Log in as admin@ebooklibrary.com'],
      ['429 Too Many Requests',                   'Rate limiter triggered',              'Wait 1 minute (10 requests/minute on auth endpoints)'],
      ['C:\\EBookLibrary\\Books not found',       'Storage folder missing',              'New-Item -ItemType Directory -Force -Path "C:\\EBookLibrary\\Books"'],
      ['JWT SecretKey too short',                 'Default placeholder key',             'Replace SecretKey in appsettings.json with 64+ character string'],
    ]
  ),
  blank(),
  pb(),

  // ── Part 9 ─────────────────────────────────────────────────────────────────
  h1('Part 9 — Running Unit Tests'),
  p('From Visual Studio: open **Test Explorer** → **Run All Tests** (Ctrl+R, A).'),
  blank(),
  p('From the terminal:'),
  ...code([
    'cd "c:\\Copilot CLI\\EBook Web Api Project\\Automatic\\EBookLibrary"',
    'dotnet test --logger "console;verbosity=normal"',
  ]),
  blank(),
  p('Expected: **67 tests passed, 0 failed**.'),
  blank(),
  tbl(
    ['Test Project', 'Test Count', 'Coverage'],
    [
      ['EBookLibrary.Domain.Tests',      '30', 'Entity creation, validation, domain rules'],
      ['EBookLibrary.Application.Tests', '26', 'CQRS handlers with mocked repositories'],
      ['EBookLibrary.WebApi.Tests',      '11', 'Integration tests with in-memory database'],
    ]
  ),
];

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT 2 — API TESTING GUIDE
// ═══════════════════════════════════════════════════════════════════════════════

function authBadge(label, color) {
  return new TextRun({ text: ` ${label} `, bold: true, font: 'Calibri', size: 18, color: 'FFFFFF', shading: { type: ShadingType.SOLID, color, fill: color } });
}

function reqLine(label, value) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: 'Calibri', size: 20 }),
      new TextRun({ text: value, font: 'Courier New', size: 20, color: BURGUNDY }),
    ],
  });
}

const apiSections = [

  // Conventions
  h1('Conventions & Response Format'),
  h2('Standard Response Envelope'),
  p('Every endpoint wraps its payload in `ApiResponse<T>`:'),
  ...code([
    '{',
    '  "isSuccess": true,',
    '  "message": "Optional human-readable message",',
    '  "data": { /* the actual response payload */ }',
    '}',
  ]),
  blank(),
  h2('HTTP Status Codes'),
  tbl(
    ['Code', 'Meaning'],
    [
      ['200 OK',                    'Successful read or action'],
      ['201 Created',               'Resource created successfully'],
      ['204 No Content',            'Successful delete or update (no body)'],
      ['400 Bad Request',           'Validation error or invalid input'],
      ['401 Unauthorized',          'Missing or invalid JWT token'],
      ['403 Forbidden',             'Valid token but insufficient role (not Admin)'],
      ['404 Not Found',             'Resource does not exist or is soft-deleted'],
      ['429 Too Many Requests',     'Auth rate limit exceeded (10 req/min)'],
      ['500 Internal Server Error', 'Unhandled server exception'],
    ]
  ),
  blank(),
  note('Base URL: http://localhost:5000/api\nSwagger UI: http://localhost:5000/swagger\nAuthentication: Authorization: Bearer <token>'),
  blank(),
  pb(),

  // ── Section 1 — Auth ───────────────────────────────────────────────────────
  h1('1. Authentication  —  /api/auth'),
  note('Rate limit: 10 requests per minute per IP on all auth endpoints. Exceeding this returns 429 Too Many Requests.'),

  // 1.1 Register
  endpointTitle('POST', '/api/auth/register', 'Register a new user account'),
  blank(),
  reqLine('Auth', 'Anonymous'),
  reqLine('Rate limit', '10 req/min'),
  blank(),
  p('**Request body:**'),
  ...code([
    '{',
    '  "email": "user@example.com",',
    '  "password": "MyPass@123",',
    '  "confirmPassword": "MyPass@123",',
    '  "firstName": "Jane",',
    '  "lastName": "Doe"',
    '}',
  ]),
  blank(),
  tbl(
    ['Field', 'Type', 'Required', 'Rules'],
    [
      ['email',           'string', 'Yes', 'Valid email format, unique'],
      ['password',        'string', 'Yes', 'Min 8 chars, uppercase + lowercase + digit + special char'],
      ['confirmPassword', 'string', 'Yes', 'Must match password'],
      ['firstName',       'string', 'No',  'Max 100 chars'],
      ['lastName',        'string', 'No',  'Max 100 chars'],
    ]
  ),
  blank(),
  p('**Response 201 Created:**'),
  ...code([
    '{',
    '  "isSuccess": true,',
    '  "message": "User registered successfully.",',
    '  "data": {',
    '    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",',
    '    "email": "user@example.com",',
    '    "firstName": "Jane",',
    '    "lastName": "Doe",',
    '    "role": "Regular",',
    '    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",',
    '    "expiresAt": "2026-03-30T14:00:00Z"',
    '  }',
    '}',
  ]),
  blank(),
  p('**Test cases:**'),
  tbl(
    ['#', 'Scenario', 'Input', 'Expected'],
    [
      ['TC-AUTH-01', 'Successful registration',        'All fields valid',                    '201, token returned'],
      ['TC-AUTH-02', 'Minimal registration',           'email + password + confirmPassword',  '201, firstName/lastName null'],
      ['TC-AUTH-03', 'Password mismatch',              'confirmPassword different',           '400, validation error'],
      ['TC-AUTH-04', 'Weak password',                  'password: "12345"',                   '400, validation error'],
      ['TC-AUTH-05', 'Invalid email format',           'email: "notanemail"',                 '400, validation error'],
      ['TC-AUTH-06', 'Duplicate email',                'Already-registered email',            '400, conflict error'],
      ['TC-AUTH-07', 'Empty body',                     '{}',                                  '400, required field errors'],
      ['TC-AUTH-08', 'Rate limit exceeded',            '11 requests in 1 minute',             '429 on 11th request'],
    ]
  ),
  blank(),

  // 1.2 Login
  endpointTitle('POST', '/api/auth/login', 'Authenticate with email and password'),
  blank(),
  reqLine('Auth', 'Anonymous'),
  reqLine('Rate limit', '10 req/min'),
  blank(),
  p('**Request body:**'),
  ...code([
    '{',
    '  "email": "admin@ebooklibrary.com",',
    '  "password": "Admin@12345"',
    '}',
  ]),
  blank(),
  p('**Response 200 OK:** Same shape as register response. Role will be `"Admin"` for the seeded account.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Input', 'Expected'],
    [
      ['TC-AUTH-09', 'Admin login',          'Seeded admin credentials',       '200, role = "Admin"'],
      ['TC-AUTH-10', 'Regular user login',   'Credentials from registration',  '200, role = "Regular"'],
      ['TC-AUTH-11', 'Wrong password',       'Correct email, wrong password',  '400, invalid credentials'],
      ['TC-AUTH-12', 'Non-existent email',   'Unknown email address',          '400, invalid credentials'],
      ['TC-AUTH-13', 'Empty body',           '{}',                             '400, validation errors'],
      ['TC-AUTH-14', 'Rate limit',           '11 requests within 1 minute',    '429 on 11th request'],
    ]
  ),
  blank(),
  pb(),

  // ── Section 2 — Books ──────────────────────────────────────────────────────
  h1('2. Books  —  /api/books'),

  endpointTitle('GET', '/api/books/search', 'Search the catalog with optional filters'),
  blank(),
  reqLine('Auth', 'Anonymous'),
  blank(),
  tbl(
    ['Query Param', 'Type', 'Default', 'Description'],
    [
      ['title',           'string', 'null', 'Partial title match (case-insensitive)'],
      ['authorName',      'string', 'null', 'Partial author name match'],
      ['genreName',       'string', 'null', 'Exact genre name match'],
      ['publicationYear', 'int',    'null', 'Exact year filter'],
      ['pageNumber',      'int',    '1',    'Page number (1-based)'],
      ['pageSize',        'int',    '20',   'Results per page (max 100)'],
    ]
  ),
  blank(),
  p('**Response 200 OK:**'),
  ...code([
    '{',
    '  "data": {',
    '    "items": [ { "id": "...", "title": "...", "pages": 417, "publicationYear": 1967,',
    '                 "status": "Available", "hasFile": true, "primaryAuthor": "...", "primaryGenre": "..." } ],',
    '    "totalCount": 42, "pageNumber": 1, "pageSize": 20, "totalPages": 3',
    '  }',
    '}',
  ]),
  blank(),
  tbl(
    ['#', 'Scenario', 'Query', 'Expected'],
    [
      ['TC-BOOK-01', 'No filters',          '(none)',                         '200, first page of all books'],
      ['TC-BOOK-02', 'Filter by title',     '?title=cien',                    'Books containing "cien" in title'],
      ['TC-BOOK-03', 'Filter by author',    '?authorName=garcia',             'Books with matching author'],
      ['TC-BOOK-04', 'Filter by genre',     '?genreName=Novela',              'Books in that genre'],
      ['TC-BOOK-05', 'Filter by year',      '?publicationYear=1967',          'Books from 1967'],
      ['TC-BOOK-06', 'Combined filters',    '?title=amor&genreName=Novela',   'Books matching both'],
      ['TC-BOOK-07', 'Pagination',          '?pageSize=5&pageNumber=2',       '5 items, page 2'],
      ['TC-BOOK-08', 'No results',          '?title=xyznotexist',             '200, empty items array'],
    ]
  ),
  blank(),

  endpointTitle('GET', '/api/books/{id}', 'Get full details of a single book'),
  blank(),
  reqLine('Auth', 'Anonymous'),
  blank(),
  p('**Response 200 OK:** `BookDto` — id, title, pages, publicationYear, isbn, description, coverImageUrl, language, status, hasFile, authors[], genres[]'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Input', 'Expected'],
    [
      ['TC-BOOK-09', 'Valid book ID',      'Existing GUID',           '200, full book details'],
      ['TC-BOOK-10', 'Non-existent ID',    'Random GUID',             '404 Not Found'],
      ['TC-BOOK-11', 'Soft-deleted book',  'GUID of deleted book',    '404 Not Found'],
    ]
  ),
  blank(),

  endpointTitle('GET', '/api/books/{id}/download', 'Download the .epub file'),
  blank(),
  reqLine('Auth', 'Any authenticated user (Bearer token)'),
  blank(),
  p('Response on success: `Content-Type: application/epub+zip`, binary body.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Auth', 'Expected'],
    [
      ['TC-BOOK-13', 'Authenticated download', 'Valid token',     '200, epub file'],
      ['TC-BOOK-14', 'Unauthenticated',        'No token',        '401 Unauthorized'],
      ['TC-BOOK-15', 'Book has no epub',       'Valid token',     '404 Not Found'],
      ['TC-BOOK-16', 'Non-existent book',      'Valid token',     '404 Not Found'],
    ]
  ),
  blank(),

  endpointTitle('POST', '/api/books', 'Create a new book record — Admin only'),
  blank(),
  reqLine('Auth', 'Admin role required'),
  blank(),
  p('**Request body:**'),
  ...code([
    '{',
    '  "title": "El amor en los tiempos del cólera",',
    '  "pages": 368,',
    '  "publicationYear": 1985,',
    '  "isbn": "978-0-14-028778-9",',
    '  "description": "A novel about love and aging...",',
    '  "language": "Spanish",',
    '  "authorIds": ["<guid>"],',
    '  "genreIds": ["<guid>"]',
    '}',
  ]),
  blank(),
  tbl(
    ['Field', 'Required', 'Rules'],
    [
      ['title',         'Yes', 'Not empty, max 500 chars'],
      ['pages',         'Yes', 'Greater than 0'],
      ['publicationYear', 'No', '1000–2100 if provided'],
      ['isbn',          'No',  'Valid ISBN-10 or ISBN-13 if provided'],
      ['description',   'No',  'Max 2000 chars'],
      ['language',      'Yes', '"Spanish" or "English"'],
      ['authorIds',     'Yes', 'At least one valid author GUID'],
      ['genreIds',      'Yes', 'At least one valid genre GUID'],
    ]
  ),
  blank(),
  note('New books are created with Status = "Unavailable" and HasFile = false. Upload an epub via POST /api/files/books/{id}/upload to activate.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Auth', 'Expected'],
    [
      ['TC-BOOK-17', 'Create full book',           'Admin',        '201, GUID returned'],
      ['TC-BOOK-18', 'Create minimal',             'Admin',        '201'],
      ['TC-BOOK-19', 'Invalid authorId',           'Admin',        '404'],
      ['TC-BOOK-20', 'Invalid genreId',            'Admin',        '404'],
      ['TC-BOOK-21', 'Empty title',                'Admin',        '400 validation error'],
      ['TC-BOOK-22', 'pages = 0',                  'Admin',        '400 validation error'],
      ['TC-BOOK-23', 'No token',                   'None',         '401'],
      ['TC-BOOK-24', 'Regular user',               'Regular user', '403'],
    ]
  ),
  blank(),

  endpointTitle('PUT', '/api/books/{id}', 'Update book metadata — Admin only'),
  blank(),
  reqLine('Auth', 'Admin role required'),
  blank(),
  p('Request body: same fields as POST minus `authorIds`/`genreIds`. Response: **204 No Content**.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Expected'],
    [
      ['TC-BOOK-25', 'Update existing book',  '204'],
      ['TC-BOOK-26', 'Non-existent book',     '404'],
      ['TC-BOOK-27', 'Empty title',           '400'],
      ['TC-BOOK-28', 'No token',              '401'],
      ['TC-BOOK-29', 'Regular user',          '403'],
    ]
  ),
  blank(),

  endpointTitle('DELETE', '/api/books/{id}', 'Soft-delete a book — Admin only'),
  blank(),
  reqLine('Auth', 'Admin role required'),
  blank(),
  p('Response: **204 No Content**. The book is marked `IsDeleted = true` and disappears from all queries.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Expected'],
    [
      ['TC-BOOK-30', 'Delete existing book',     '204'],
      ['TC-BOOK-31', 'Non-existent book',        '404'],
      ['TC-BOOK-32', 'Already-deleted book',     '404'],
      ['TC-BOOK-33', 'No token',                 '401'],
      ['TC-BOOK-34', 'Regular user',             '403'],
    ]
  ),
  blank(),
  pb(),

  // ── Section 3 — Authors ────────────────────────────────────────────────────
  h1('3. Authors  —  /api/authors'),

  endpointTitle('GET', '/api/authors', 'Get paged list of all authors'),
  reqLine('Auth', 'Anonymous'),
  blank(),
  p('Query params: `pageNumber` (default 1), `pageSize` (default 20). Response: `PagedResult<AuthorDto>`.'),
  blank(),
  p('**AuthorDto:** `id`, `name`, `biography`, `bookCount`'),
  blank(),

  endpointTitle('GET', '/api/authors/{id}', 'Get a single author by GUID'),
  reqLine('Auth', 'Anonymous'),
  blank(),

  endpointTitle('POST', '/api/authors', 'Create an author — Admin only'),
  reqLine('Auth', 'Admin role required'),
  blank(),
  ...code(['{ "name": "Isabel Allende", "biography": "Chilean author..." }']),
  blank(),
  tbl(['Field', 'Required', 'Rules'], [['name', 'Yes', 'Not empty, max 300 chars'], ['biography', 'No', 'Max 2000 chars']]),
  blank(),

  endpointTitle('PUT', '/api/authors/{id}', 'Update an author — Admin only'),
  reqLine('Auth', 'Admin role required'),
  p('Same body as POST. Response: **204 No Content**.'),
  blank(),

  endpointTitle('DELETE', '/api/authors/{id}', 'Soft-delete an author — Admin only'),
  reqLine('Auth', 'Admin role required'),
  p('Response: **204 No Content**.'),
  blank(),
  pb(),

  // ── Section 4 — Genres ─────────────────────────────────────────────────────
  h1('4. Genres  —  /api/genres'),

  endpointTitle('GET', '/api/genres', 'Get all genres (no pagination)'),
  reqLine('Auth', 'Anonymous'),
  p('Returns full list ordered by name. Response: `ApiResponse<IEnumerable<GenreDto>>`.'),
  blank(),
  p('**GenreDto:** `id`, `name`, `description`, `bookCount`'),
  blank(),

  endpointTitle('GET', '/api/genres/{id}', 'Get a single genre by GUID'),
  reqLine('Auth', 'Anonymous'),
  blank(),

  endpointTitle('POST', '/api/genres', 'Create a genre — Admin only'),
  reqLine('Auth', 'Admin role required'),
  blank(),
  ...code(['{ "name": "Ciencia Ficción", "description": "Speculative fiction based on science..." }']),
  blank(),
  tbl(['Field', 'Required', 'Rules'], [['name', 'Yes', 'Not empty, max 100 chars, unique'], ['description', 'No', 'Max 500 chars']]),
  blank(),

  endpointTitle('PUT', '/api/genres/{id}', 'Update a genre — Admin only'),
  reqLine('Auth', 'Admin role required'),
  p('Same body as POST. Response: **204 No Content**.'),
  blank(),

  endpointTitle('DELETE', '/api/genres/{id}', 'Soft-delete a genre — Admin only'),
  reqLine('Auth', 'Admin role required'),
  p('Response: **204 No Content**.'),
  blank(),
  pb(),

  // ── Section 5 — Users ─────────────────────────────────────────────────────
  h1('5. Users  —  /api/users'),
  note('All users endpoints require Admin role.'),

  endpointTitle('GET', '/api/users', 'Get paged list of all users'),
  reqLine('Auth', 'Admin role required'),
  blank(),
  p('Query params: `pageNumber` (default 1), `pageSize` (default 20).'),
  p('**UserDto:** `id`, `email`, `firstName`, `lastName`, `role`, `isActive`, `createdAt`'),
  blank(),

  endpointTitle('PATCH', '/api/users/{id}/role', 'Change a user role'),
  reqLine('Auth', 'Admin role required'),
  blank(),
  ...code(['{ "newRole": "Admin" }    // or "Regular"']),
  blank(),
  p('Response: **204 No Content**.'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Expected'],
    [
      ['TC-USR-04', 'Promote to Admin',        '204'],
      ['TC-USR-05', 'Demote to Regular',       '204'],
      ['TC-USR-06', 'Non-existent user',       '404'],
      ['TC-USR-07', 'Invalid role value',      '400'],
      ['TC-USR-08', 'No token',                '401'],
      ['TC-USR-09', 'Regular user',            '403'],
    ]
  ),
  blank(),
  pb(),

  // ── Section 6 — Files ─────────────────────────────────────────────────────
  h1('6. Files  —  /api/files'),

  endpointTitle('POST', '/api/files/books/{bookId}/upload', 'Upload an epub file — Admin only'),
  reqLine('Auth', 'Admin role required'),
  reqLine('Content-Type', 'multipart/form-data'),
  reqLine('Max file size', '100 MB'),
  blank(),
  p('Form field: `file` — select a `.epub` file. Only `.epub` extension is accepted.'),
  blank(),
  p('**curl example:**'),
  ...code([
    'curl -X POST "http://localhost:5000/api/files/books/{bookId}/upload" \\',
    '  -H "Authorization: Bearer <token>" \\',
    '  -F "file=@/path/to/book.epub"',
  ]),
  blank(),
  p('**Response 200 OK:** `{ "isSuccess": true, "message": "File uploaded successfully.", "data": "..." }`'),
  blank(),
  tbl(
    ['#', 'Scenario', 'Input', 'Expected'],
    [
      ['TC-FILE-01', 'Upload valid epub',        'Admin token + .epub file',  '200, success message'],
      ['TC-FILE-02', 'Upload .pdf',              'Admin token + .pdf file',   '400, only .epub accepted'],
      ['TC-FILE-03', 'Upload .txt',              'Admin token + .txt file',   '400'],
      ['TC-FILE-04', 'No file attached',         'Admin token, empty request','400'],
      ['TC-FILE-05', 'Non-existent bookId',      'Admin token, random GUID',  '404'],
      ['TC-FILE-06', 'No authentication',        'No token',                  '401'],
      ['TC-FILE-07', 'Regular user',             'Regular user token',        '403'],
    ]
  ),
  blank(),
  pb(),

  // ── Section 7 — Test Sequence ──────────────────────────────────────────────
  h1('7. Suggested Testing Order'),
  p('Follow this sequence for a complete end-to-end test covering all endpoints:'),
  blank(),
  h2('Phase 1 — Setup Data'),
  numBullet('`POST /api/auth/login` — login as admin → save token as ADMIN_TOKEN'),
  numBullet('`POST /api/genres` (×2) — create genres → save GUIDs as GENRE_ID_1, GENRE_ID_2'),
  numBullet('`POST /api/authors` (×2) — create authors → save GUIDs as AUTHOR_ID_1, AUTHOR_ID_2'),
  numBullet('`POST /api/books` (×2) — create books using genre and author IDs → save GUIDs'),
  numBullet('`POST /api/files/books/{id}/upload` — upload an epub to one book'),
  blank(),
  h2('Phase 2 — Anonymous Read Operations'),
  numBullet('`GET /api/books/search` — verify catalog is searchable'),
  numBullet('`GET /api/books/{id}` — verify book detail'),
  numBullet('`GET /api/authors` — verify author list'),
  numBullet('`GET /api/genres` — verify genre list'),
  blank(),
  h2('Phase 3 — User Authentication & Features'),
  numBullet('`POST /api/auth/register` — register a regular user → save token as USER_TOKEN'),
  numBullet('`GET /api/books/{id}/download` — download using USER_TOKEN'),
  numBullet('`GET /api/users` using USER_TOKEN → expect 403'),
  blank(),
  h2('Phase 4 — Admin Management'),
  numBullet('`GET /api/users` using ADMIN_TOKEN → see all users'),
  numBullet('`PATCH /api/users/{userId}/role` → promote the regular user to Admin'),
  numBullet('`PUT /api/books/{id}` → update a book title'),
  numBullet('`DELETE /api/genres/{id}` → delete a genre'),
  numBullet('`DELETE /api/authors/{id}` → delete an author'),
  numBullet('`DELETE /api/books/{id}` → delete a book'),
  numBullet('`GET /api/books/{deletedId}` → confirm 404'),
  blank(),
  h2('Phase 5 — Error Scenarios'),
  numBullet('Call any write endpoint without a token → expect 401'),
  numBullet('Call admin endpoint with USER_TOKEN → expect 403'),
  numBullet('Submit 11 login requests under 1 minute → expect 429 on the 11th'),
  blank(),
  pb(),

  // ── Section 8 — Swagger ────────────────────────────────────────────────────
  h1('8. Testing via Swagger UI'),
  numBullet('Start the API and navigate to `http://localhost:5000/swagger`.'),
  numBullet('Expand `POST /api/auth/login` → click **Try it out** → enter admin credentials → click **Execute**.'),
  numBullet('Copy the `token` value from the response body.'),
  numBullet('Click the **Authorize** button (lock icon) at the top of the Swagger page.'),
  numBullet('Paste the token (without the word "Bearer") → click **Authorize** → **Close**.'),
  numBullet('All subsequent Swagger requests will include the Authorization header automatically.'),
  blank(),
  pb(),

  // ── Section 9 — Ref ────────────────────────────────────────────────────────
  h1('9. Quick Reference — All Endpoints'),
  tbl(
    ['Method', 'URL', 'Auth', 'Description'],
    [
      ['POST',   '/api/auth/register',              'Anonymous',  'Register new user'],
      ['POST',   '/api/auth/login',                 'Anonymous',  'Login — get JWT token'],
      ['GET',    '/api/books/search',               'Anonymous',  'Search book catalog'],
      ['GET',    '/api/books/{id}',                 'Anonymous',  'Get book by ID'],
      ['GET',    '/api/books/{id}/download',        'Any auth',   'Download epub file'],
      ['POST',   '/api/books',                      'Admin',      'Create book'],
      ['PUT',    '/api/books/{id}',                 'Admin',      'Update book metadata'],
      ['DELETE', '/api/books/{id}',                 'Admin',      'Soft-delete book'],
      ['GET',    '/api/authors',                    'Anonymous',  'List all authors (paged)'],
      ['GET',    '/api/authors/{id}',               'Anonymous',  'Get author by ID'],
      ['POST',   '/api/authors',                    'Admin',      'Create author'],
      ['PUT',    '/api/authors/{id}',               'Admin',      'Update author'],
      ['DELETE', '/api/authors/{id}',               'Admin',      'Soft-delete author'],
      ['GET',    '/api/genres',                     'Anonymous',  'List all genres'],
      ['GET',    '/api/genres/{id}',                'Anonymous',  'Get genre by ID'],
      ['POST',   '/api/genres',                     'Admin',      'Create genre'],
      ['PUT',    '/api/genres/{id}',                'Admin',      'Update genre'],
      ['DELETE', '/api/genres/{id}',                'Admin',      'Soft-delete genre'],
      ['GET',    '/api/users',                      'Admin',      'List all users (paged)'],
      ['PATCH',  '/api/users/{id}/role',            'Admin',      'Change user role'],
      ['POST',   '/api/files/books/{id}/upload',    'Admin',      'Upload epub file'],
    ]
  ),
];

// ── Write both DOCX files ────────────────────────────────────────────────────
async function main() {
  const DOCS_DIR = __dirname;

  const debugDoc = makeDoc(
    'Debug & UI Testing Guide',
    'Starting the API · Blazor SPA · React SPA · Feature Checklist',
    debugSections
  );

  const apiDoc = makeDoc(
    'API Testing Guide',
    'All Endpoints · Request & Response Shapes · Test Cases',
    apiSections
  );

  const d1 = await Packer.toBuffer(debugDoc);
  const p1 = path.join(DOCS_DIR, '11-DEBUG-GUIDE.docx');
  fs.writeFileSync(p1, d1);
  console.log(`✓  11-DEBUG-GUIDE.docx  (${(d1.length / 1024).toFixed(0)} KB)`);

  const d2 = await Packer.toBuffer(apiDoc);
  const p2 = path.join(DOCS_DIR, '12-API-TESTING-GUIDE.docx');
  fs.writeFileSync(p2, d2);
  console.log(`✓  12-API-TESTING-GUIDE.docx  (${(d2.length / 1024).toFixed(0)} KB)`);

  console.log('\nDone!');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
