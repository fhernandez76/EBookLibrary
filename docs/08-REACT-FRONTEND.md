# Component 08 — React Frontend

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete React frontend for EBook Library.
> **Session goal:** Generate a fully functional React + TypeScript + Vite application with authentication, book search, book detail pages, download functionality, admin dashboard, and bilingual support (Spanish/English).
> **Project:** `src/EBookLibrary.React/` (Vite + React 18 + TypeScript)
> **UI inspiration:** Barnes & Noble (barnesandnoble.com) and Alibris (alibris.com) — clean, book-focused, card-based layout.
> **Prerequisites:** Backend API (Component 05) must be running. The API base URL is `http://localhost:5000` (Development).

---

## Context

The React application is a Single Page Application (SPA) that:
- Communicates exclusively with the EBook Library REST API
- Supports Spanish and English via i18next
- Uses JWT tokens stored in `localStorage` (or more securely, `httpOnly` cookie — see security note)
- Provides a Barnes & Noble-style book browsing experience

---

## Task 1 — Project Setup

### 1.1 Tailwind CSS configuration

> **Note:** Install Tailwind CSS **v3** explicitly — `npm install -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography`. The default `npm install tailwindcss` installs v4 which has a different configuration format incompatible with the `tailwind.config.js` below.

### File: `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          500: '#1a3c7c',  // Barnes & Noble dark navy
          600: '#152e63',
          700: '#0f2146',
        },
        accent: {
          500: '#b0133a',  // Burgundy accent
          600: '#8c0f2e',
        },
        book: {
          card: '#ffffff',
          hover: '#f8f9fa',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
```

### File: `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans bg-gray-50 text-gray-900;
  }
  h1, h2, h3 {
    @apply font-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200;
  }
  .btn-accent {
    @apply bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200;
  }
  .book-card {
    @apply bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200 hover:border-primary-500/20;
  }
  .input-field {
    @apply w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20;
  }
}
```

---

## Task 2 — TypeScript Types

### File: `src/types/api.ts`

```typescript
// Auth
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  email: string; password: string; confirmPassword: string;
  firstName?: string; lastName?: string;
}
export interface AuthResponse {
  userId: string; email: string; firstName?: string; lastName?: string;
  role: 'Regular' | 'Admin'; token: string; expiresAt: string;
}

// Books
export interface BookSummary {
  id: string; title: string; pages: number; publicationYear?: number;
  coverImageUrl?: string; status: 'Available' | 'Unavailable' | 'Removed';
  hasFile: boolean; primaryAuthor: string; primaryGenre: string;
}
export interface BookDetail {
  id: string; title: string; pages: number; publicationYear?: number;
  isbn?: string; description?: string; coverImageUrl?: string;
  language: string; status: string; hasFile: boolean;
  authors: string[]; genres: string[];
}
export interface BookSearchFilter {
  title?: string; authorName?: string; genreName?: string;
  publicationYear?: number; pageNumber?: number; pageSize?: number;
}

// Paged result
export interface PagedResult<T> {
  items: T[]; totalCount: number; pageNumber: number; pageSize: number;
  totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean;
}

// API response envelope
export interface ApiResponse<T> { success: boolean; data?: T; message?: string; errors?: string[]; }

// Authors, Genres
export interface Author { id: string; name: string; biography?: string; bookCount: number; }
export interface Genre { id: string; name: string; description?: string; bookCount: number; }

// Users (Admin)
export interface User {
  id: string; email: string; firstName?: string; lastName?: string;
  role: string; isActive: boolean; createdAt: string;
}
```

---

## Task 3 — API Client

### File: `src/api/apiClient.ts`

```typescript
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### File: `src/api/authApi.ts`

```typescript
import { apiClient } from './apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../types/api';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data).then(r => r.data.data!),

  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data).then(r => r.data.data!),
};
```

### File: `src/api/booksApi.ts`

