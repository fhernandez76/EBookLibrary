# Chapter 27 — Building and Running the Application

> *"Shipping is a feature. A good developer knows how to
> get code off their machine and into the world."*

---

## What you will learn

- The difference between `npm run dev`, `npm run build`, and
  `npm run preview`, and when to use each.
- How Vite splits the production bundle into smaller chunks.
- How environment files control the API URL across environments.
- A 12-item verification checklist that confirms the application
  is fully working.
- A reference table of the most common errors and how to fix them.

---

## 27.1 The three run modes

Vite provides three script targets. Each serves a different purpose.

| Command | What it does | When to use |
|---|---|---|
| `npm run dev` | Starts the Vite dev server with Hot Module Replacement (HMR). Changes to `.tsx`/`.ts`/`.css` files update the browser instantly without a full reload. | During development. |
| `npm run build` | Compiles TypeScript, bundles and minifies all modules, and writes the output to `dist/`. The output is static HTML + JS + CSS that any web server can serve. | Before deploying to a server. |
| `npm run preview` | Serves the `dist/` folder locally using Vite's built-in static server. Useful for testing the production build before deploying. | After `npm run build`, to verify the build locally. |

---

## 27.2 Splitting the bundle with manual chunks

A default Vite build produces one large JavaScript file. This makes
the first page load slow because the browser must download and parse
the entire bundle before rendering anything.

*Manual chunks* tell Vite to split the bundle into separate files.
Browsers can then load them in parallel and cache library code
independently of your application code.

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react:   ['react', 'react-dom', 'react-router-dom'],
          query:   ['@tanstack/react-query'],
          i18n:    ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          zustand: ['zustand'],
          axios:   ['axios'],
        },
      },
    },
  },
});
```

After `npm run build`, the `dist/assets/` folder will contain
separate files named `react-[hash].js`, `query-[hash].js`, and so on.
The hashes change only when the content of that chunk changes, so
browsers cache library code indefinitely between deployments.

---

## 27.3 Environment files

Vite reads `.env.*` files automatically. The file loaded depends on
the mode.

| File | Loaded when |
|---|---|
| `.env` | Always loaded |
| `.env.local` | Always loaded, **git-ignored** — for local secrets |
| `.env.development` | `npm run dev` |
| `.env.production` | `npm run build` |
| `.env.production.local` | `npm run build`, **git-ignored** |

Only variables prefixed with `VITE_` are exposed to the browser.
All other variables are kept server-side.

**File:** `.env.development`

```
VITE_API_URL=http://localhost:5149/api
```

**File:** `.env.production`

```
VITE_API_URL=https://api.your-production-domain.com/api
```

In `src/api/apiClient.ts`:

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

`import.meta.env.VITE_API_URL` is replaced by the value from the
correct `.env.*` file at build time.

:::warning
**Never commit secrets to `.env.production`.**
The CORS origin, API base URL, and other non-secret configuration
values are safe to commit. Secrets (database passwords, API keys)
belong in deployment platform environment variables, not in files.
:::

---

## 27.4 Verification checklist

Run through these 12 items after every major change, and always
before deploying.

| # | Check | Expected result |
|---|---|---|
| 1 | `npm run build` completes without errors | `dist/` folder exists; no TypeScript compilation errors |
| 2 | `npm run preview` starts successfully | Browser opens `http://localhost:4173` |
| 3 | Home page loads | Hero section, genre chips, and 12 book cards visible |
| 4 | Search returns results | `http://localhost:4173/search?title=quijote` returns books |
| 5 | Pagination works | Page 2 loads different books; URL updates |
| 6 | Book detail page loads | Cover, title, author, metadata, download button visible |
| 7 | Login works | Submit with `admin@ebooklibrary.com` / `Admin@12345` → redirected to `/` |
| 8 | Auth state persists | Refresh the page → still logged in; username in header |
| 9 | File download works | Click Download on a book with a file → `.epub` file saved |
| 10 | Language toggle works | Click ES → all labels switch to Spanish; refresh → Spanish preserved |
| 11 | Admin pages load | Navigate to `/admin` → Dashboard stats appear |
| 12 | Logout works | Click Log Out → redirected to `/`; `/profile` redirects to `/login` |

