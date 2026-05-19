# Chapter 21 — Routing and Layouts

> *"Routing is the skeleton of a SPA. Get it right once and
> every page hangs from it without effort."*

---

## What you will learn

- How React Router v7 maps URL paths to components.
- How nested routes and the `Outlet` component create shared layouts
  without repeating header/footer code.
- How `RequireAuth` and `RequireAdmin` guards redirect unauthenticated
  and unauthorised users before the page renders.
- The complete `PublicLayout` (sticky header, responsive nav, footer)
  and `AdminLayout` (dark sidebar, breadcrumb header) used throughout
  the application.
- The final `App.tsx` that wires all of the above together.

**Expected result:** Navigating to `/login` renders a placeholder,
navigating to `/admin` without being logged in redirects to `/login`,
and navigating to an unknown URL redirects to `/`.

---

## 21.1 How React Router v7 works

React Router maps URL paths to React components. When the browser
navigates to a path, the router finds the matching `<Route>` element
and renders its component in place of the `<Outlet />` in the parent
layout.

The key concepts:

| Concept | What it does |
|---------|-------------|
| `<BrowserRouter>` | Wraps the app; reads the browser URL |
| `<Routes>` | Container that finds the best matching child `<Route>` |
| `<Route path="..." element={<Component />}>` | Renders `Component` when the URL matches `path` |
| `<Outlet />` | Placeholder in a layout component — child routes render here |
| `<Navigate to="..." replace />` | Performs a redirect; `replace` means the current entry is overwritten in history |
| `useNavigate()` | Programmatic navigation from event handlers |
| `useParams()` | Reads URL parameters (e.g. the `:id` in `/books/:id`) |
| `useSearchParams()` | Reads/writes the URL query string |

### Nested routes

Nested routes let you compose layouts without repetition. The pattern
used in this project:

```
<Route element={<PublicLayout />}>       ← renders the header and footer
  <Route path="/"        element={<HomePage />} />
  <Route path="/search"  element={<SearchPage />} />
  <Route path="/books/:id" element={<BookDetailPage />} />
</Route>
```

`PublicLayout` renders once. Every child page renders inside its
`<Outlet />`. Changing the URL from `/` to `/search` unmounts
`HomePage` and mounts `SearchPage` — the header and footer stay in place.

---

## 21.2 Create the guard components

Two tiny components — `RequireAuth` and `RequireAdmin` — protect
routes that should not be visible to unauthenticated or
unprivileged users. They live inline in `App.tsx` because they are
only used there.

```tsx
const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RequireAdmin = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};
```

:::tip
**Frontend guards are UX, not security.** These components prevent an
unauthenticated user from *seeing* the admin page. They do not prevent
a determined caller from sending HTTP requests directly to the API.
The real protection is the `[Authorize(Roles = "Admin")]` attribute on
the API controllers. Always have both, but never rely on the frontend
alone.
:::

---

## 21.3 Create PublicLayout

`PublicLayout` renders the sticky header, the main content area (via
`<Outlet />`), and the footer. It is used by all public-facing routes.

The header includes:
- Logo link to `/`
- Desktop navigation links (Home, Search, Admin if admin user)
- Language toggle button (EN ↔ ES)
- User dropdown when authenticated; Login + Register links when not
- Responsive mobile menu

