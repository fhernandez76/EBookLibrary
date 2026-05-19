# Chapter 18 — TypeScript Types: Mirroring the API Contract

> *"A type is a promise between the producer of data and the
> consumer of data. Make the promise in one place and keep it
> everywhere."*

---

## What you will learn

- Why the frontend declares TypeScript types that mirror the
  backend's DTOs.
- The complete set of types used throughout this application, with
  an explanation of every field.
- How TypeScript generics (`ApiResponse<T>`, `PagedResult<T>`) carry
  the response shape from network edge to component without a cast.

**Expected result:** The TypeScript compiler accepts
`import type { BookSummary } from '../types/api'` from any file in
`src/`. All subsequent chapters import from this file.

---

## 18.1 Why mirror the backend types?

The EBook Library API returns JSON. JavaScript has no types. Without
TypeScript, every component that consumes a book object must
remember what fields exist — and gets no warning when it
accesses a field that was renamed on the server.

By declaring TypeScript interfaces that mirror the backend's
C# DTOs, every component gets:

- **Autocomplete** — type `book.` and the editor lists the available
  fields.
- **Compile-time errors** — accessing `book.authorName` when the
  field is `book.primaryAuthor` fails at build time, not at the
  user's browser.
- **Refactor safety** — if a field name changes, the compiler points
  to every usage in one step.

The types are declared once, in a single file, and imported wherever
they are needed. This is the "declare once, use everywhere" principle.

---

## 18.2 Create the types file

Create the file below. Every type is described section by section
after the listing.

**File:** `src/types/api.ts`

```typescript
// ── Authentication ─────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'Regular' | 'Admin';
  token: string;
  expiresAt: string;
}

// ── Books ──────────────────────────────────────────────────────────────────

export interface BookSummary {
  id: string;
  title: string;
  pages: number;
  publicationYear?: number;
  coverImageUrl?: string;
  status: 'Available' | 'Unavailable' | 'Removed';
  hasFile: boolean;
  primaryAuthor: string;
  primaryGenre: string;
}

export interface BookDetail {
  id: string;
  title: string;
  pages: number;
  publicationYear?: number;
  isbn?: string;
  description?: string;
  coverImageUrl?: string;
  language: string;
  status: string;
  hasFile: boolean;
  authors: string[];
  genres: string[];
}

export interface BookSearchFilter {
  title?: string;
  authorName?: string;
  genreName?: string;
  publicationYear?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ── Catalog ────────────────────────────────────────────────────────────────

export interface Author {
  id: string;
  name: string;
  biography?: string;
  bookCount: number;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  bookCount: number;
}

// ── Users (Admin) ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  newPassword?: string;
}

// ── Shared envelopes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
```

---

## 18.3 Type-by-type explanation

### Authentication types

`LoginRequest` and `RegisterRequest` are the request bodies sent to
the API's `/auth/login` and `/auth/register` endpoints. They match the
C# command classes in the Application layer precisely.

`AuthResponse` is the payload returned on successful login or
registration. The `role` field uses a union type — `'Regular' | 'Admin'`
— which means TypeScript will reject any other string, even a
correctly-spelled one with a different case.

```typescript
const user: AuthResponse = { role: 'admin', ... };
// Error: Type '"admin"' is not assignable to type '"Regular" | "Admin"'
```

The `token` field is a JWT string. The `expiresAt` field is an ISO
8601 datetime string (`"2026-05-13T12:00:00Z"`).

### Book types

`BookSummary` is the lightweight shape returned by search results.
The distinction from `BookDetail` is intentional: the list endpoint
returns thousands of records and includes only the fields needed for
a card display. Fetching the full detail (including `description`,
`isbn`, all `authors`, and all `genres`) happens only when the user
opens a specific book.

`BookSearchFilter` defines the query parameters for the search
endpoint. Every field is optional because any combination is valid —
search by title only, by genre only, by author and year together, and
so on.

### Catalog types

`Author` and `Genre` are used both in the public pages (genre filter
chips on Home; author links on Book Detail) and in the admin CRUD
pages.

### ApiResponse and PagedResult

These are the two generic envelopes that wrap every response from the
API.

```
GET /books/search?title=cervantes
→ ApiResponse<PagedResult<BookSummary>>
   ├── success: true
   └── data:
       ├── items: BookSummary[]
       ├── totalCount: 47
       ├── pageNumber: 1
       ├── pageSize: 24
       ├── totalPages: 2
       ├── hasPreviousPage: false
       └── hasNextPage: true
```

The generic type parameter `T` tells TypeScript what `data` contains.
A component that calls `booksApi.search(...)` receives
`PagedResult<BookSummary>`, which means the compiler knows that
`result.items[0].title` is a `string` — not `any` — without any cast.

---

## 18.4 Create the barrel export

A barrel file re-exports everything from a module so that importers
can write `from '../types'` instead of `from '../types/api'`. This is
a minor convenience now but pays off when the `types/` folder grows.

**File:** `src/types/index.ts`

```typescript
export * from './api';
```

---

## Chapter 18 checkpoint

Add the following temporary line to `src/App.tsx` to confirm the
types compile:

```tsx
import type { BookSummary, ApiResponse, PagedResult } from './types';

// Remove after verifying — this is just a compile check:
const _check: ApiResponse<PagedResult<BookSummary>> = {
  success: true,
  data: {
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 24,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-serif font-bold text-primary-500">
        EBook Library
      </h1>
    </div>
  );
}
```

Run `npm run build` (not `npm run dev` — the build step runs the
TypeScript compiler). If the output shows `✓ built in Xs` with no
type errors, the types are correct. Remove the `_check` variable
before proceeding.

---

## Key takeaways

- Declaring frontend types that mirror backend DTOs is not
  duplication — it is a safety layer at the system boundary where
  JavaScript meets the network.
- Generic envelopes (`ApiResponse<T>`, `PagedResult<T>`) carry the
  exact shape of each response through the entire call stack.
- The `role: 'Regular' | 'Admin'` union is a TypeScript best
  practice — it rejects mis-typed values at compile time.
- Optional fields (`?`) must be checked before use —
  `book.coverImageUrl && <img src={book.coverImageUrl} />`.
