# EBook Library — Project Context & Conversation Reference

> **Saved:** March 30, 2026  
> **Purpose:** Full project context for continuing work in new GitHub Copilot / Claude sessions.  
> **Working directory:** `c:\Copilot CLI\EBook Web Api Project\`  
> **Output folder for AI-generated MD files:** `Automatic\`

---

## 1. Project Overview

### Goal
Build a personal eBook web application to **learn the newest Microsoft technology stack** (.NET 10, ASP.NET Core APIs, C#).

### Application Purpose
- Users subscribe, sign in, search for eBooks (ePub format), and download them
- ~51,599 deduplicated books in Spanish across 128 normalized genres (source data in two HTML files)

### Training Strategy
1. **Manual build** — implement step-by-step from the guide documents
2. **Automatic build** — re-build using GitHub Copilot + Claude Sonnet 4.6 for comparison
3. Compare quality, speed, and correctness between both approaches

---

## 2. Technical Stack

| Layer | Technology |
|-------|------------|
| Architecture | Clean Architecture + CQRS |
| ORM | Entity Framework Core 10 (DB-agnostic) |
| Backend | ASP.NET Core 10 Web API — controller-based (NOT Minimal APIs) |
| Language | C# 14 / .NET 10 |
| Auth | JWT Bearer (email + password) |
| Validation | FluentValidation |
| Mapping | AutoMapper |
| Mediator | MediatR 12 |
| Database (primary) | MS SQL Server 2022 |
| Database (future) | PostgreSQL |
| Primary Frontend | React 18 + TypeScript (Vite) |
| Secondary Frontend | Blazor WebAssembly |
| Testing | xUnit |
| API Docs | Scalar (built-in ASP.NET Core OpenAPI) |
| Localization | Spanish + English (bilingual) |
| File Storage | Local file system (DB stores paths, not binaries) |

---

## 3. Architecture

```
EBookLibrary/
├── src/
│   ├── EBookLibrary.Domain          ← Pure domain, NO external NuGet deps
│   ├── EBookLibrary.Application     ← CQRS handlers, validators, DTOs
│   ├── EBookLibrary.Infrastructure  ← EF Core, repositories, JWT, bcrypt
│   ├── EBookLibrary.WebApi          ← Controllers, middleware, Program.cs
│   ├── EBookLibrary.Blazor          ← Blazor WebAssembly frontend
│   └── EBookLibrary.React/          ← Vite + React 18 + TypeScript
├── tests/
│   ├── EBookLibrary.Domain.Tests
│   ├── EBookLibrary.Application.Tests
│   └── EBookLibrary.WebApi.Tests
└── EBookLibrary.sln
```

### Dependency Graph
```
Domain ← Application ← Infrastructure
                     ← WebApi → Infrastructure (DI registration)
