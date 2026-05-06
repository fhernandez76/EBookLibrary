# 📚 EBook Library

> **A complete, production-grade reference implementation of a Clean Architecture .NET 10 Web API — with two interchangeable frontends, full automated test pyramid, and a 30-chapter training book that teaches every decision.**

[![.NET](https://img.shields.io/badge/.NET-10-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Blazor](https://img.shields.io/badge/Blazor-WASM-512BD4)](https://learn.microsoft.com/aspnet/core/blazor/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests: xUnit + Playwright](https://img.shields.io/badge/tests-xUnit%20%2B%20Playwright-success)](#-testing)

---

## ✨ What this is

A teaching repository that ships a **realistic** end-to-end application — not
a demo with three endpoints. It includes:

- A **Clean Architecture** ASP.NET Core 10 Web API (Domain → Application → Infrastructure → WebApi).
- **Two frontends** that hit the same API: a modern **React 19 + Vite + TypeScript** SPA and a **Blazor WebAssembly** app with MudBlazor.
- A **four-tier test pyramid**: domain unit tests, application handler tests, WebApi integration tests, and Playwright end-to-end tests that can target either frontend.
- A **30-chapter training book** (`Training/book/`) that walks through the design chapter by chapter and ships as `.docx` and `.epub`.
- **Architecture diagrams** in drawio (with rendered PNG/JPEG) covering C4 model levels 1–4, sequence diagrams, ER, and UI wireframes.
- An **AI-assisted development** track: every layer documents the conventions a Copilot session needs to be productive immediately (see [.github/copilot-instructions.md](.github/copilot-instructions.md)).

> **Why two frontends?** To prove that a properly designed API truly is
> framework-agnostic — and to give learners a side-by-side comparison of
> idiomatic React vs. idiomatic Blazor against the same backend.

---

## 📸 Screenshots

Sample screenshots of the React and Blazor frontends live under
[docs/screenshoots/](docs/screenshoots/) (note: the folder name is preserved
intentionally for compatibility with existing references).

---

## 🚀 Quick start

### Prerequisites

| Tool                 | Version                                         |
|----------------------|-------------------------------------------------|
| .NET SDK             | **10.0** (preview/RTM)                          |
| Node.js              | **20+** (for the React frontend & book build)   |
| SQL Server           | LocalDB, Express, or full instance              |
| Pandoc *(optional)*  | for rebuilding the training book                |

### PowerShell (Windows)

```powershell
git clone https://github.com/fhernandez76/EBookLibrary.git
cd <YOUR-REPO>

# 1. Restore + build the .NET solution
dotnet build Automatic/EBookLibrary/EBookLibrary.sln

# 2. Apply EF Core migrations to your local SQL Server
dotnet ef database update `
  --project Automatic/EBookLibrary/src/EBookLibrary.Infrastructure `
  --startup-project Automatic/EBookLibrary/src/EBookLibrary.WebApi

# 3. Run the API (http://localhost:5149)
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.WebApi

# 4. In a second terminal — run a frontend (pick one)
# React (http://localhost:5173)
cd Automatic/EBookLibrary/src/EBookLibrary.React
npm install
npm run dev

# OR Blazor
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.Blazor
```

### Bash (Linux / macOS)

```bash
git clone https://github.com/fhernandez76/EBookLibrary.git
cd <YOUR-REPO>

dotnet build Automatic/EBookLibrary/EBookLibrary.sln
dotnet ef database update \
  --project Automatic/EBookLibrary/src/EBookLibrary.Infrastructure \
  --startup-project Automatic/EBookLibrary/src/EBookLibrary.WebApi
dotnet run --project Automatic/EBookLibrary/src/EBookLibrary.WebApi &

cd Automatic/EBookLibrary/src/EBookLibrary.React
npm install
npm run dev
```

Open <http://localhost:5173> (React) or the Blazor URL printed by Kestrel.
The API exposes Scalar OpenAPI UI at <http://localhost:5149/scalar/v1>.

> **Default admin credentials seeded by `DataSeeder`:** see
> [docs/12-API-TESTING-GUIDE.md](docs/12-API-TESTING-GUIDE.md). Change them
> immediately for any non-dev deployment.

---

## 🗂️ Repository tour

| Folder       | Contents                                                                                                                             |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `Automatic/` | The .NET 10 solution (`EBookLibrary.sln`) — Domain, Application, Infrastructure, WebApi, React, Blazor, four test projects, seeder.  |
| `Manual/`    | Reserved for an alternate, hand-written implementation of the same spec. Often empty — comparison material.                          |
| `Training/`  | The 30-chapter book (`book/`) plus the legacy single-file training guide.                                                            |
| `docs/`      | Architecture diagrams (`architecture/diagrams/*.drawio` + rendered images), Postman collection, screenshots, ad-hoc design notes.    |
| `.github/`   | `copilot-instructions.md` (auto-loaded into every Copilot session) and `instructions/*.instructions.md` (scoped guidelines).         |

---

## 🏛️ Architecture at a glance

```
        ┌─────────────────────────┐
        │      Frontends          │
        │  React 19  │  Blazor    │
        └──────┬─────┴──────┬─────┘
               │  HTTPS/JSON │
        ┌──────▼─────────────▼─────┐
        │   ASP.NET Core 10 API    │  ← Controllers, ApiResponse<T>, JWT auth
        │   EBookLibrary.WebApi    │
        └──────┬───────────────────┘
               │ MediatR
        ┌──────▼───────────────────┐
        │   Application layer      │  ← Use cases (handlers), DTOs, validators
        │   (depends on Domain)    │
        └──────┬───────────────────┘
               │ interfaces
        ┌──────▼───────────────────┐         ┌────────────────────┐
        │   Infrastructure layer   │ ◄─────► │   SQL Server       │
        │   EF Core, JWT, BCrypt   │         │   (Code-First EF)  │
        └──────┬───────────────────┘         └────────────────────┘
               │
        ┌──────▼───────────────────┐
        │   Domain layer           │  ← Entities, value objects, domain events
        │   (zero dependencies)    │
        └──────────────────────────┘
```

**The dependency rule is non-negotiable**: arrows point inward toward Domain,
which depends on nothing. See full diagrams under
[docs/architecture/diagrams/](docs/architecture/diagrams/) (C4 levels 1–4,
sequence, ER, UI).

---

## 🧰 Tech stack

### Backend

| Concern             | Choice                                     |
|---------------------|--------------------------------------------|
| Framework           | ASP.NET Core 10                            |
| Mediator            | MediatR                                    |
| Validation          | FluentValidation                           |
| ORM                 | EF Core 10 (SQL Server)                    |
| Auth                | JWT (HS256) + BCrypt (work factor 12)      |
| OpenAPI UI          | Scalar (`/scalar/v1`)                      |
| DI composition      | `Program.cs` + `AddInfrastructure(...)`    |

### Frontends

| Concern         | React                              | Blazor                  |
|-----------------|------------------------------------|-------------------------|
| Build           | Vite                               | dotnet WASM             |
| UI              | Tailwind CSS                       | MudBlazor               |
| Server state    | TanStack Query v5                  | Typed `HttpClient` services |
| Client state    | Zustand                            | Component state + DI    |
| Forms           | react-hook-form + Zod              | `EditForm` + DataAnnotations |
| Routing         | react-router-dom v7                | Built-in `@page`        |
| i18n            | react-i18next                      | `IStringLocalizer`      |

### Testing

| Layer       | Stack                                         |
|-------------|-----------------------------------------------|
| Unit        | xUnit + FluentAssertions + Moq                |
| Integration | xUnit + `WebApplicationFactory<Program>`      |
| End-to-end  | Playwright for .NET (frontend chosen via env) |

---

## 📖 Documentation map

| Where                                                          | What                                                                |
|----------------------------------------------------------------|---------------------------------------------------------------------|
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Project orientation auto-loaded into every Copilot session.      |
| [`.github/instructions/`](.github/instructions/)               | Per-area conventions (auto-attached by `applyTo:` glob).            |
| [`Training/book/manuscript/`](Training/book/manuscript/)       | The 30-chapter training book — read these in order to learn the design. |
| [`Training/book/dist/`](Training/book/dist/)                   | Pre-built `.docx` and `.epub` of the training book.                 |
| [`docs/00-STEP-BY-STEP-GUIDE.md`](docs/00-STEP-BY-STEP-GUIDE.md) | Original walkthrough (legacy, but useful for setup).             |
| [`docs/architecture/`](docs/architecture/)                     | Drawio sources + rendered diagrams (C4, sequence, ER, UI).          |
| [`docs/EBookLibrary-API.postman_collection.json`](docs/EBookLibrary-API.postman_collection.json) | Postman collection for the full API.                |
| [`docs/12-API-TESTING-GUIDE.md`](docs/12-API-TESTING-GUIDE.md) | API testing recipes & seeded test users.                           |

---

## ✅ Testing

```powershell
# All unit + integration tests
dotnet test Automatic/EBookLibrary/EBookLibrary.sln

# A single project
dotnet test Automatic/EBookLibrary/tests/EBookLibrary.Application.Tests

# End-to-end against React
$env:FRONTEND="react"
dotnet test Automatic/EBookLibrary/tests/EBookLibrary.E2E.Tests

# End-to-end against Blazor (default)
$env:FRONTEND="blazor"
dotnet test Automatic/EBookLibrary/tests/EBookLibrary.E2E.Tests
```

E2E tests require the API **and** the chosen frontend to already be running.
They do not start them automatically.

---

## 🤖 AI-assisted development

This repository is structured so that any GitHub Copilot session — on any
machine, in any clone — gets the same orientation:

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) is
  auto-loaded into every chat.
- [`.github/instructions/*.instructions.md`](.github/instructions/) attach
  themselves to relevant files via `applyTo:` globs (e.g. opening anything in
  `EBookLibrary.Domain/` activates the domain rules).
- Conventions, dependency rules, and "where to put new code" are documented
  once and referenced everywhere.

If you fork or clone this into a new location, **no extra setup is needed**
for Copilot to be useful — just open the workspace.

---

## 🛣️ Roadmap

- [ ] GitHub Actions CI workflow (build + test on push, lint + typecheck for React).
- [ ] Refresh-token endpoint + rotation in JWT auth.
- [ ] Docker Compose for API + SQL Server + (optional) frontend.
- [ ] Bookmark / reading-progress feature across frontends.
- [ ] Localization parity between React and Blazor.
- [ ] Manual implementation in `Manual/` (planned comparison artefact).

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching, commit conventions, and
PR gates. By participating you agree to the
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE)
file for the full text.

---

## 🙏 Acknowledgements

- The Clean Architecture community — Robert C. Martin, Jason Taylor's template,
  and countless conference talks.
- The MediatR, FluentValidation, EF Core, MudBlazor, TanStack Query, and
  Zustand maintainers.
- Pandoc, for making it pleasant to author a real book in plain Markdown.
