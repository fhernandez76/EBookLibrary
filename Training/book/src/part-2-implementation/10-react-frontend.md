# Chapter 10 — The React Frontend

> *"A frontend is just another consumer of the API. Build it as such."*

---

## What you will learn

- How a Vite + React 19 + TypeScript project is structured for a
  small but realistic application.
- How **Zustand** replaces Redux at a fraction of the ceremony for
  the project's two stores: authentication and notifications.
- How **TanStack Query** handles every server interaction with
  caching, background refresh, and optimistic update built in.
- How the typed API client mirrors the backend's `ApiResponse<T>`
  envelope.
- How Axios interceptors attach the JWT and translate 401 into a
  redirect to login.
- How the app shell, public pages, and admin pages compose into a
  small but complete SPA.

---

## 10.1 The shape of a modern React app

The React project lives in `src/EBookLibrary.React/` and is a
Vite-driven single-page application. The folder structure makes the
layering of the frontend explicit.

**Listing 10.1 — Folder layout (abridged).**

```text
src/
├── api/            ← Axios instance, interceptors, typed endpoints
├── components/     ← Reusable UI: Button, Input, BookCard, Header...
├── pages/          ← One file per route: Login, Register, BookDetail,
│                     SearchResults, MyDownloads, AdminBooks, ...
├── stores/         ← Zustand: useAuthStore, useNotificationStore
├── hooks/          ← Custom hooks: useDebounce, useAuth, ...
├── types/          ← TypeScript types mirroring backend DTOs
├── utils/          ← formatters, validators
├── App.tsx         ← Router + layout
└── main.tsx        ← Vite entry: providers + QueryClient + StrictMode
```

There is no Redux, no Saga, no React-Router data loaders, no
Server Components. Each of those would be defensible — none is
necessary for this scope. The dependency budget is short on purpose.

> **In Practice:** A common failure mode in React projects is reaching
> for the most-popular library before the problem requires it.
> Zustand is 1.5 KB and solves "I have a piece of state two
> components apart need to share" without a reducer in sight. Reach
> for Redux when you have either time-travel debugging requirements
> or a state shape complex enough to need its discipline. Most apps
> do not.

![Figure 10.1 — Home page rendered by the React frontend.](figures/14-ui-home-page.jpg)

---

## 10.2 The typed API client

The API client wraps Axios and exposes one method per backend
endpoint. Every method returns the typed `ApiResponse<T>` that
matches the backend envelope.

**Listing 10.2 — `api/client.ts`.**

```typescript
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT to every call.
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto-logout on 401.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

Two interceptors do the work that would otherwise be sprinkled across
every component. The request interceptor reads the JWT *from the
Zustand store* — not from `localStorage` directly — so that login and
logout flows in the store remain the single source of truth. The
response interceptor catches 401, clears the auth state, and redirects.
A single hard-redirect (`window.location.href = ...`) is intentional;
it discards any in-memory state that might have been derived from the
expired token.

**Listing 10.3 — `api/books.ts` (typed endpoint methods).**

```typescript
import client from './client';
import type { ApiResponse, PagedResult, Book, BookSearchQuery } from '../types';

export const booksApi = {
  search: (q: BookSearchQuery) =>
    client.get<ApiResponse<PagedResult<Book>>>('/api/books/search', { params: q })
          .then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Book>>(`/api/books/${id}`).then((r) => r.data),

  download: (id: string) =>
    client.get<Blob>(`/api/books/${id}/download`, { responseType: 'blob' })
          .then((r) => r.data),

  create: (book: CreateBookRequest) =>
    client.post<ApiResponse<Book>>('/api/books', book).then((r) => r.data),

  update: (id: string, book: UpdateBookRequest) =>
    client.put<ApiResponse<Book>>(`/api/books/${id}`, book).then((r) => r.data),

  delete: (id: string) =>
    client.delete<ApiResponse<void>>(`/api/books/${id}`).then((r) => r.data),
};
```

The TypeScript generics carry the response shape from the network
edge to the components. A component asking for `data?.items` gets
autocomplete for `Book` properties without a single cast.

---

## 10.3 The Zustand auth store

Zustand stores are functions. There is no provider, no
`combineReducers`, no `connect`. The hook returned by `create()` *is*
the store.

**Listing 10.4 — `stores/useAuthStore.ts`.**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user:  AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login:  (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user:  null,
      isAuthenticated: false,
      isAdmin: false,

      login: (token, user) => set({
        token, user,
        isAuthenticated: true,
        isAdmin: user.role === 'Admin',
      }),

      logout: () => set({
        token: null, user: null,
        isAuthenticated: false, isAdmin: false,
      }),
    }),
    { name: 'ebook-auth' }   // localStorage key
  )
);
```

`persist` is the middleware that mirrors the store to `localStorage`
under the key `ebook-auth`. The same XSS exposure noted in § 8.6
applies — a tiny script injection can read this key. The mitigations
of that section apply here.

