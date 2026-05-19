# Chapter 19 — The Axios API Client

> *"A good HTTP client is invisible. Components ask for data;
> they never deal with headers, tokens, or error codes."*

---

## What you will learn

- Why Axios is preferred over the browser's native `fetch` API.
- How request and response interceptors centralise JWT injection and
  401 handling.
- The complete code for every API module: auth, books, and admin.
- How to verify a working login call from the browser console.

**Expected result:** Opening the browser DevTools console and calling
`authApi.login(...)` returns a JWT and displays the user's details.

---

## 19.1 Why Axios?

The browser provides `fetch()`. Axios wraps it and adds the three
features that would otherwise require boilerplate in every component:

| Feature | Native fetch | Axios |
|---------|-------------|-------|
| Automatic JSON serialisation | Manual `JSON.stringify` + `Content-Type` header | Built in |
| Automatic JSON deserialisation | Manual `.json()` call | Built in |
| Interceptors | Not available | Request and response interceptors |
| Request cancellation | `AbortController` (verbose) | `CancelToken` (simpler) |

The interceptors are the main reason this project uses Axios. Two
interceptors — one on requests, one on responses — replace auth logic
that would otherwise live in every component that calls the API.

---

## 19.2 Create the Axios instance

**File:** `src/api/apiClient.ts`

```typescript
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5149/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT token ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 globally ─────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Why `window.location.href = '/login'` instead of React Router?

The response interceptor lives outside the React tree. It has no
access to the router's `navigate` function. The hard redirect via
`window.location.href` is deliberate: it discards all in-memory state
derived from the expired token and forces a clean page load. The user
starts fresh at the login page.

### Why read from `localStorage['auth_token']` (not from the Zustand store)?

The Zustand store is React state — reading it outside a component
requires calling `useAuthStore.getState()`, which works but creates a
tight coupling between the HTTP layer and the state layer. Reading the
raw string from `localStorage` is simpler and avoids circular
dependency risks. The two keys (`auth_token` and `auth-storage`) are
always written together by the auth store's `setAuth` action (Chapter 20).

---

## 19.3 Auth API module

**File:** `src/api/authApi.ts`

```typescript
import { apiClient } from './apiClient';
import type {
  AuthResponse, LoginRequest, RegisterRequest, ApiResponse,
} from '../types/api';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient
      .post<ApiResponse<AuthResponse>>('/auth/login', data)
      .then(r => r.data.data!),

  register: (data: RegisterRequest) =>
    apiClient
      .post<ApiResponse<AuthResponse>>('/auth/register', data)
      .then(r => r.data.data!),
};
```

The `.then(r => r.data.data!)` pattern unwraps two layers:

1. `r.data` — Axios's wrapper around the HTTP response body.
2. `.data` — the `ApiResponse<T>.data` field that contains the actual
   payload.

The `!` (non-null assertion) is acceptable here because the API
contract guarantees that `data` is present when `success === true`,
and the response interceptor has already handled the case where
`success === false` by rejecting the promise.

---

## 19.4 Books API module

**File:** `src/api/booksApi.ts`

```typescript
import { apiClient } from './apiClient';
import type {
  BookDetail, BookSearchFilter, BookSummary,
  PagedResult, ApiResponse,
} from '../types/api';

export const booksApi = {
  search: (filter: BookSearchFilter) =>
    apiClient
      .get<ApiResponse<PagedResult<BookSummary>>>('/books/search', { params: filter })
      .then(r => r.data.data!),

  getById: (id: string) =>
    apiClient
      .get<ApiResponse<BookDetail>>(`/books/${id}`)
      .then(r => r.data.data!),

  download: (id: string) =>
    apiClient
      .get(`/books/${id}/download`, { responseType: 'blob' })
      .then(r => r.data as Blob),
};
```

The `download` method differs from the others: it requests
`responseType: 'blob'` which tells Axios to receive the response body
as a `Blob` (binary data) rather than trying to parse it as JSON. The
caller (Chapter 23) will turn this `Blob` into a downloadable file.

---

## 19.5 Admin API module

The admin module exports separate API objects for each entity type to
keep the file scannable. Additional TypeScript interfaces for the
create and update request bodies are declared in the same file to keep
related code together.

**File:** `src/api/adminApi.ts`

```typescript
import { apiClient } from './apiClient';
import type {
  Author, Genre, User, PagedResult, ApiResponse, UpdateUserRequest,
} from '../types/api';

