---
applyTo: "**/EBookLibrary.React/**"
---

# React frontend

Vite + React 19 + TypeScript + Tailwind. Lives in
`Automatic/EBookLibrary/src/EBookLibrary.React/`.

## Stack

| Concern        | Library                                        |
|----------------|------------------------------------------------|
| Build          | Vite                                           |
| Server state   | `@tanstack/react-query` v5                     |
| Client state   | `zustand`                                      |
| Forms          | `react-hook-form` + `zod`                      |
| HTTP           | `axios` (single instance with JWT interceptor) |
| Routing        | `react-router-dom` v7                          |
| Styling        | Tailwind CSS utility classes                   |
| i18n           | `react-i18next`                                |
| Notifications  | `react-hot-toast` (or whatever is in package.json — confirm before adding) |

## Folder layout

```
src/
  api/            ← axios client, endpoint functions returning typed promises
  components/     ← presentational, reusable
  pages/          ← route-level components
  stores/         ← zustand stores (auth, ui, ...)
  hooks/          ← custom hooks, including TanStack Query wrappers
  types/api.ts    ← TS interfaces mirroring the API DTOs
  i18n/           ← i18next config + locale JSON
  utils/
```

## Conventions

- One `axios` instance in `src/api/client.ts`. The interceptor reads the JWT
  from the auth Zustand store, attaches `Authorization: Bearer ...`, and on
  401 clears the store and redirects to `/login`.
- API calls return typed `Promise<T>` based on `types/api.ts`. **Mirror the
  `ApiResponse<T>` envelope** — unwrap `data` inside the api function so
  components see the payload directly.
- Use TanStack Query for **all** server reads/writes:
  - `useQuery({ queryKey: ['books', id], ... })`
  - `useMutation({ ... onSuccess: () => qc.invalidateQueries(...) })`
- Forms: define a Zod schema, infer the TS type, use `useForm({ resolver: zodResolver(schema) })`.
- No `any`. If forced, leave `// TODO: tighten type` and explain why.
- Tailwind first; only drop into a CSS file for animations or third-party overrides.
- Env: read via `import.meta.env.VITE_*`. Never hard-code a URL.

## Commands

```powershell
npm install        # first run
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle
npm run lint
```

## Tests

The React app currently has no in-process unit tests; UI flows are covered by
the Playwright .NET E2E project (`EBookLibrary.E2E.Tests`) running with
`FRONTEND=react`.
