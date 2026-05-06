'use strict';
// Phase 5 – UI Wireframe Mockups (Blazor / React frontend screens)

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

// UI Style constants
const S = {
  titleBar:  'rounded=0;fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=15;fontStyle=1;html=1;align=center;',
  navbar:    'fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=12;fontStyle=1;html=1;',
  navBtn:    'rounded=1;fillColor=none;strokeColor=#ffffff;fontColor=#ffffff;fontSize=10;html=1;',
  hero:      'fillColor=#e3f2fd;strokeColor=#1565c0;fontSize=12;html=1;whiteSpace=wrap;',
  card:      'rounded=1;fillColor=#ffffff;strokeColor=#cccccc;shadow=1;fontSize=10;html=1;whiteSpace=wrap;',
  cardImg:   'fillColor=#e0e0e0;strokeColor=#bdbdbd;fontSize=9;html=1;align=center;fontStyle=2;',
  cardTitle: 'text;html=1;fontSize=10;fontStyle=1;align=left;',
  cardSub:   'text;html=1;fontSize=9;align=left;fontColor=#757575;',
  btn:       'rounded=1;fillColor=#1e88e5;strokeColor=#1565c0;fontColor=#ffffff;fontSize=10;fontStyle=1;html=1;',
  btnOut:    'rounded=1;fillColor=#ffffff;strokeColor=#1e88e5;fontColor=#1e88e5;fontSize=10;fontStyle=1;html=1;',
  btnRed:    'rounded=1;fillColor=#e53935;strokeColor=#b71c1c;fontColor=#ffffff;fontSize=10;fontStyle=1;html=1;',
  btnGreen:  'rounded=1;fillColor=#43a047;strokeColor=#2e7d32;fontColor=#ffffff;fontSize=10;fontStyle=1;html=1;',
  input:     'rounded=1;fillColor=#f5f5f5;strokeColor=#cccccc;fontSize=10;html=1;align=left;',
  section:   'rounded=1;fillColor=none;strokeColor=#dddddd;fontSize=11;fontStyle=1;html=1;verticalAlign=top;whiteSpace=wrap;',
  sidebar:   'fillColor=#2d3748;strokeColor=#1a202c;fontColor=#ffffff;fontSize=10;html=1;',
  sideItem:  'rounded=0;fillColor=none;strokeColor=none;fontColor=#e2e8f0;fontSize=10;html=1;align=left;',
  sideActive:'rounded=0;fillColor=#3182ce;strokeColor=none;fontColor=#ffffff;fontSize=10;html=1;align=left;fontStyle=1;',
  badge:     'ellipse;fillColor=#e53935;strokeColor=#b71c1c;fontColor=#ffffff;fontSize=8;html=1;',
  tag:       'rounded=1;fillColor=#e3f2fd;strokeColor=#1e88e5;fontColor=#1565c0;fontSize=8;html=1;',
  tagGreen:  'rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontColor=#2e7d32;fontSize=8;html=1;',
  statsCard: 'rounded=1;fillColor=#1565c0;strokeColor=#0d47a1;fontColor=#ffffff;fontSize=11;fontStyle=1;html=1;whiteSpace=wrap;',
  label:     'text;html=1;fontSize=10;fontStyle=1;',
  note:      'text;html=1;fontSize=9;fontStyle=2;fontColor=#888888;',
};

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 14 — UI Mockup: Home Page (Book Catalog)
// ══════════════════════════════════════════════════════════════════════════════
function diagram14_UIHome() {
  rst();
  const cells = [];
  const PW = 1200, PH = 1050;

  cells.push(v('title', 'UI Mockup — Home Page  (Book Catalog)', S.titleBar, 20, 15, PW - 40, 50));

  // Browser chrome
  cells.push(v('chrome', '', 'fillColor=#f5f5f5;strokeColor=#cccccc;html=1;', 40, 80, PW - 80, 30));
  cells.push(v('url', 'https://ebooks.example.com/', 'rounded=1;fillColor=#ffffff;strokeColor=#cccccc;fontSize=9;html=1;align=left;', 120, 85, 700, 20));

  // ── Navbar ────────────────────────────
  const NX = 40, NY = 110, NW = PW-80, NH = 55;
  cells.push(v('nav', '', S.navbar, NX, NY, NW, NH));
  cells.push(v('navLogo', 'EBook Library', 'text;html=1;fontSize=14;fontStyle=1;fontColor=#ffffff;', NX+15, NY+14, 160, 28));
  cells.push(v('navSearch','[  Search books by title, author...  ]', 'rounded=1;fillColor=rgba(255,255,255,0.2);strokeColor=rgba(255,255,255,0.5);fontColor=#ffffff;fontSize=10;html=1;', NX+200, NY+12, 360, 30));
  cells.push(v('navGenres','Genres', S.navBtn, NX+590, NY+14, 70, 26));
  cells.push(v('navAuthors','Authors', S.navBtn, NX+670, NY+14, 70, 26));
  cells.push(v('navLogin','Login', S.navBtn, NX+NW-160, NY+14, 68, 26));
  cells.push(v('navReg','Register', 'rounded=1;fillColor=#1e88e5;strokeColor=#1565c0;fontColor=#ffffff;fontSize=10;html=1;', NX+NW-85, NY+14, 75, 26));

  // ── Hero Banner ───────────────────────
  cells.push(v('hero', '<b>Discover &amp; Download Ebooks</b>\nBrowse thousands of titles across all genres.\nFree to download after registration.',
    S.hero, NX, NY+NH, NW, 100));
  cells.push(v('heroBtn','Browse Catalog', S.btn, NX+400, NY+NH+65, 160, 32));

  // ── Filters row ───────────────────────
  const FY = NY+NH+115;
  cells.push(v('filterLbl','Filter by:', S.label, NX, FY+4, 65, 22));
  cells.push(v('fGenre', 'Genre ▾',  S.input, NX+75, FY, 140, 30));
  cells.push(v('fLang',  'Language ▾', S.input, NX+225, FY, 140, 30));
  cells.push(v('fYear',  'Year ▾',   S.input, NX+375, FY, 110, 30));
  cells.push(v('fBtn',   'Apply',    S.btn,   NX+495, FY, 80, 30));

  // ── Book Cards grid (2 rows × 4 columns) ──
  const CX0 = NX, CY0 = FY+50, CW = 255, CH = 200, CGAP = 15;
  [0,1,2,3].forEach(col => {
    [0,1].forEach(row => {
      const cx = CX0 + col*(CW+CGAP);
      const cy = CY0 + row*(CH+CGAP);
      const cid = `card${row*4+col}`;
      cells.push(v(cid, '', S.card, cx, cy, CW, CH));
      // cover image placeholder
      cells.push(v(cid+'_img',  'Cover Image', S.cardImg, cx+10, cy+10, 80, 110));
      // metadata
      const titles = ['Clean Code','Domain-Driven Design','The Pragmatic Prog.','Design Patterns',
                       'Refactoring','C# in Depth','Soft Skills','The Mythical Man-Month'];
      const authors = ['Robert C. Martin','Eric Evans','A. Hunt & D. Thomas','Gang of Four',
                        'Martin Fowler','Jon Skeet','John Sonmez','Fred Brooks'];
      cells.push(v(cid+'_t', titles[row*4+col] || 'Book Title', 'text;html=1;fontSize=10;fontStyle=1;align=left;', cx+100, cy+10, 145, 30));
      cells.push(v(cid+'_a', authors[row*4+col] || 'Author Name', 'text;html=1;fontSize=9;align=left;fontColor=#757575;', cx+100, cy+45, 145, 18));
      cells.push(v(cid+'_tag', 'Technology', S.tag, cx+100, cy+68, 75, 18));
      cells.push(v(cid+'_dl', 'Download', S.btn, cx+CW-90, cy+CH-38, 80, 28));
    });
  });

  // ── Pagination ────────────────────────
  const PGY = CY0 + 2*(CH+CGAP) + 20;
  cells.push(v('pg', '← Prev   [ 1 ]  2  3  …  12   Next →', 'text;html=1;fontSize=11;align=center;', NX+350, PGY, 400, 30));

  // ── Footer ────────────────────────────
  cells.push(v('footer', 'EBook Library © 2026  |  API docs  |  GitHub', 'fillColor=#2d3748;strokeColor=none;fontColor=#a0aec0;fontSize=9;html=1;align=center;', NX, PGY+50, NW, 35));

  save('14-ui-home-page.drawio', wrap('UI Mockup – Home Page', PW, PH, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 15 — UI Mockup: Login & Register Page
// ══════════════════════════════════════════════════════════════════════════════
function diagram15_UILogin() {
  rst();
  const cells = [];
  const PW = 1000, PH = 800;

  cells.push(v('title', 'UI Mockup — Login / Register Pages', S.titleBar, 20, 15, PW-40, 50));

  // Browser chrome
  cells.push(v('chrome', '', 'fillColor=#f5f5f5;strokeColor=#cccccc;html=1;', 40, 78, PW-80, 28));

  // Shared navbar
  cells.push(v('nav', '', S.navbar, 40, 106, PW-80, 50));
  cells.push(v('navLogo','EBook Library','text;html=1;fontSize=13;fontStyle=1;fontColor=#ffffff;', 55, 119, 150, 24));

  // ── Login Card (left) ─────────────────
  const LX=60, LY=175, LW=400, LH=480;
  cells.push(v('loginCard', '', S.card, LX, LY, LW, LH));
  cells.push(v('loginHdr', 'Sign In', 'text;html=1;fontSize=18;fontStyle=1;align=center;', LX+100, LY+20, 200, 36));
  cells.push(v('loginSub', 'Access your ebook library', 'text;html=1;fontSize=10;align=center;fontColor=#757575;', LX+60, LY+55, 280, 20));

  cells.push(v('lEmail_l', 'Email address', S.label, LX+30, LY+95, 200, 20));
  cells.push(v('lEmail',   'you@example.com', S.input, LX+30, LY+115, LW-60, 38));
  cells.push(v('lPwd_l',   'Password', S.label, LX+30, LY+165, 200, 20));
  cells.push(v('lPwd',     '••••••••••', S.input, LX+30, LY+185, LW-60, 38));
  cells.push(v('lForget',  'Forgot password?', 'text;html=1;fontSize=9;fontColor=#1e88e5;align=right;', LX+30, LY+228, LW-60, 18));
  cells.push(v('lBtn',     'Sign In', S.btn, LX+30, LY+258, LW-60, 42));
  cells.push(v('lOr',      '— or continue with —', 'text;html=1;fontSize=9;align=center;fontColor=#888888;', LX+60, LY+312, LW-120, 18));

  cells.push(v('lNew',  "Don't have an account?", 'text;html=1;fontSize=10;align=center;fontColor=#757575;', LX+30, LY+380, LW-60, 20));
  cells.push(v('lReg',  'Create account →', 'text;html=1;fontSize=10;align=center;fontColor=#1e88e5;fontStyle=4;', LX+30, LY+400, LW-60, 20));

  // Error state note
  cells.push(v('lErr', '⚠ Invalid email or password', 'rounded=1;fillColor=#ffebee;strokeColor=#e53935;fontColor=#c62828;fontSize=10;html=1;', LX+30, LY+430, LW-60, 32));
  cells.push(v('lNote', '← Validation error shown here\n(400 Bad Request from API)', S.note, LX+LW+8, LY+430, 140, 32));

  // ── Register Card (right) ─────────────
  const RX=540, RY=175, RW=420, RH=550;
  cells.push(v('regCard', '', S.card, RX, RY, RW, RH));
  cells.push(v('regHdr', 'Create Account', 'text;html=1;fontSize=18;fontStyle=1;align=center;', RX+80, RY+20, 260, 36));
  cells.push(v('regSub', 'Join the ebook library', 'text;html=1;fontSize=10;align=center;fontColor=#757575;', RX+80, RY+55, 260, 20));

  const fields = [
    ['First Name (optional)', 80],
    ['Last Name (optional)', 155],
    ['Email address *', 230],
    ['Password * (min 8, upper, lower, digit, special)', 305],
    ['Confirm Password *', 380],
  ];
  fields.forEach(([lbl, fy]) => {
    cells.push(v(uid(), lbl, S.label, RX+30, RY+fy, RW-60, 18));
    cells.push(v(uid(), '', S.input, RX+30, RY+fy+20, RW-60, 34));
  });
  cells.push(v('regBtn', 'Create Account', S.btnGreen, RX+30, RY+460, RW-60, 42));
  cells.push(v('regOk',  '✓ Account created! Redirecting...', 'rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontColor=#2e7d32;fontSize=10;html=1;', RX+30, RY+510, RW-60, 28));

  // ── Annotations ───────────────────────
  cells.push(v('ann1', 'JWT stored in\nlocalStorage on success', S.note, 40, LY+LH+10, 160, 30));
  cells.push(v('ann2', 'Rate-limited:\n10 requests / minute', S.note, PW-200, LY+LH+10, 150, 30));

  save('15-ui-login-register.drawio', wrap('UI Mockup – Login / Register', PW, PH, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 16 — UI Mockup: Admin Dashboard
// ══════════════════════════════════════════════════════════════════════════════
function diagram16_UIAdmin() {
  rst();
  const cells = [];
  const PW = 1300, PH = 950;

  cells.push(v('title', 'UI Mockup — Admin Dashboard', S.titleBar, 20, 15, PW-40, 50));

  // Browser chrome
  cells.push(v('chrome','','fillColor=#f5f5f5;strokeColor=#cccccc;html=1;', 40, 78, PW-80, 28));

  // ── Top navbar ────────────────────────
  cells.push(v('nav','','fillColor=#1e3a5f;strokeColor=none;html=1;', 40, 106, PW-80, 50));
  cells.push(v('nl','EBook Library Admin','text;html=1;fontSize=13;fontStyle=1;fontColor=#ffffff;', 55, 119, 190, 24));
  cells.push(v('nu','admin@library.com  ▾','text;html=1;fontSize=10;fontColor=#ffffff;', PW-220, 119, 168, 24));

  // ── Sidebar ───────────────────────────
  const SX=40, SY=156, SW=200, SH=PH-SY-40;
  cells.push(v('sidebar','','fillColor=#2d3748;strokeColor=#1a202c;html=1;', SX, SY, SW, SH));
  const navItems = [
    ['Dashboard', true],
    ['Books', false],
    ['Authors', false],
    ['Genres', false],
    ['Users', false],
    ['Upload Files', false],
  ];
  navItems.forEach(([label, active], i) => {
    cells.push(v(uid(), (active?'▶  ':'    ') + label, active ? S.sideActive : S.sideItem, SX+8, SY+20+i*48, SW-16, 36));
  });

  // ── Main content area ─────────────────
  const MX=250, MY=156, MW=PW-MX-50;

  // Stats cards row
  const stats = [
    { label:'Total Books', val:'1,248', sub:'12 new this month', color:'#1565c0' },
    { label:'Total Authors', val:'387', sub:'5 new this month', color:'#4527a0' },
    { label:'Total Users', val:'3,941', sub:'124 new this week', color:'#2e7d32' },
    { label:'Downloads', val:'18,762', sub:'Today: 89', color:'#e65100' },
  ];
  const SCW = Math.floor((MW-50)/4);
  stats.forEach((s, i) => {
    cells.push(v(uid(), `<b>${s.val}</b><br/>${s.label}<br/><i>${s.sub}</i>`,
      `rounded=1;fillColor=${s.color};strokeColor=none;fontColor=#ffffff;fontSize=11;fontStyle=0;html=1;whiteSpace=wrap;`,
      MX + i*(SCW+12), MY+10, SCW, 80));
  });

  // ── Books table ───────────────────────
  cells.push(v('bTblHdr', 'Books Management', 'text;html=1;fontSize=13;fontStyle=1;', MX, MY+105, 300, 26));
  cells.push(v('addBtn','+ Add Book', S.btn, MX+MW-120, MY+105, 110, 28));

  const TH = 36, TR = ['Title','Author','Genre','Language','Status','Actions'];
  cells.push(v('thead','','fillColor=#1e3a5f;strokeColor=none;fontColor=#ffffff;fontSize=10;fontStyle=1;html=1;', MX, MY+140, MW, TH));
  const CWs = [240,180,130,100,110,130];
  let cx2 = MX+8;
  TR.forEach((label,i) => {
    cells.push(v(uid(), label, 'text;html=1;fontSize=10;fontStyle=1;fontColor=#ffffff;', cx2, MY+151, CWs[i]-8, 20));
    cx2 += CWs[i];
  });

  // 5 data rows
  const bookRows = [
    ['Clean Code','Robert C. Martin','Technology','English','Available'],
    ['Domain-Driven Design','Eric Evans','Technology','English','Available'],
    ['Cien Años de Soledad','Gabriel García Márquez','Fiction','Spanish','Unavailable'],
    ['The Pragmatic Programmer','A. Hunt · D. Thomas','Technology','English','Available'],
    ['Design Patterns','Gang of Four','Technology','English','Available'],
  ];
  bookRows.forEach((row, ri) => {
    const ty = MY+176 + ri*34;
    const rbg = ri % 2 === 0 ? '#ffffff' : '#f5f5f5';
    cells.push(v(uid(),'',`fillColor=${rbg};strokeColor=#eeeeee;html=1;`, MX, ty, MW, 32));
    let rcx = MX+8;
    row.forEach((cell2, ci) => {
      cells.push(v(uid(), cell2, 'text;html=1;fontSize=9;', rcx, ty+7, CWs[ci]-8, 18));
      rcx += CWs[ci];
    });
    // Actions
    cells.push(v(uid(),'Edit',  S.btnOut, MX+MW-120, ty+4, 50, 24));
    cells.push(v(uid(),'Delete',S.btnRed, MX+MW-65,  ty+4, 55, 24));
  });

  // Status badges legend
  cells.push(v('legAvail','Available', S.tagGreen, MX, MY+360, 80, 22));
  cells.push(v('legUnavail','Unavailable','rounded=1;fillColor=#fff9c4;strokeColor=#f9a825;fontColor=#6d4c41;fontSize=8;html=1;', MX+90, MY+360, 95, 22));

  cells.push(v('pager','← Prev   1  2  3  ...  63  Next →','text;html=1;fontSize=10;align=center;', MX, MY+395, MW, 24));

  save('16-ui-admin-dashboard.drawio', wrap('UI Mockup – Admin Dashboard', PW, PH, cells));
}

// ══════════════════════════════════════════════════════════════════════════════
// DIAGRAM 17 — UI Mockup: Book Detail Page
// ══════════════════════════════════════════════════════════════════════════════
function diagram17_UIBookDetail() {
  rst();
  const cells = [];
  const PW = 1100, PH = 900;

  cells.push(v('title', 'UI Mockup — Book Detail Page', S.titleBar, 20, 15, PW-40, 50));

  // Browser chrome
  cells.push(v('chrome','','fillColor=#f5f5f5;strokeColor=#cccccc;html=1;', 40, 78, PW-80, 28));
  cells.push(v('url','https://ebooks.example.com/books/3fa85f64-...','rounded=1;fillColor=#ffffff;strokeColor=#cccccc;fontSize=9;html=1;align=left;', 120, 83, 600, 18));

  // Navbar
  cells.push(v('nav','','fillColor=#1e3a5f;strokeColor=none;html=1;', 40, 106, PW-80, 50));
  cells.push(v('navLogo','EBook Library','text;html=1;fontSize=13;fontStyle=1;fontColor=#ffffff;', 55, 119, 150, 24));
  cells.push(v('navBack', '← Back to catalog', 'text;html=1;fontSize=10;fontColor=#90caf9;', 55, 143, 160, 16));
  cells.push(v('navUser','Profile (John D.)','rounded=1;fillColor=none;strokeColor=#90caf9;fontColor=#ffffff;fontSize:10;html=1;', PW-200, 116, 140, 28));

  // ── Cover image area ─────────────────
  const CX=60, CY=175, CW2=230, CH=330;
  cells.push(v('cover','[ Cover Image ]','fillColor=#e0e0e0;strokeColor=#bdbdbd;fontSize=11;html=1;align=center;verticalAlign=middle;fontStyle=2;', CX, CY, CW2, CH));

  // Status badge
  cells.push(v('status','✓ Available','rounded=1;fillColor=#e8f5e9;strokeColor=#43a047;fontColor=#2e7d32;fontSize=10;fontStyle=1;html=1;', CX, CY+CH+10, 110, 28));
  cells.push(v('langBadge','English','rounded=1;fillColor=#e3f2fd;strokeColor=#1e88e5;fontColor=#1565c0;fontSize=10;html=1;', CX+120, CY+CH+10, 80, 28));

  // ── Book Metadata ─────────────────────
  const MX=310, MY=175;
  cells.push(v('bTitle','Clean Code: A Handbook of Agile Software Craftsmanship',
    'text;html=1;fontSize=18;fontStyle=1;whiteSpace=wrap;', MX, MY, 700, 56));
  cells.push(v('bAuthor','by Robert C. Martin','text;html=1;fontSize=12;fontColor=#1e88e5;', MX, MY+65, 300, 22));

  // Meta grid
  const metaRows = [
    ['Pages:', '464'],
    ['Publication Year:', '2008'],
    ['ISBN:', '978-0-13-235088-4'],
    ['Language:', 'English'],
    ['Genre:', 'Technology  •  Software Engineering'],
  ];
  metaRows.forEach(([label, val], i) => {
    cells.push(v(uid(), label, 'text;html=1;fontSize=10;fontStyle=1;fontColor=#555555;', MX, MY+100+i*28, 160, 22));
    cells.push(v(uid(), val,   'text;html=1;fontSize=10;', MX+165, MY+100+i*28, 360, 22));
  });

  // Download button
  cells.push(v('dlBtn','⬇  Download Ebook  (.epub)','rounded=1;fillColor=#1e88e5;strokeColor=#1565c0;fontColor=#ffffff;fontSize=13;fontStyle=1;html=1;', MX, MY+250, 280, 48));
  cells.push(v('dlNote','Requires login. Logs your download.','text;html=1;fontSize=9;fontColor=#888888;', MX, MY+302, 240, 18));

  // Authors full list
  cells.push(v('authHdr','Authors','text;html=1;fontSize=12;fontStyle=1;', MX, MY+330, 200, 22));
  cells.push(v('auth1','Robert C. Martin  – known as "Uncle Bob". Software engineering author and speaker.',
    'rounded=1;fillColor=#f5f5f5;strokeColor=#cccccc;fontSize:10;html=1;whiteSpace:wrap;', MX, MY+355, 500, 40));

  // Description
  cells.push(v('descHdr','Description','text;html=1;fontSize=12;fontStyle=1;', 60, CY+CH+60, 200, 22));
  cells.push(v('desc',
    'Even bad code can function. But if code is not clean, it can bring a development organization to its knees.\n' +
    'This book applies to all languages and describes the principles of clean code through concrete examples and heuristics.',
    'rounded=1;fillColor=#f9f9f9;strokeColor=#dddddd;fontSize:10;html=1;whiteSpace:wrap;', 60, CY+CH+88, PW-120, 70));

  // Related / You may also like
  cells.push(v('relHdr','Related Books','text;html=1;fontSize=12;fontStyle=1;', 60, CY+CH+175, 200, 22));
  [0,1,2,3].forEach(i => {
    const rx = 60 + i*250;
    cells.push(v(uid(),'','rounded=1;fillColor=#ffffff;strokeColor=#cccccc;shadow=1;html=1;', rx, CY+CH+200, 240, 80));
    cells.push(v(uid(),'[Cover]','fillColor=#e0e0e0;strokeColor=#bdbdbd;fontSize=8;html=1;align=center;', rx+10, CY+CH+210, 50, 60));
    cells.push(v(uid(),['Refactoring','C# in Depth','The Pragmatic Programmer','Design Patterns'][i],
      'text;html=1;fontSize=9;fontStyle=1;', rx+70, CY+CH+210, 160, 22));
    cells.push(v(uid(),['M. Fowler','Jon Skeet','A. Hunt','Gang of Four'][i],
      'text;html=1;fontSize=8;fontColor=#888888;', rx+70, CY+CH+234, 160, 16));
    cells.push(v(uid(),'View','rounded=1;fillColor=none;strokeColor=#1e88e5;fontColor=#1e88e5;fontSize=8;html=1;', rx+70, CY+CH+254, 50, 20));
  });

  save('17-ui-book-detail.drawio', wrap('UI Mockup – Book Detail Page', PW, PH, cells));
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log('Phase 5 — UI Mockups');
try { diagram14_UIHome();      } catch (err) { console.error('  ✗  14:', err.message); }
try { diagram15_UILogin();     } catch (err) { console.error('  ✗  15:', err.message); }
try { diagram16_UIAdmin();     } catch (err) { console.error('  ✗  16:', err.message); }
try { diagram17_UIBookDetail();} catch (err) { console.error('  ✗  17:', err.message); }
console.log('Phase 5 complete.\n');