```

---

## 4. Domain Entities

```csharp
User           : Id, Email, PasswordHash, Role, CreatedAt, IsActive
Book           : Id, Title, AuthorId, GenreId, Pages, FilePath, Format, Language, Year, CreatedAt
Author         : Id, Name, Biography
Genre          : Id, Name, Description
UserBookRequest: Id, UserId, BookId, RequestedAt, Status
```

### User Roles
- `RegularUser` — can search & download books
- `AdminUser` — can manage all catalogs

---

## 5. Use Cases

| # | Use Case | Role |
|---|----------|------|
| 1 | Register (signup with email + password) | Anonymous |
| 2 | Login → returns JWT token | Anonymous |
| 3 | Search eBooks (by Author, Title, Year, Genre) | RegularUser |
| 4 | Download ePub file | RegularUser |
| 5 | CRUD Books, Authors, Genres | AdminUser |
| 6 | Manage Users (roles, activation) | AdminUser |
| 7 | Upload ePub file + set metadata | AdminUser |

---

## 6. Source Data Files

Located at `c:\Copilot CLI\EBook Web Api Project\` (root) and `docs\`:

| File | Description |
|------|-------------|
| `lista_generos.html` | ~50,220 source entries grouped by genre; used for genre relationships in the two-pass seeder |
| `lista_autor.html` | Authoritative source — ~51,599 deduplicated books sorted alphabetically by author; used in Pass 1 of the seeder |
| `lista_titulo.html` | Same books sorted alphabetically by title (reference only) |

**Format per entry:** `[entry#] | [pages] | [author] | [title]`

**Top genres by count:**
- Novela: 10,415
- Romántico: 8,397
- Ciencia ficción: 5,405
- Intriga: 4,611
- Aventuras: 4,505
- Fantástico: 3,510

---

## 7. Document Files (docs\ folder)

All reference docs are in `c:\Copilot CLI\EBook Web Api Project\docs\`:

| File | Purpose |
|------|---------|
| `00-STEP-BY-STEP-GUIDE.md/.docx` | Master project guide |
| `01-SOLUTION-SETUP.md/.docx` | Solution scaffolding (CLI + NuGet) |
| `02-DOMAIN-LAYER.md/.docx` | Domain entities, value objects, enums |
| `03-APPLICATION-LAYER.md/.docx` | CQRS commands, queries, validators, DTOs |
| `04-INFRASTRUCTURE-LAYER.md/.docx` | EF Core, repositories, services |
| `05-API-LAYER.md/.docx` | Controllers, middleware, filters |
| `06-AUTHENTICATION.md/.docx` | JWT setup and auth flow |
| `07-DATABASE-MIGRATIONS.md/.docx` | EF Core migrations + two-pass data seeding |
| `08-REACT-FRONTEND.md/.docx` | React 18 + TypeScript frontend |
| `09-BLAZOR-FRONTEND.md/.docx` | Blazor WebAssembly frontend |
| `10-UNIT-TESTS.md/.docx` | xUnit tests for application and API layers |
| `11-DEBUG-GUIDE.md/.docx` | Debug setup for API, React, and Blazor |
| `12-API-TESTING-GUIDE.md/.docx` | Full endpoint reference + Scalar UI testing guide |

---

## 8. Key Configuration

### appsettings.json (WebApi)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
  },
  "JwtSettings": {
    "SecretKey": "REPLACE_WITH_64_CHARACTER_MINIMUM_SECRET_KEY_IN_PRODUCTION",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpiryInMinutes": 60
  },
  "FileStorageSettings": {
    "BasePath": "C:\\EBookLibrary\\Books",
    "AllowedExtensions": [".epub"]
  },
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://localhost:7001"
  ]
}
```

---

## 9. Component Order for AI-Assisted Building

Use each MD file in `docs\` as a standalone prompt for a new GitHub Copilot session:

1. `01-SOLUTION-SETUP.md` — scaffold solution, projects, NuGet packages
2. `02-DOMAIN-LAYER.md` — entities, value objects, enums, interfaces
3. `03-APPLICATION-LAYER.md` — CQRS, MediatR handlers, FluentValidation, AutoMapper
4. `04-INFRASTRUCTURE-LAYER.md` — EF Core DbContext, repositories, JWT/bcrypt services
5. `05-API-LAYER.md` — controllers, middleware, Program.cs
6. `06-AUTHENTICATION.md` — register/login flow, JWT token generation/validation
7. `07-DATABASE-MIGRATIONS.md` — EF migrations, seed data from HTML files
8. `08-REACT-FRONTEND.md` — React app with Tailwind, React Query, Zustand, i18n
9. `09-BLAZOR-FRONTEND.md` — Blazor WASM frontend
10. `10-UNIT-TESTS.md` — xUnit tests for application and API layers

---

## 10. Folder Convention

| Folder | Purpose |
|--------|---------|
| `docs\` | Master reference documents (MD + DOCX) |
| `Automatic\` | Output from AI-assisted (Copilot) sessions |
| `Manual\` | Output from manual implementation sessions |

> **Rule:** Any MD file generated by GitHub Copilot / Claude goes into `Automatic\`

---

## 11. UI Reference

Style inspired by **Barnes & Noble** or **Alibris** book catalog UI.

- Paginated search results
- Filter panel: Genre, Author, Year, Language
- Book detail page with download button
- Admin dashboard for catalog management

---

*Last updated: March 30, 2026*
