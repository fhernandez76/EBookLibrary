---
applyTo: "**/EBookLibrary.Blazor/**"
---

# Blazor frontend

Blazor WebAssembly (standalone). Lives in
`Automatic/EBookLibrary/src/EBookLibrary.Blazor/`.

## Stack

- .NET 10 Blazor WASM.
- **MudBlazor** component library.
- `HttpClient` configured with the API base URL from `wwwroot/appsettings.json`
  (`ApiBaseUrl`).
- Custom `AuthenticationStateProvider` reading the JWT from `localStorage`.
- `Microsoft.Extensions.Localization` for i18n; resources under `Resources/`.

## Folder layout

```
Pages/        ← @page components (route-bearing)
Layout/       ← MainLayout, NavMenu
Components/   ← reusable, parameter-driven
Services/     ← typed API services (one per aggregate) wrapping HttpClient
Models/       ← request/response records mirroring the API DTOs
Auth/         ← AuthenticationStateProvider + token storage helpers
Resources/    ← .resx for localization
```

## Conventions

- Pages stay thin: bind `@inject` services, call them in lifecycle methods,
  render via MudBlazor components.
- **Form validation** via `EditForm` + `DataAnnotationsValidator` for simple
  cases; for cross-field rules, validate in the submit handler and surface the
  error via a string field bound to a MudAlert.
- Keep API services testable: each one takes `HttpClient` in its constructor
  and returns a `(TData?, string? Error)` tuple — the standard project shape.
- Use `Result<T>` mental model: never throw across the API boundary in services;
  inspect the response, return error message in the tuple.
- Auth flow: on successful login, store JWT in `localStorage` via
  `ITokenStorage`, then call `((CustomAuthStateProvider)AuthProvider).NotifyUserAuthenticated(token)`.
- Roles: use `<AuthorizeView Roles="Admin">` for UI gating.

## Commands

```powershell
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.Blazor
```

The app is served at the URL printed by Kestrel; the API must be running
separately.

## Tests

Currently covered by the Playwright .NET E2E project with `FRONTEND=blazor`
(default). No bUnit project at this time.