---

## 27.5 Common errors reference

| Error | Cause | Fix |
|---|---|---|
| Tailwind classes have no effect | Tailwind v4 installed instead of v3 | Pin the version: `npm install tailwindcss@^3` |
| CORS error in browser console | API not configured to allow `http://localhost:5173` | Add `http://localhost:5173` to `AllowedOrigins` in the API's `appsettings.Development.json` |
| 401 Unauthorized on every request | JWT secret mismatch between dev token and API config | Ensure `JwtSettings__SecretKey` in API config matches the secret used to sign the token |
| Login succeeds but user disappears on refresh | `persist` middleware not configured, or `auth-storage` key mismatch | Verify `name: 'auth-storage'` in `createJSONStorage()` call in `authStore.ts` |
| Blob download saves an empty or corrupt file | `responseType: 'blob'` missing on the Axios request | Add `{ responseType: 'blob' }` to the `booksApi.download()` call |
| 401 redirect loop | Axios response interceptor redirects to `/login` which also 401s | Exclude `/auth/login` and `/auth/register` from the interceptor redirect logic |
| Translation keys appear as raw strings (e.g. `nav.home`) | `import './i18n'` is after component imports in `main.tsx` | Move `import './i18n'` to the very first line of `main.tsx` |
| `t is not a function` | `useTranslation()` called outside a component, or `i18n` not initialised | Ensure `main.tsx` imports `./i18n` before any component renders |
| Memory grows on search page | `URL.revokeObjectURL()` not called after blob download | Call `revokeObjectURL` immediately after `a.click()` in `useDownloadBook` |
| Pagination shows stale data on page change | `placeholderData` not set on `useQuery` | Add `placeholderData: (prev) => prev` to `useSearchBooks` |
| React Router 404 on direct URL access | Production server not configured for SPA routing | Configure server to serve `index.html` for all routes (e.g. Nginx `try_files $uri /index.html`) |
| Zustand `has` error on startup | `persist` store reads malformed JSON from a previous version | Clear `localStorage` in DevTools and reload |

---

## 27.6 Running the full stack

For development, two processes must run simultaneously.

**Terminal 1 — API:**

```powershell
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.WebApi
```

The API starts at `http://localhost:5149`.

**Terminal 2 — React:**

```powershell
cd Automatic/EBookLibrary/src/EBookLibrary.React
npm run dev
```

The frontend starts at `http://localhost:5173`.

---

## 27.7 Next steps

You now have a fully functional React frontend for the EBook Library
API. Here are directions for further improvement:

**Unit and integration testing.** Add [Vitest](https://vitest.dev/)
and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
to write component tests. Vitest integrates natively with Vite and
runs in the same environment.

**Secure the JWT.** Moving the token from `localStorage` to an
`httpOnly` cookie eliminates the XSS exposure described in Chapter 20.
This requires a backend change to issue the cookie and a frontend
change to remove the Axios interceptor (the browser sends cookies
automatically).

**Progressive Web App.** Add
[vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) to
enable offline browsing and an "Add to Home Screen" prompt on mobile.

**End-to-end testing.** The repository already contains
`EBookLibrary.E2E.Tests` with Playwright for .NET. Chapter 12 covers
the E2E test suite in detail.

---

## Key takeaways

- `npm run dev` is for development only. Always verify with
  `npm run build` + `npm run preview` before deploying.
- Manual chunks improve first-load performance by letting browsers
  cache library code separately from application code.
- Environment files keep configuration flexible across environments.
  Use `VITE_` prefix for variables that must reach the browser.
- The 12-item checklist covers all critical user journeys. Run it
  before every release.
- Most errors in this stack have known causes and known fixes.
  Consult the reference table before deep-diving.
