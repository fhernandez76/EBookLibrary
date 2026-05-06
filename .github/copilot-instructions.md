# EBook Library — Copilot Instructions

> **Read this file first.** It is auto-loaded into every Copilot chat session
> opened in this workspace and provides the orientation any new session needs
> to be useful immediately.

## What this repository is

A complete reference implementation of a Clean Architecture **.NET 10 Web API**
for an e-book library, plus **two interchangeable frontends** (React 19 + Vite,
Blazor WASM), a full **end-to-end test suite**, and a **30-chapter training
book** that documents the design decisions chapter by chapter.

The repository is organised as a **multi-project workspace**, not a monorepo
package manager. Each top-level folder has a distinct purpose.

## Top-level layout

| Folder       | Purpose                                                                                  |
|--------------|------------------------------------------------------------------------------------------|
| `Automatic/` | The .NET 10 solution generated/maintained with AI assistance. **The only code folder.**  |
| `Manual/`    | Reserved for a hand-written parallel implementation (comparison material). Often empty.  |
| `Training/`  | The book — 30 chapters, build scripts, generated `.docx` and `.epub` outputs.            |
| `docs/`      | Architecture diagrams (drawio, PNG, JPEG), screenshots, design notes.                    |

> **Where new code goes:** `Automatic/EBookLibrary/` (the .NET solution).
> Do not create new code files outside this tree unless explicitly asked.

## Solution structure (`Automatic/EBookLibrary/`)

```
src/
  EBookLibrary.Domain/          ← Entities, value objects, domain events. ZERO outward deps.
  EBookLibrary.Application/     ← Use cases (MediatR handlers), DTOs, validators, interfaces.
  EBookLibrary.Infrastructure/  ← EF Core, repositories, JWT, BCrypt, file storage.
  EBookLibrary.WebApi/          ← Controllers, middleware, DI composition, Program.cs.
  EBookLibrary.React/           ← Vite + React 19 + TS + Tailwind + TanStack Query + Zustand.
  EBookLibrary.Blazor/          ← Blazor WASM + MudBlazor.
tests/
  EBookLibrary.Domain.Tests/        ← Pure unit tests (xUnit + FluentAssertions).
  EBookLibrary.Application.Tests/   ← Handler tests with Moq.
  EBookLibrary.WebApi.Tests/        ← WebApplicationFactory integration tests.
  EBookLibrary.E2E.Tests/           ← Playwright for .NET, switches frontend via env var.
scripts/
  EBookLibrary.Seeder/              ← Console app: seeds books, authors, genres, admin user.
```

## The dependency rule (non-negotiable)

```
Domain  ←  Application  ←  Infrastructure
                       ←  WebApi  →  Infrastructure (composition only)
```

- Domain references **nothing**.
- Application references **only** Domain.
- Infrastructure references Application + Domain (implements interfaces).
- WebApi references Application + Infrastructure (composition root only).
- Frontends reference **nothing** in the .NET projects — they call HTTP.

If a proposed change would invert any arrow, stop and ask.

## Coding conventions (apply to every change)

### Domain
- Entities are **sealed** classes with private setters; mutate via methods.
- Use **factory methods** (`User.Create(...)`) instead of public constructors.
- Soft delete via `IsDeleted` (bool) + a global EF query filter — never hard-delete.
- Raise domain events through `AddDomainEvent(...)` on the aggregate root.

### Application
- Every use case is a sealed `IRequestHandler<TRequest, Result<T>>`.
- Return `Result<T>` (success/failure with errors) — never throw for control flow.
- Validate with **FluentValidation**; the MediatR `ValidationBehavior` runs first.
- DTOs are `record` types in `Application/.../Dtos/`.
- Map entity → DTO in the handler (no AutoMapper).

### Infrastructure
- Repositories live behind `Application` interfaces; one repo per aggregate.
- `AppDbContext` configures global query filter for soft delete.
- Migrations live in `Infrastructure/Persistence/Migrations/` — **never edit a
  committed migration**, generate a new one.
- Passwords: BCrypt cost **12** via `IPasswordHashService`.
- JWT: HS256 via `IJwtService`. Secret key from configuration only.