> **Architect's Note:** Zustand's "stores are hooks" philosophy means
> you can subscribe to a *slice* of state and re-render only when that
> slice changes:
>
> ```typescript
> const isAdmin = useAuthStore((s) => s.isAdmin);
> ```
>
> This single line replaces the `connect`/`mapStateToProps` ceremony
> from earlier React eras. The selector function is the unit of
> subscription. Smaller selectors mean fewer re-renders.

---

## 10.4 TanStack Query — the rest of state

State management has two halves: *client* state (UI toggles, the auth
token) and *server* state (the catalog of books, the user's downloads).
Zustand handles the first half. TanStack Query handles the second.

**Listing 10.5 — `pages/SearchResults.tsx` (data hook).**

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['books', { title, author, genre, page }],
  queryFn:  () => booksApi.search({ title, author, genre, pageNumber: page, pageSize: 20 }),
  placeholderData: (prev) => prev,    // smooth pagination
});

if (isLoading) return <Spinner />;
if (error)     return <ErrorState onRetry={() => refetch()} />;

return (
  <BookGrid books={data?.data?.items ?? []} />
);
```

TanStack Query provides four things for free:

1. **Caching** keyed on the query key. Searching the same term twice
   in five minutes hits the cache, not the server.
2. **Background refresh** when the tab regains focus.
3. **Stale-while-revalidate** rendering. The previous page's data is
   shown while the next page loads — `placeholderData` makes
   pagination feel instant.
4. **Retry with backoff** for failed requests.

For mutations, `useMutation` plays the same role and additionally
supports *optimistic updates* — the UI assumes the mutation will
succeed and rolls back if it doesn't.

**Listing 10.6 — `pages/AdminBooks.tsx` (mutation with optimistic update).**

```typescript
const queryClient = useQueryClient();

const createBook = useMutation({
  mutationFn: booksApi.create,
  onMutate: async (newBook) => {
    await queryClient.cancelQueries({ queryKey: ['books'] });
    const previous = queryClient.getQueryData(['books']);
    queryClient.setQueryData(['books'], (old: any) => ({
      ...old,
      data: { ...old.data, items: [newBook, ...old.data.items] },
    }));
    return { previous };
  },
  onError: (_err, _newBook, ctx) =>
    queryClient.setQueryData(['books'], ctx?.previous),     // rollback
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
});
```

> **Pitfall:** Optimistic updates feel magical and silently mislead
> the user when they fail. The `onError` rollback is *not* optional —
> without it, the UI claims success that the server never confirmed.
> Test the failure path explicitly. (Chapter 13's E2E suite has a
> "force the API to 500 and confirm rollback" scenario that catches
> regressions in this code.)

---

## 10.5 The login flow

Putting the pieces together: a login form submits, the API returns a
JWT, the Zustand store accepts it, TanStack Query invalidates any
cached data tied to the previous user, and the router navigates.

![Figure 10.2 — The login and registration screens.](figures/15-ui-login-register.jpg)

**Listing 10.7 — `pages/Login.tsx` (abridged).**

```typescript
const login = useAuthStore((s) => s.login);
const navigate = useNavigate();
const queryClient = useQueryClient();

