# Chapter 17 — Project Setup: Vite, Dependencies, and Tailwind

> *"A well-configured project is the cheapest investment you make.
> Done wrong, it costs you every day for the life of the project."*

---

## What you will learn

- How to scaffold a React + TypeScript project with Vite.
- Why each dependency in `package.json` exists.
- How to configure Tailwind CSS v3 with the Barnes & Noble colour
  palette used throughout this application.
- How to structure the source folder so every subsequent chapter
  knows exactly where its files go.
- How to set the API base URL via an environment variable.

**Expected result:** `npm run dev` starts on port 5173, the browser
shows a blank React page, and the Tailwind styles in `index.css` are
active.

---

## 17.1 Why Vite?

Create React App (CRA) was the standard scaffolding tool until 2023.
It has been deprecated. Vite replaces it for several reasons:

- **Instant server start.** Vite serves files via native ES Modules
  during development. It does not bundle the entire application before
  showing you a result. On a large project, this is the difference
  between a 30-second start and a sub-second start.
- **Fast HMR.** Hot Module Replacement in Vite swaps exactly the
  changed module. In CRA, an edit to any file triggered a full rebuild.
- **Production builds with Rollup.** `npm run build` uses Rollup,
  which produces optimised, tree-shaken bundles.

---

## 17.2 Scaffold the project

Open a terminal inside the `.../src/` folder of the EBook Library
solution and run the following command. Do not run `npm install` yet —
the pitfall callout below explains why.

**Listing 17.1 — Scaffold the Vite project.**

```powershell
# From Automatic/EBookLibrary/src/
npm create vite@latest EBookLibrary.React -- --template react-ts
cd EBookLibrary.React
```

The `--template react-ts` flag produces a TypeScript project. The
scaffolder creates `src/`, `public/`, `index.html`, `vite.config.ts`,
`tsconfig.json`, and a minimal `App.tsx`.

---

## 17.3 Install dependencies

Install each group in order. The explanations below justify every
package before you type it.

### Core: routing, HTTP, state, and forms

```powershell
npm install react-router-dom axios @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
```

| Package | One-line purpose |
|---------|-----------------|
| `react-router-dom` | Declares which component renders at which URL path. |
| `axios` | HTTP client with interceptors for attaching JWTs and handling 401. |
| `@tanstack/react-query` | Caches, refetches, and manages all server state. |
| `zustand` | Lightweight global store for client state (auth token, user info). |
| `react-hook-form` | Connects form inputs to validation without re-rendering on every keystroke. |
| `@hookform/resolvers` | Bridge between react-hook-form and Zod validation schemas. |
| `zod` | Type-safe schema validation for form inputs. |

### Internationalisation

```powershell
npm install i18next react-i18next i18next-browser-languagedetector
```

| Package | One-line purpose |
|---------|-----------------|
| `i18next` | Translation engine. |
| `react-i18next` | React bindings: `useTranslation` hook, `<Trans>` component. |
| `i18next-browser-languagedetector` | Detects the browser's preferred language on first load. |

### Icons

```powershell
npm install lucide-react
```

Lucide React provides clean SVG icons as components
(`<BookOpen />`, `<Search />`, `<User />`, etc.). The icon set
is consistent across the entire application.

### Tailwind CSS (development dependencies)

:::warning
**Critical — pin to v3 explicitly.**
The command `npm install tailwindcss` (without a version) resolves to
Tailwind v4, which uses a completely different configuration format.
The `tailwind.config.js` in this chapter is a v3 file. On v4 it will
be silently ignored and none of the custom colours or typography plugin
will work. The resulting error — unstyled output — does not point at
the version mismatch. Always install `tailwindcss@3`.
:::

```powershell
npm install -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p
```

`npx tailwindcss init -p` creates two files:
- `tailwind.config.js` — Tailwind's configuration file.
- `postcss.config.js` — Tells the CSS build pipeline to run Tailwind
  and Autoprefixer.

### Node types (for Vite config)

```powershell
npm install -D @types/node
```

This gives TypeScript access to Node.js types (`path`, `process.env`,
etc.) needed in `vite.config.ts`.

---

## 17.4 Configure Tailwind

Replace the generated `tailwind.config.js` with the Barnes & Noble
colour palette used throughout this project.