// ── Authors ─────────────────────────────────────────────────────────────────

export const authorsApi = {
  getAll: (pageNumber = 1, pageSize = 20) =>
    apiClient
      .get<ApiResponse<PagedResult<Author>>>('/authors', { params: { pageNumber, pageSize } })
      .then(r => r.data.data!),

  create: (data: { name: string; biography?: string }) =>
    apiClient.post<ApiResponse<string>>('/authors', data).then(r => r.data),

  update: (id: string, data: { name: string; biography?: string }) =>
    apiClient.put(`/authors/${id}`, { authorId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/authors/${id}`),
};

// ── Genres ───────────────────────────────────────────────────────────────────

export const genresApi = {
  getAll: () =>
    apiClient
      .get<ApiResponse<Genre[]>>('/genres')
      .then(r => r.data.data!),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<string>>('/genres', data).then(r => r.data),

  update: (id: string, data: { name: string; description?: string }) =>
    apiClient.put(`/genres/${id}`, { genreId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/genres/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: (pageNumber = 1, pageSize = 20) =>
    apiClient
      .get<ApiResponse<PagedResult<User>>>('/users', { params: { pageNumber, pageSize } })
      .then(r => r.data.data!),

  updateRole: (id: string, newRole: string) =>
    apiClient.patch(`/users/${id}/role`, { newRole }),

  updateStatus: (id: string) =>
    apiClient.patch(`/users/${id}/status`, null),

  updateUser: (id: string, data: UpdateUserRequest) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data).then(r => r.data.data!),

  deleteUser: (id: string) =>
    apiClient.delete(`/users/${id}`),
};

// ── Books (admin write operations) ────────────────────────────────────────────

export interface CreateBookPayload {
  title: string;
  pages: number;
  publicationYear?: number;
  isbn?: string;
  description?: string;
  language: string;
  authorIds: string[];
  genreIds: string[];
}

export interface UpdateBookPayload {
  title: string;
  pages: number;
  publicationYear?: number;
  isbn?: string;
  description?: string;
  language: string;
}

export const adminBooksApi = {
  create: (data: CreateBookPayload) =>
    apiClient.post<ApiResponse<string>>('/books', data).then(r => r.data),

  update: (id: string, data: UpdateBookPayload) =>
    apiClient.put(`/books/${id}`, { bookId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/books/${id}`),
};
```

---

## 19.6 Create the barrel export

**File:** `src/api/index.ts`

```typescript
export { apiClient } from './apiClient';
export { authApi } from './authApi';
export { booksApi } from './booksApi';
export { authorsApi, genresApi, usersApi, adminBooksApi } from './adminApi';
export type { CreateBookPayload, UpdateBookPayload } from './adminApi';
```

---

## Chapter 19 checkpoint

The API must be running before attempting this check.

1. Start the backend: `dotnet run --project .../EBookLibrary.WebApi`
2. Start the frontend: `npm run dev` (from `src/EBookLibrary.React/`)
3. Open the browser, navigate to `http://localhost:5173`
4. Open DevTools (F12) → **Console** tab
5. Paste and run the following:

```javascript
// Dynamically import the API module from the running app
const { authApi } = await import('/src/api/authApi.ts');
const result = await authApi.login({
  email: 'admin@ebooklibrary.com',
  password: 'Admin@12345'
});
console.log(result);
```

You should see an object printed with `userId`, `email`, `role: 'Admin'`,
and a long `token` string.

:::note
The seeded admin credentials are `admin@ebooklibrary.com` /
`Admin@12345`. If you seeded with different values, use those.
If the call fails with a network error, confirm the API is running
on port 5149 and that the CORS policy allows `http://localhost:5173`.
:::

---

## Key takeaways

- Axios interceptors are the correct place for cross-cutting HTTP
  concerns (auth headers, global error handling).
- The `.then(r => r.data.data!)` pattern unwraps the API envelope
  once so components receive the inner payload directly.
- The `download` endpoint uses `responseType: 'blob'` — the only
  exception to the JSON-everywhere convention.
- The response interceptor's hard redirect (`window.location.href`)
  discards stale in-memory state on 401 — intentionally blunt.
