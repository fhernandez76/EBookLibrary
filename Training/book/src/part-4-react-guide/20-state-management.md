# Chapter 20 — State Management: Zustand and TanStack Query

> *"State management is not one problem. It is two problems
> wearing the same coat: client state and server state."*

---

## What you will learn

- The critical distinction between client state and server state.
- How Zustand stores the authentication token and user info, and
  why it survives a hard browser reload.
- How TanStack Query manages every server interaction — caching,
  background refresh, pagination, and mutations — with almost no
  boilerplate.
- The complete auth store and custom query hooks used in this
  project.

**Expected result:** After implementing the auth store, calling
`setAuth(...)` from the browser DevTools persists state across a
hard refresh (Ctrl+F5).

---

## 20.1 Two halves of state

Every piece of state in a React application is either *client state*
or *server state*.

**Client state** is data that lives entirely in the browser:
- Is the navigation menu open?
- What language is the user viewing?
- Is the user authenticated, and who are they?

**Server state** is data fetched from and synchronised with the API:
- The list of books matching a search query.
- The details of a specific book.
- The current user's download history.

These two kinds of state have different requirements:

| Concern | Client state | Server state |
|---------|-------------|--------------|
| Where does truth live? | Browser only | Server (browser has a cache) |
| How long is it valid? | Until the user changes it | Until the server data changes |
| What happens on page reload? | Depends on persisting strategy | Re-fetch from server |
| What happens on stale data? | No concept of stale | Show stale, fetch fresh in background |

Using a single global store for both leads to complex synchronisation
logic. This project uses **Zustand** for client state and
**TanStack Query** for server state.

---

## 20.2 Zustand — client state

Zustand is a minimalist state management library. Its central insight
is that a store is just a function that returns state and actions.
There is no Provider, no `connect`, no `mapStateToProps`.

**Listing 20.1 — The minimal Zustand pattern.**

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
}));

// In any component:
function Counter() {
  const { count, increment } = useCounterStore();
  return <button onClick={increment}>{count}</button>;
}
```

`create()` returns a hook. Calling the hook inside a component
subscribes that component to the store. When `set()` is called, only
the components that subscribe to the changed slice re-render.

### Subscribing to a slice

You can pass a selector to the hook to subscribe to only part of the
state. This prevents re-renders when an unrelated field changes.

```typescript
// Re-renders only when isAdmin changes:
const isAdmin = useAuthStore(s => s.isAdmin);

// Re-renders when any field changes:
const { user, isAdmin, clearAuth } = useAuthStore();
```

---

## 20.3 The auth store

The auth store holds the JWT token, the user object, two derived
boolean flags, and two actions. The `persist` middleware mirrors the
store to `localStorage` so the user stays logged in across page reloads.

**File:** `src/stores/authStore.ts`

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
        // Store raw token for the Axios request interceptor
        localStorage.setItem('auth_token', auth.token);
        set({
          user: auth,
          isAuthenticated: true,
          isAdmin: auth.role === 'Admin',
        });
      },

      clearAuth: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    { name: 'auth-storage' }   // the localStorage key
  )
);
```

### Why two localStorage keys?

There are two separate keys written by this store:

1. **`auth_token`** — a raw JWT string, written by `setAuth` and read
   by the Axios request interceptor. The interceptor uses a simple
   `localStorage.getItem('auth_token')` call because it runs outside
   the React tree and cannot call Zustand hooks.

2. **`auth-storage`** — the full Zustand store state, serialised as
   JSON by the `persist` middleware. This is what restores
   `isAuthenticated`, `isAdmin`, and the user object on page reload.

Both keys are written by `setAuth()`. Both are cleared by `clearAuth()`.
They must always stay in sync — if you add a logout elsewhere in the
application, always call `clearAuth()` and never clear the keys
independently.

:::warning
**Security note — JWT in localStorage.**
Storing a JWT in `localStorage` exposes it to any JavaScript running
on the same origin. A successful XSS attack can read the token and
impersonate the user. The mitigations are: a strict Content Security
Policy, input sanitisation, and dependency hygiene (keep packages
updated). For a higher-security production deployment, store the JWT
in an `httpOnly` cookie instead — but that requires backend changes
(set-cookie on login, cookie auth scheme in the API) and is left as a
hard exercise in Chapter 27.
:::