**File:** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          500: '#1a3c7c',   // Barnes & Noble dark navy
          600: '#152e63',
          700: '#0f2146',
        },
        accent: {
          500: '#b0133a',   // Burgundy — used for CTAs and admin accents
          600: '#8c0f2e',
        },
        book: {
          card:  '#ffffff',
          hover: '#f8f9fa',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
```

**Why these colours?**
The `primary` palette (dark navy) drives navigation, buttons, and
interactive elements. The `accent` palette (burgundy) is reserved for
call-to-action download buttons and admin-panel highlights. The double-
role of "book theme meets trusted bookstore brand" is intentional.

---

## 17.5 Configure index.css

Replace the contents of `src/index.css` with the base styles and
reusable CSS component classes used throughout the project.

**File:** `src/index.css`

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
  /* Primary action button — dark navy */
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-semibold
           py-2 px-6 rounded-lg transition-colors duration-200;
  }

  /* Accent button — burgundy, used for download actions */
  .btn-accent {
    @apply bg-accent-500 hover:bg-accent-600 text-white font-semibold
           py-2 px-6 rounded-lg transition-colors duration-200;
  }

  /* Secondary / cancel button */
  .btn-secondary {
    @apply bg-white hover:bg-gray-50 text-gray-700 font-semibold
           py-2 px-6 rounded-lg border border-gray-200 transition-colors duration-200;
  }

  /* Book listing card */
  .book-card {
    @apply bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100
           transition-all duration-200 hover:border-primary-500/20 cursor-pointer;
  }

  /* Standard text input */
  .input-field {
    @apply w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm
           focus:border-primary-500 focus:outline-none
           focus:ring-2 focus:ring-primary-500/20 transition-colors;
  }
}
```

The three buttons (`.btn-primary`, `.btn-accent`, `.btn-secondary`) and
the `.input-field` class are referenced by name throughout every page.
Defining them once here means a design change — say, rounding the
corners more — requires editing one line, not dozens.

---

## 17.6 Create the folder structure

Vite's scaffold places all source code under `src/`. Create the
following sub-folders. Every subsequent chapter adds files to exactly
one of these.

```powershell
# From inside src/EBookLibrary.React/src/
mkdir api, components, hooks, i18n, layouts, pages, stores, types
mkdir pages/auth, pages/admin
mkdir i18n/locales
```

| Folder | Purpose |
|--------|---------|
| `api/` | Axios instance and one file per API domain |
| `components/` | Shared UI components (BookCard, Pagination, SearchBar) |
| `hooks/` | Custom hooks (`useBooks`, `useDebounce`) |
| `i18n/` | i18next initialisation and translation JSON files |
| `layouts/` | Shell components that wrap pages (header, sidebar, footer) |
| `pages/` | One file per route |
| `pages/auth/` | Login and Register pages |
| `pages/admin/` | Admin Dashboard, Books, Authors, Genres, Users, Upload |
| `stores/` | Zustand global stores |
| `types/` | TypeScript interfaces mirroring backend DTOs |

---

## 17.7 Environment variables

Vite exposes environment variables prefixed with `VITE_` to the
client-side bundle. Create the following two files.

**File:** `.env.development`

```
VITE_API_URL=http://localhost:5149/api
```

**File:** `.env.production`

```
VITE_API_URL=https://your-production-api.com/api
```

:::note
`.env.development` is loaded by `npm run dev` and `npm run build --mode
development`. `.env.production` is loaded by `npm run build`. Never
commit secrets to either file — the API base URL is not a secret, but
JWT signing keys and database credentials would be.
:::

The Axios client (Chapter 19) reads this variable with
`import.meta.env.VITE_API_URL`.

---

## 17.8 Update vite.config.ts

The default Vite config works but is missing the manual code-split
configuration that keeps cache busting to a minimum in production.
This is optional for development — set it now so you do not forget
later.

**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:   ['react', 'react-dom', 'react-router-dom'],
          query:   ['@tanstack/react-query'],
          axios:   ['axios'],
          zustand: ['zustand'],
        },
      },
    },
  },
});
```

`manualChunks` splits frequently-cached dependencies into separate
files. A deploy that updates only the application code does not bust
the user's cached `react` bundle.

---

## 17.9 Clean up generated files

The Vite scaffold creates `src/App.css` and fills `src/App.tsx` and
`src/main.tsx` with placeholder content. Replace them with the
minimal versions below.

**File:** `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**File:** `src/App.tsx` (temporary placeholder — replaced in Chapter 21)

```tsx
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

Delete `src/App.css` — it is no longer needed.

---

## Chapter 17 checkpoint

Open a terminal in `src/EBookLibrary.React/` and run:

```powershell
npm run dev
```

You should see:

```
  VITE v8.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in a browser. You should see the text
"EBook Library" in the Barnes & Noble dark navy, rendered in a serif
font, centred on a light grey background.

Open the browser's DevTools → Network tab. Confirm there are no
console errors.

If the text is black instead of navy, the Tailwind config has not been
picked up — confirm you installed `tailwindcss@3` and the `content`
array in `tailwind.config.js` points to `./src/**/*.{js,ts,jsx,tsx}`.

---

## Key takeaways

- Vite replaces Create React App; always use it for new projects.
- Install `tailwindcss@3` explicitly — bare `tailwindcss` resolves
  to v4, which is incompatible with this configuration.
- The `@layer components` block in `index.css` defines reusable
  class names (`btn-primary`, `input-field`, etc.) that keep the
  codebase DRY.
- Environment variables prefixed `VITE_` are the only way to pass
  configuration to the browser bundle safely.