const submit = async (data: LoginFormValues) => {
  const response = await authApi.login(data);
  if (!response.success) {
    setError('Invalid email or password.');   // generic — see § 5.5
    return;
  }
  login(response.data!.token, response.data!.user);
  await queryClient.invalidateQueries();      // wipe stale-per-user caches
  navigate('/');
};
```

The same generic error message used by the backend (§ 5.5) is
reflected here: the UI never says "user not found" or "wrong
password" specifically.

---

## 10.6 The book detail page and download

The detail page is the app's most data-heavy view. It loads the book,
its authors, and its genres in one query (the Web API includes them in
the response — see § 6.5), and offers a download button that streams
the file from the API.

![Figure 10.3 — Book detail and download.](figures/17-ui-book-detail.jpg)
![Figure 10.4 — Sequence: book download from click to file.](figures/09-seq-book-download.jpg)

**Listing 10.8 — `pages/BookDetail.tsx` (download handler).**

```typescript
const handleDownload = async () => {
  if (!isAuthenticated) { navigate('/login'); return; }
  try {
    const blob = await booksApi.download(book.id);
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),
                  { href: url, download: `${book.title}.epub` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    notify('success', 'Download started.');
  } catch (e) {
    notify('error', 'Download failed. Please try again.');
  }
};
```

The pattern of "create a hidden `<a>`, click it, revoke the URL" is
the standard recipe for downloading a Blob in the browser. It is
ugly; it is also the only way that works in every browser without
relying on third-party libraries.

---

## 10.7 Router shape and protected routes

The router uses React Router v6's nested-route syntax. A `RequireAuth`
wrapper redirects unauthenticated requests to `/login`; a separate
`RequireAdmin` does the role check.

**Listing 10.9 — `App.tsx` (route table).**

```tsx
<Routes>
  <Route element={<AppShell />}>
    <Route index                element={<Home />} />
    <Route path="search"        element={<SearchResults />} />
    <Route path="books/:id"     element={<BookDetail />} />
    <Route path="login"         element={<Login />} />
    <Route path="register"      element={<Register />} />

    <Route element={<RequireAuth />}>
      <Route path="my-downloads" element={<MyDownloads />} />
      <Route path="profile"      element={<Profile />} />
    </Route>

    <Route element={<RequireAdmin />}>
      <Route path="admin/books"   element={<AdminBooks />} />
      <Route path="admin/authors" element={<AdminAuthors />} />
      <Route path="admin/genres"  element={<AdminGenres />} />
      <Route path="admin/users"   element={<AdminUsers />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Route>
</Routes>
```

`RequireAuth` and `RequireAdmin` are tiny — they read the auth store
and either render `<Outlet />` or `<Navigate />`.

> **Pitfall:** Frontend route guards are a *user-experience* feature,
> not a *security* feature. They prevent the user from seeing a
> useless page; they do not prevent a determined caller from hitting
> the API directly. The protection is on the backend (§ 8.5). Always
> have both, but never rely on the frontend alone.

---

## 10.8 The admin shell

The admin pages share an `<AdminLayout>` with a sidebar of links and
a content area. Each admin page wraps a TanStack Table for the data
grid plus a modal for create/edit.

![Figure 10.5 — Authors and books in the admin view.](figures/01-authors-and-books.jpg)
![Figure 10.6 — Genres and books in the admin view.](figures/02-genres-and-books.jpg)

The admin pages are deliberately rendered with TanStack Table rather
than a heavyweight grid component. The trade-off: no filter UI for
free, but full control over column definitions, sorting, and
pagination, and no surprise upgrades.

---

## 10.9 Build and deployment

`npm run build` produces a `dist/` folder of static files (HTML, JS,
CSS, hashed asset paths). The deployment story is "serve `dist/`
behind the API's CORS-allowed origin" — anything that can serve
static files (Nginx, Azure Static Web Apps, Cloudflare Pages, S3 +
CloudFront) is enough.

**Listing 10.10 — `vite.config.ts` (build configuration).**

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,                       // useful in production for error tracking
    rollupOptions: {
      output: {
        manualChunks: {
          react:   ['react', 'react-dom', 'react-router-dom'],
          query:   ['@tanstack/react-query'],
          axios:   ['axios'],
        },
      },
    },
  },
});
```

The manual chunks split frequently-cached dependencies into separate
files; a deploy that updates only the application code does not bust
the user's cached `react.js`.

---

## 10.10 Checkpoint

You are ready for Chapter 11 when:

- [ ] `npm run dev` starts on port 5173 and the home page renders.
- [ ] Login with the seeded admin succeeds and refreshing the page
      keeps you logged in.
- [ ] Searching `cervantes` returns at least one book.
- [ ] The browser's Network tab shows TanStack Query *not* refetching
      a search you just performed.
- [ ] Closing and reopening the tab keeps you logged in (verify the
      `ebook-auth` key in DevTools → Application → Local Storage).

---

## Key takeaways

- Zustand handles client state with two stores and zero boilerplate.
- TanStack Query handles server state with caching, background
  refresh, optimistic updates, and retry — features that would
  otherwise require thousands of lines of bespoke code.
- The Axios client centralizes JWT attachment and 401 handling so
  components never deal with auth.
- Frontend route guards are UX, not security; the backend is the
  authoritative gate.
- Vite manual chunking lets a small frontend deploy ship updates
  without busting common cached dependencies.

---

## Exercises

**Easy.** Add a "remember me" checkbox to the login form. When
unchecked, switch the Zustand `persist` middleware from `localStorage`
to `sessionStorage` so the token clears when the tab closes.

**Medium.** Add a global search box in the header that uses the
`useDebounce` hook (350ms) before issuing a TanStack Query call.
Verify in DevTools that no request is sent until the user pauses.

**Hard.** Replace `localStorage` JWT storage with httpOnly cookies.
This will require backend changes (set-cookie on login, cookie auth
scheme on the JWT bearer middleware), CORS changes
(`AllowCredentials()` is already set), and a CSRF token strategy.
Discuss what code in the React project simplifies — and what
complications appear in the auth store now that the token is no
longer JS-readable.

---

## Further reading

- TanStack Query docs.
  <https://tanstack.com/query/latest>
- Zustand docs.
  <https://zustand-demo.pmnd.rs/>
- Kent C. Dodds, *"Application State Management with React"*.
- Vite docs — *Build Optimizations* and *Code Splitting*.
- React Router v6 — *Authentication* recipe.