### WebApi
- Controllers are thin: validate route, call MediatR, wrap in `ApiResponse<T>`.
- All success responses → `ApiResponse<T>.Ok(...)`; failures → `ApiResponse.Fail(...)`.
- Roles via `[Authorize(Roles = "Admin")]`, claims via `ClaimTypes.Role`.
- Routes: `api/[controller]` (kebab-case auto-derived), versioning not yet enabled.
- Swagger/OpenAPI via Scalar at `/scalar/v1`.

### React (`EBookLibrary.React`)
- Server state: **TanStack Query** (`useQuery`, `useMutation`).
- Client state: **Zustand** stores in `src/stores/`.
- Forms: **react-hook-form** + **Zod** schemas.
- Styling: **Tailwind** utility classes; reusable components in `src/components/`.
- API client: a single `axios` instance in `src/api/client.ts` with the JWT interceptor.
- Routing: `react-router-dom` v7.
- i18n: `react-i18next`; translation keys in `src/i18n/locales/`.

### Blazor (`EBookLibrary.Blazor`)
- WASM standalone, talks to the same API.
- UI: **MudBlazor** components.
- Auth: custom `AuthenticationStateProvider` reading the JWT from localStorage.
- Pages live in `Pages/`, services in `Services/`, models in `Models/`.

### Tests
- xUnit + FluentAssertions + Moq. AAA layout (`// Arrange / Act / Assert`).
- One `[Fact]` or `[Theory]` per behaviour.
- Helpers in each test project under `TestHelpers/` (`MockFactory`, `EntityBuilders`).
- E2E tests use Playwright for .NET; switch frontend with `FRONTEND=react|blazor` env var.

## Most-used commands

```powershell
# Build everything
dotnet build Automatic/EBookLibrary/EBookLibrary.sln

# Run all unit/integration tests
dotnet test Automatic/EBookLibrary/EBookLibrary.sln

# Run the API
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.WebApi

# Run the React frontend
cd Automatic/EBookLibrary/src/EBookLibrary.React; npm install; npm run dev

# Run the Blazor frontend
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.Blazor

# Apply EF Core migrations
dotnet ef database update --project Automatic/EBookLibrary/src/EBookLibrary.Infrastructure --startup-project Automatic/EBookLibrary/src/EBookLibrary.WebApi

# Run E2E tests against React
$env:FRONTEND="react"; dotnet test Automatic/EBookLibrary/tests/EBookLibrary.E2E.Tests
```

## Configuration secrets — important

- `Automatic/EBookLibrary/src/EBookLibrary.WebApi/appsettings.json` ships with
  the placeholder JWT secret `REPLACE_WITH_64_CHARACTER_MINIMUM_SECRET_KEY_IN_PRODUCTION`.
  Override it via **user secrets**, environment variable
  (`JwtSettings__SecretKey`), or `appsettings.Production.json` — never commit
  a real secret.
- `appsettings.Development.json` and `secrets.json` are git-ignored at the
  repo root.
- React `.env.local` and `.env.*.local` are git-ignored. Keep production
  endpoints in `.env.production` only when they are non-secret URLs.

## Where to look for more detail

- **Scoped guidelines:** `.github/instructions/*.instructions.md` are auto-attached
  to files matching their `applyTo:` glob (e.g. opening any file under
  `EBookLibrary.Domain/` activates `domain.instructions.md`).
- **Architecture diagrams:** `docs/architecture/diagrams/` (drawio + rendered PNG/JPEG).
- **Training book:** `Training/book/manuscript/` has 30 chapter MD files; built
  output is in `Training/book/dist/`.
- **Postman collection:** `docs/EBookLibrary-API.postman_collection.json`.
- **API testing guide:** `docs/12-API-TESTING-GUIDE.md`.
- **Production checklist:** see `Training/book/manuscript/15-*.md` (Chapter 15)
  and `.github/instructions/security.instructions.md`.

## When in doubt

1. Check the relevant `.github/instructions/*.instructions.md`.
2. Read the matching chapter in `Training/book/manuscript/`.
3. Look at an existing handler / controller / page for the established pattern
   and **mirror it** — consistency beats novelty in this codebase.