**File:** `src/layouts/PublicLayout.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Search, Menu, X, User, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function PublicLayout() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isAdmin, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Add shadow to header when the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUserMenuOpen(false);
    navigate('/');
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-primary-500 font-serif font-bold text-xl">
              <BookOpen className="w-7 h-7" />
              <span>EBook Library</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors">
                {t('nav.home')}
              </Link>
              <Link to="/search" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors flex items-center gap-1">
                <Search className="w-4 h-4" />
                {t('nav.search')}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium text-accent-500 hover:text-accent-600 transition-colors">
                  {t('nav.admin')}
                </Link>
              )}
            </nav>

            {/* Right side: language toggle + auth */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="text-xs font-semibold px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              >
                {i18n.language === 'en' ? 'ES' : 'EN'}
              </button>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.firstName || user?.email}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {t('nav.profile')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3 h-3" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700">{t('nav.home')}</Link>
            <Link to="/search" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700">{t('nav.search')}</Link>
            {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-accent-500">{t('nav.admin')}</Link>}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700">{t('nav.profile')}</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-sm font-medium text-red-600">{t('nav.logout')}</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700">{t('nav.login')}</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-sm py-1.5 px-4">{t('nav.register')}</Link>
                </>
              )}
              <button onClick={toggleLang} className="ml-auto text-xs font-semibold px-2 py-1 rounded border border-gray-200 text-gray-600">
                {i18n.language === 'en' ? 'ES' : 'EN'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main content (child route renders here) ───────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-primary-500 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-serif font-bold text-lg">
              <BookOpen className="w-6 h-6" />
              <span>EBook Library</span>
            </div>
            <p className="text-primary-50/80 text-sm">Your digital reading companion · 76,000+ eBooks</p>
            <div className="flex gap-4 text-sm text-primary-50/70">
              <Link to="/search" className="hover:text-white transition-colors">Browse Books</Link>
              <Link to="/register" className="hover:text-white transition-colors">Join Free</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

The `useEffect` that listens to the scroll event adds a shadow class
to the header when the user scrolls down. It returns a cleanup
function that removes the event listener when the component unmounts —
always required for `addEventListener` in `useEffect`.

---

## 21.4 Create AdminLayout

`AdminLayout` renders a dark navy sidebar with navigation links and
a content area. The sidebar is responsive: on mobile it is hidden and
toggled by a hamburger button in the top bar.

**File:** `src/layouts/AdminLayout.tsx`

```tsx
import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, LayoutDashboard, BookMarked, Users, Tag, Upload,
  LogOut, Menu, X, UserCircle, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { key: 'dashboard', path: '/admin',         icon: LayoutDashboard, label: 'admin.dashboard', exact: true },
  { key: 'books',     path: '/admin/books',   icon: BookMarked,      label: 'admin.books' },
  { key: 'authors',   path: '/admin/authors', icon: Users,           label: 'admin.authors' },
  { key: 'genres',    path: '/admin/genres',  icon: Tag,             label: 'admin.genres' },
  { key: 'users',     path: '/admin/users',   icon: Users,           label: 'admin.users' },
  { key: 'upload',    path: '/admin/upload',  icon: Upload,          label: 'admin.upload' },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  // Active link: exact match for Dashboard, prefix match for others
  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-500 text-white flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex`}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-primary-600">
          <BookOpen className="w-7 h-7" />
          <span className="font-serif font-bold text-lg">EBook Library</span>
          <button className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-primary-50/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(item.label)}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-primary-600">
          <div className="flex items-center gap-3 mb-3">
            <UserCircle className="w-8 h-8 text-primary-200" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.firstName || 'Admin'}</p>
              <p className="text-xs text-primary-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-100 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white shadow-sm px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 text-sm">Admin Panel</h1>
          <Link to="/" className="ml-auto text-xs text-primary-500 hover:underline">
            ← View site
          </Link>
        </header>

        {/* Page content (child route renders here) */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

---

## 21.5 Create placeholder pages

Before writing `App.tsx` you need placeholder components for each page
so the TypeScript compiler can resolve the imports. Create each file
with the minimal content below. These are replaced with the full
implementations in Chapters 22–25.

```powershell
# From src/EBookLibrary.React/src/
New-Item pages/HomePage.tsx, pages/SearchPage.tsx, pages/BookDetailPage.tsx, pages/ProfilePage.tsx -ItemType File
New-Item pages/auth/LoginPage.tsx, pages/auth/RegisterPage.tsx -ItemType File
New-Item pages/admin/DashboardPage.tsx, pages/admin/BooksPage.tsx -ItemType File
New-Item pages/admin/AuthorsPage.tsx, pages/admin/GenresPage.tsx -ItemType File
New-Item pages/admin/UsersPage.tsx, pages/admin/UploadPage.tsx -ItemType File
```

Give each placeholder the same structure:

```tsx
// Example for pages/HomePage.tsx
export default function HomePage() {
  return <div className="p-8"><h1 className="font-serif text-2xl">Home Page</h1></div>;
}
```

Apply the same pattern to every other page file, changing the function
name and title text to match. For example `LoginPage`, `SearchPage`,
`BookDetailPage`, and so on.

---

## 21.6 Create App.tsx

Now write the final `App.tsx` that wires everything together.

**File:** `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import { useAuthStore } from './stores/authStore';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import BookDetailPage from './pages/BookDetailPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Protected pages
import ProfilePage from './pages/ProfilePage';

// Admin pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminBooksPage from './pages/admin/BooksPage';
import AdminAuthorsPage from './pages/admin/AuthorsPage';
import AdminGenresPage from './pages/admin/GenresPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminUploadPage from './pages/admin/UploadPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RequireAdmin = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* Public routes — share PublicLayout */}
          <Route element={<PublicLayout />}>
            <Route path="/"          element={<HomePage />} />
            <Route path="/search"    element={<SearchPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/profile"   element={
              <RequireAuth><ProfilePage /></RequireAuth>
            } />
          </Route>

          {/* Admin routes — share AdminLayout, require Admin role */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index            element={<AdminDashboardPage />} />
            <Route path="books"     element={<AdminBooksPage />} />
            <Route path="authors"   element={<AdminAuthorsPage />} />
            <Route path="genres"    element={<AdminGenresPage />} />
            <Route path="users"     element={<AdminUsersPage />} />
            <Route path="upload"    element={<AdminUploadPage />} />
          </Route>

          {/* Catch-all: redirect unknown URLs to home */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

The `import './i18n'` at the top initialises the i18next library as a
side effect. This import is required before any component that calls
`useTranslation()` renders. Chapter 26 creates the i18n module;
the import will fail until then — create an empty `src/i18n/index.ts`
now with `export {};` to unblock compilation.

---

## Chapter 21 checkpoint

1. Run `npm run dev`.
2. Open `http://localhost:5173` — the Home placeholder page renders
   inside the `PublicLayout` (you should see the header and footer).
3. Navigate to `http://localhost:5173/admin` while not logged in.
   You should be redirected to `/login` immediately.
4. Navigate to `http://localhost:5173/nonexistent/path`. You should be
   redirected to `/`.
5. Navigate to `http://localhost:5173/search` — the Search placeholder
   renders inside the public layout.

If step 3 does not redirect, check that `useAuthStore` is imported
correctly in `App.tsx` and that `zustand` is installed.

---

## Key takeaways

- Nested routes let layouts (`PublicLayout`, `AdminLayout`) render
  once while child pages change — the `<Outlet />` is the slot.
- `RequireAuth` and `RequireAdmin` are UI guards only — the backend
  is the real security boundary.
- The `sticky top-0 z-50` header pattern keeps the navbar visible
  as the user scrolls through long book lists.
- The mobile sidebar pattern (fixed position, translated off-screen,
  translated back on open, overlay to close) is the standard
  responsive drawer implementation.