```typescript
import { apiClient } from './apiClient';
import type { BookDetail, BookSearchFilter, BookSummary, PagedResult, ApiResponse } from '../types/api';

export const booksApi = {
  search: (filter: BookSearchFilter) =>
    apiClient.get<ApiResponse<PagedResult<BookSummary>>>('/books/search', { params: filter })
      .then(r => r.data.data!),

  getById: (id: string) =>
    apiClient.get<ApiResponse<BookDetail>>(`/books/${id}`).then(r => r.data.data!),

  download: (id: string) =>
    apiClient.get(`/books/${id}/download`, { responseType: 'blob' }).then(r => r.data),
};
```

---

## Task 4 — Auth Store (Zustand)

### File: `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse } from '../types/api';

interface AuthState {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (auth) => {
        localStorage.setItem('auth_token', auth.token);
        set({ user: auth, isAuthenticated: true, isAdmin: auth.role === 'Admin' });
      },
      clearAuth: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
```

---

## Task 5 — i18n Setup

### File: `src/i18n/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### File: `src/i18n/locales/en.json`

```json
{
  "nav": {
    "home": "Home", "search": "Search Books", "login": "Login",
    "register": "Register", "logout": "Logout", "admin": "Admin Panel",
    "profile": "My Profile"
  },
  "home": {
    "hero_title": "Discover Your Next Great Read",
    "hero_subtitle": "Browse over 76,000 eBooks across every genre",
    "search_placeholder": "Search by title, author, or genre...",
    "search_btn": "Search",
    "featured_genres": "Browse by Genre",
    "new_arrivals": "New Arrivals"
  },
  "search": {
    "title": "Search Results",
    "filters": "Filters",
    "filter_title": "Title",
    "filter_author": "Author",
    "filter_genre": "Genre",
    "filter_year": "Publication Year",
    "results_count": "{{count}} books found",
    "no_results": "No books found matching your search.",
    "clear_filters": "Clear Filters",
    "sort_by": "Sort By"
  },
  "book": {
    "download": "Download ePub",
    "unavailable": "Not Available",
    "pages": "{{count}} pages",
    "year": "Published {{year}}",
    "authors": "Authors",
    "genres": "Genre",
    "login_to_download": "Please login to download"
  },
  "auth": {
    "login_title": "Welcome Back",
    "register_title": "Create Account",
    "email": "Email Address",
    "password": "Password",
    "confirm_password": "Confirm Password",
    "first_name": "First Name",
    "last_name": "Last Name",
    "login_btn": "Sign In",
    "register_btn": "Create Account",
    "no_account": "Don't have an account?",
    "has_account": "Already have an account?",
    "sign_up": "Sign Up",
    "sign_in": "Sign In"
  },
  "admin": {
    "dashboard": "Dashboard",
    "books": "Books",
    "authors": "Authors",
    "genres": "Genres",
    "users": "Users",
    "upload": "Upload ePub",
    "total_books": "Total Books",
    "total_users": "Total Users"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add New",
    "confirm_delete": "Are you sure you want to delete this item?",
    "page_of": "Page {{current}} of {{total}}"
  }
}
```

### File: `src/i18n/locales/es.json`

```json
{
  "nav": {
    "home": "Inicio", "search": "Buscar Libros", "login": "Iniciar Sesión",
    "register": "Registrarse", "logout": "Cerrar Sesión", "admin": "Panel Admin",
    "profile": "Mi Perfil"
  },
  "home": {
    "hero_title": "Descubre tu Próxima Gran Lectura",
    "hero_subtitle": "Explora más de 76.000 eBooks en todos los géneros",
    "search_placeholder": "Busca por título, autor o género...",
    "search_btn": "Buscar",
    "featured_genres": "Explorar por Género",
    "new_arrivals": "Novedades"
  },
  "search": {
    "title": "Resultados de Búsqueda",
    "filters": "Filtros",
    "filter_title": "Título",
    "filter_author": "Autor",
    "filter_genre": "Género",
    "filter_year": "Año de Publicación",
    "results_count": "{{count}} libros encontrados",
    "no_results": "No se encontraron libros con su búsqueda.",
    "clear_filters": "Limpiar Filtros",
    "sort_by": "Ordenar por"
  },
  "book": {
    "download": "Descargar ePub",
    "unavailable": "No Disponible",
    "pages": "{{count}} páginas",
    "year": "Publicado en {{year}}",
    "authors": "Autores",
    "genres": "Género",
    "login_to_download": "Inicia sesión para descargar"
  },
  "auth": {
    "login_title": "Bienvenido de Vuelta",
    "register_title": "Crear Cuenta",
    "email": "Correo Electrónico",
    "password": "Contraseña",
    "confirm_password": "Confirmar Contraseña",
    "first_name": "Nombre",
    "last_name": "Apellido",
    "login_btn": "Iniciar Sesión",
    "register_btn": "Crear Cuenta",
    "no_account": "¿No tienes una cuenta?",
    "has_account": "¿Ya tienes una cuenta?",
    "sign_up": "Regístrate",
    "sign_in": "Inicia sesión"
  },
  "admin": {
    "dashboard": "Tablero",
    "books": "Libros",
    "authors": "Autores",
    "genres": "Géneros",
    "users": "Usuarios",
    "upload": "Subir ePub",
    "total_books": "Total Libros",
    "total_users": "Total Usuarios"
  },
  "common": {
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Agregar",
    "confirm_delete": "¿Estás seguro de que quieres eliminar este elemento?",
    "page_of": "Página {{current}} de {{total}}"
  }
}
```

---

## Task 6 — App Router

### File: `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../src/i18n';
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
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
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
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={
              <RequireAuth><ProfilePage /></RequireAuth>
            } />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="books" element={<AdminBooksPage />} />
            <Route path="authors" element={<AdminAuthorsPage />} />
            <Route path="genres" element={<AdminGenresPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="upload" element={<AdminUploadPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## Task 7 — Key Components

### File: `src/components/BookCard.tsx`

Generate a book card component that displays:
- Book cover image (placeholder if no image, using a color gradient with book icon)
- Title (font-serif, 2 lines max with ellipsis)
- Primary author name
- Genre badge (colored pill)
- Page count
- Available/Unavailable indicator (green/gray dot)
- Download button if available (accent color, shows lock icon if not logged in)
- The card links to `/books/{id}`

Use Tailwind CSS `book-card` class. Style inspired by Barnes & Noble product cards.

### File: `src/components/SearchBar.tsx`

Generate a search bar with:
- Large text input for title search
- Collapsible advanced filters panel (author, genre dropdown from API, publication year)
- "Search" button (primary style)
- "Clear" link when filters are active
- Responsive — full width on mobile

### File: `src/components/Pagination.tsx`

Generate a pagination component that:
- Shows current page / total pages
- Previous/Next buttons
- Page number buttons (max 7 shown, with ellipsis for large page counts)
- Calls `onPageChange(pageNumber)` callback

### File: `src/layouts/PublicLayout.tsx`

Generate a layout with:
- Header: logo "EBook Library" (left), navigation links (Search, Login/Register or user menu), language switcher (EN/ES)
- Sticky header with shadow on scroll
- Main content area
- Footer: tagline, links

### File: `src/layouts/AdminLayout.tsx`

Generate an admin layout with:
- Sidebar navigation: Dashboard, Books, Authors, Genres, Users, Upload
- Header with "Admin Panel" and user info + logout button
- Collapsible sidebar on mobile

---

## Task 8 — Pages

### File: `src/pages/HomePage.tsx`

Generate a Barnes & Noble-inspired home page with:
- Hero section: large book-themed banner with gradient (deep navy), headline, subtitle, search bar
- Featured genres grid (6-8 genre cards with colored backgrounds and book count)
- Featured books section (horizontal scroll of BookCard components)
- Library stats: "76,000+ eBooks available"

### File: `src/pages/SearchPage.tsx`

Generate a search page with:
- SearchBar at top with current filter values pre-filled
- URL query params reflect filters (`?title=...&genre=...`)  
- Results grid: responsive 4/3/2/1 columns
- Loading skeleton cards while fetching
- "No results" state with helpful message
- Pagination component at bottom
- Total results count

### File: `src/pages/BookDetailPage.tsx`

Generate a book detail page with:
- Hero: book cover (left, large), title, authors, genres, pages, year, language, status badge
- Download button (if available + authenticated) or login prompt
- Book description
- Related books by same author/genre
- Breadcrumb navigation

### File: `src/pages/auth/LoginPage.tsx`

Generate a login page with:
- Centered card (max 400px)
- Email and password fields using react-hook-form + zod validation
- Error message display (for API errors)
- "Sign In" button with loading state
- Link to register page

### File: `src/pages/auth/RegisterPage.tsx`

Generate a registration page with:
- Same centered card style as login
- Fields: Email, Password, Confirm Password, First Name (optional), Last Name (optional)
- Real-time password strength indicator
- Submit with loading state

### File: `src/pages/admin/BooksPage.tsx`

Generate an admin CRUD page for books with:
- Data table with columns: Title, Authors, Genre, Pages, Status (badge), Actions (Edit/Delete)
- Search/filter input above table
- Pagination (server-side)
- "Add Book" button → opens modal/slide-over form
- Delete confirmation dialog
- Uses TanStack Query for data + mutations

---

## Task 9 — React Query Hooks

### File: `src/hooks/useBooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../api/booksApi';
import type { BookSearchFilter } from '../types/api';

export const BOOKS_QUERY_KEY = 'books';

export function useSearchBooks(filter: BookSearchFilter) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, 'search', filter],
    queryFn: () => booksApi.search(filter),
    placeholderData: (prev) => prev, // smooth pagination (TanStack Query v5 — replaces keepPreviousData)
  });
}