---

## 20.4 Create the hooks directory

The custom query hooks belong in `src/hooks/`. They wrap TanStack
Query calls so components do not need to know the `queryKey` format or
the API function signature.

**File:** `src/hooks/useBooks.ts`

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { booksApi } from '../api/booksApi';
import type { BookSearchFilter } from '../types/api';

export const BOOKS_QUERY_KEY = 'books';

export function useSearchBooks(filter: BookSearchFilter) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, 'search', filter],
    queryFn: () => booksApi.search(filter),
    placeholderData: (prev) => prev,  // show previous page while next page loads
  });
}

export function useBookDetail(id: string) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, id],
    queryFn: () => booksApi.getById(id),
    enabled: !!id,               // do not run if id is empty
  });
}

export function useDownloadBook() {
  return useMutation({
    mutationFn: async (bookId: string) => {
      const blob = await booksApi.download(bookId);

      // Standard browser Blob-to-download pattern:
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-${bookId}.epub`;
      document.body.appendChild(a);
      a.click();

      // Clean up immediately to avoid a memory leak:
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
```

### How TanStack Query works

Every `useQuery` call has two required properties:

- **`queryKey`** — an array that uniquely identifies this query.
  Changing any element of the array triggers a new fetch. The pattern
  `[BOOKS_QUERY_KEY, 'search', filter]` means "the search results for
  this exact filter object". TanStack Query uses deep equality on the
  array, so changing `filter.pageNumber` from 1 to 2 automatically
  triggers a new request.
- **`queryFn`** — a function that returns a Promise. TanStack Query
  calls it, waits for the result, and caches it under the `queryKey`.

**`placeholderData: (prev) => prev`** is the pagination smoothness
trick. While the next page is loading, the component still has access
to the previous page's data and continues to render. The user sees the
old results briefly instead of a loading skeleton — the transition
feels instant.

**`enabled: !!id`** prevents the query from running before the `id`
value is available. On the book detail page, the `id` comes from the
URL parameter; `enabled` guards against a race condition on first render.

---

## 20.5 Configure TanStack Query in main.tsx

TanStack Query requires a `QueryClientProvider` at the root of the
React tree. This is handled in `App.tsx` (Chapter 21), but the
`QueryClient` instance lives outside the component:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes — don't refetch within 5 min
      retry: 1,                    // retry once on network failure
    },
  },
});
```

`staleTime` is the number of milliseconds a cached result is
considered fresh. The default is `0` — TanStack Query would refetch
on every component mount. Setting it to five minutes means searching
for "cervantes" twice in quick succession hits the cache the second
time, and no network request is made.

---

## Chapter 20 checkpoint

1. Run `npm run dev` and open the browser.
2. Open DevTools → Application → Local Storage → `http://localhost:5173`.
3. Confirm no keys are present yet.
4. In the DevTools Console, run:

```javascript
// Get the Zustand store from the window (development only)
// The actual test is in Chapter 22 after the Login page exists.
// For now, verify the store initialises correctly:
import('/src/stores/authStore.ts').then(m => {
  console.log(m.useAuthStore.getState());
});
```

You should see:
```
{ user: null, isAuthenticated: false, isAdmin: false, setAuth: f, clearAuth: f }
```

If you see an error, check that `src/stores/authStore.ts` has no
TypeScript errors and that `zustand` is installed.

After implementing the Login page (Chapter 22), re-run this checkpoint:
log in, then hard-refresh (Ctrl+F5) and confirm `isAuthenticated` is
still `true` in the store.

---

## Key takeaways

- Client state (auth, UI toggles) belongs in Zustand.
- Server state (books, authors, genres) belongs in TanStack Query.
- Zustand's `persist` middleware writes to `localStorage` and
  restores state on reload — the user stays logged in.
- TanStack Query's `queryKey` is the cache key: same key → same
  cached data; changed key → new request.
- `placeholderData: (prev) => prev` makes paginated lists feel instant
  by showing the old page while the new page loads.
- Always call `URL.revokeObjectURL()` after triggering a download,
  or the browser will hold the Blob in memory until the tab closes.