export function useBookDetail(id: string) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, id],
    queryFn: () => booksApi.getById(id),
    enabled: !!id,
  });
}

export function useDownloadBook() {
  return useMutation({
    mutationFn: async (bookId: string) => {
      const blob = await booksApi.download(bookId);
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-${bookId}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
```

---

## Task 10 — Environment Configuration

### File: `.env.development`

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=EBook Library
```

### File: `.env.production`

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_NAME=EBook Library
```

---

## Task 11 — Build & Dev Commands

```bash
cd src/EBookLibrary.React

# Development
npm run dev        # Vite dev server on http://localhost:5173

# Build
npm run build      # Production build to dist/

# Preview production build
npm run preview    # Preview on http://localhost:4173

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Deliverables Checklist

- [ ] Vite + React 18 + TypeScript project runs without errors
- [ ] Tailwind CSS configured with custom color palette
- [ ] `apiClient.ts` with JWT interceptor
- [ ] `authStore.ts` with Zustand persist
- [ ] i18n configured with EN and ES locales (all keys translated)
- [ ] React Router configured with all routes
- [ ] `RequireAuth` and `RequireAdmin` guard components
- [ ] `PublicLayout` with responsive header and footer
- [ ] `AdminLayout` with sidebar navigation
- [ ] `HomePage` with hero, genres grid, featured books
- [ ] `SearchPage` with filters, results grid, pagination
- [ ] `BookDetailPage` with download functionality
- [ ] `LoginPage` and `RegisterPage` with form validation
- [ ] `AdminBooksPage` with CRUD table
- [ ] `AdminUsersPage` — role toggle, status toggle (Power icon), edit modal (name/email/password), delete dialog (with self-protection: role/status/delete buttons disabled for current user)
- [ ] `BookCard` component
- [ ] `SearchBar` component with advanced filters
- [ ] `Pagination` component
- [ ] React Query hooks for all API operations
- [ ] Language switcher works (EN ↔ ES)
- [ ] `npm run build` succeeds with no TypeScript errors

---

*Component 08 of 10 — EBook Library Project*
