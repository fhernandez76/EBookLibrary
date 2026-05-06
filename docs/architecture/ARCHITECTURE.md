# EBook Library — Architecture Documentation

> **Project:** EBook Library (.NET 10 + Blazor WASM + React)
> **Architecture Style:** Clean Architecture / Domain-Driven Design
> **Generated:** 2026-03-30
> **Note:** The Word version of this document (ARCHITECTURE.docx) contains all diagrams embedded as images.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [C4 Architecture Diagrams](#3-c4-architecture-diagrams)
   - 3.1 [Level 1 — System Context](#31-level-1--system-context)
   - 3.2 [Level 2 — Container Diagram](#32-level-2--container-diagram)
   - 3.3 [Level 3 — Component Diagram (Web API)](#33-level-3--component-diagram-web-api)
   - 3.4 [Level 4 — Code / Domain Layer](#34-level-4--code--domain-layer)
4. [Architecture Layer Diagrams](#4-architecture-layer-diagrams)
   - 4.1 [Clean Architecture Layers](#41-clean-architecture-layers)
   - 4.2 [Dependency Flow](#42-dependency-flow)
5. [Sequence Diagrams](#5-sequence-diagrams)
   - 5.1 [User Registration](#51-user-registration)
   - 5.2 [Book Search](#52-book-search)
   - 5.3 [Book Download](#53-book-download)
   - 5.4 [Admin Create Book](#54-admin-create-book)
   - 5.5 [API Request Pipeline](#55-api-request-pipeline)
6. [Database Diagrams](#6-database-diagrams)
   - 6.1 [Entity Relationship Diagram](#61-entity-relationship-diagram)
   - 6.2 [Table Details](#62-table-details)
7. [UI Mockups](#7-ui-mockups)
   - 7.1 [Home Page — Book Catalog](#71-home-page--book-catalog)
   - 7.2 [Login / Register Pages](#72-login--register-pages)
   - 7.3 [Admin Dashboard](#73-admin-dashboard)
   - 7.4 [Book Detail Page](#74-book-detail-page)
8. [Technology Stack](#8-technology-stack)
9. [Key Design Decisions](#9-key-design-decisions)
10. [Security Architecture](#10-security-architecture)

---

## 1. System Overview

EBook Library is a full-stack web application that provides:

- A **REST API** (ASP.NET Core 10) for catalog management and authenticated ebook downloads
- A **Blazor WebAssembly SPA** and a **React + TypeScript SPA** as alternative frontends
- **JWT-secured** access with role-based authorization (Regular / Admin)
- **Clean Architecture** enforcement with strict inward dependency rules

### Projects

| Project | Type | Purpose |
|---|---|---|
| `EBookLibrary.Domain` | Class Library | Entities, Enums, Value Objects, Repository Interfaces |
| `EBookLibrary.Application` | Class Library | CQRS handlers (MediatR), Validators, AutoMapper, DTOs |
| `EBookLibrary.Infrastructure` | Class Library | EF Core, SQL Server, BCrypt, JWT, FileStorage |
| `EBookLibrary.WebApi` | ASP.NET Core API | REST endpoints, Middleware, OpenAPI (Scalar) |
| `EBookLibrary.Blazor` | Blazor WASM | SPA frontend |
| `EBookLibrary.React` | Vite + React + TypeScript | Alternative SPA frontend |
| `EBookLibrary.Application.Tests` | xUnit | Application layer unit tests |
| `EBookLibrary.Domain.Tests` | xUnit | Domain layer unit tests |
| `EBookLibrary.WebApi.Tests` | xUnit + WebApplicationFactory | Integration tests |

---

## 2. Architecture Principles

### Clean Architecture (Robert C. Martin)

The solution follows the **Dependency Rule**: source code dependencies point only inward. Inner layers have no knowledge of outer layers.

```
Presentation  ──→  Application  ──→  Domain
                      ↑
Infrastructure  ──────┘
```

**Dependency Inversion:** Infrastructure implements interfaces defined in the Domain layer. This means the Web API and Blazor/React apps can be replaced without changing Domain or Application logic.

### CQRS (Command Query Responsibility Segregation)

- **Commands** (write): `RegisterUserCommand`, `CreateBookCommand`, `DownloadBookCommand`, …
- **Queries** (read): `SearchBooksQuery`, `GetBookByIdQuery`, `GetCurrentUserQuery`, …
- MediatR dispatches all commands and queries through a pipeline:
  - `LoggingBehavior` — logs every request name before/after execution
  - `ValidationBehavior` — runs FluentValidation; throws `ApplicationValidationException` on failures

### Soft Delete

All primary entities (`Book`, `Author`, `Genre`, `User`) implement soft delete via `BaseEntity.IsDeleted`. EF Core **global query filters** (`WHERE IsDeleted = 0`) are applied automatically so deleted records are invisible to all queries.

---

## 3. C4 Architecture Diagrams

> Diagrams in this section follow the **C4 Model** (Simon Brown).
> Draw.io source files: `diagrams/01–04-*.drawio`

### 3.1 Level 1 — System Context

*See diagram: `images/01-c4-system-context.jpg`*

The EBook Library System sits at the center. Two types of users interact with it:

| Actor | Role | Actions |
|---|---|---|
| **Regular User** | Person | Browse catalog, search by title/author/genre, download .epub files (requires login) |
| **Admin User** | Person | Manage books (CRUD), authors, genres, users; upload .epub files |

The system communicates with two external dependencies:

- **SQL Server 2022** — relational database for all application data
- **Local File System** — stores `.epub` files organized as `{BasePath}/books/{genre}/{title}.epub`

### 3.2 Level 2 — Container Diagram

*See diagram: `images/02-c4-container.jpg`*

Inside the system boundary, there are four containers:

| Container | Technology | Description |
|---|---|---|
| **Blazor WASM SPA** | Blazor WebAssembly (.NET 10) | Primary SPA — served from ASP.NET Core static files |
| **React SPA** | React 18 + TypeScript + Vite | Alternative SPA — Tailwind CSS |
| **Web API** | ASP.NET Core 10 | REST API, MediatR CQRS, JWT auth, OpenAPI + Scalar |
| **AppDbContext** | Entity Framework Core 10 | Code-First DbContext, 7 tables, migrations |

Both SPAs communicate with the Web API over HTTPS using JWT Bearer tokens. The Web API communicates with SQL Server over TCP via EF Core, and reads/writes `.epub` files via the local file system.

### 3.3 Level 3 — Component Diagram (Web API)

*See diagram: `images/03-c4-component-api.jpg`*

The Web API container is decomposed into four areas of components:

**Middleware Pipeline (ordered):**
1. `ExceptionHandlingMiddleware` — catches all exceptions, maps to HTTP status codes
2. Security Headers — `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`
3. HTTPS Redirection
4. CORS — `AllowFrontends` policy (origins from config)
5. Rate Limiter — fixed window, 10 req/min on auth endpoints
6. Authentication — JWT Bearer validation
7. Authorization — `[Authorize]` / `[Authorize(Roles="Admin")]`

**Controllers:** `AuthController`, `BooksController`, `AuthorsController`, `GenresController`, `UsersController`, `FilesController`

**Application Layer:** MediatR `ISender` dispatcher → `LoggingBehavior` → `ValidationBehavior` → CQRS Handlers

**Infrastructure:** `UnitOfWork`, all Repositories, `JwtTokenService`, `PasswordHashService`, `FileStorageService`, `CurrentUserService`

### 3.4 Level 4 — Code / Domain Layer

*See diagram: `images/04-c4-code-domain.jpg`*

The Domain layer contains all business entities and their relationships:

#### Entities

| Entity | Key Properties | Relationships |
|---|---|---|
| `Book` | Title, Pages, Language, Status, FilePath, IsDeleted | N–N → Authors (via BookAuthor), N–N → Genres (via BookGenre), 1–N → Downloads |
| `User` | Email (unique), PasswordHash, Role, IsActive | 1–N → BookDownloads |
| `Author` | Name, Biography | N–N → Books |
| `Genre` | Name (unique), Description | N–N → Books |
| `BookAuthor` | BookId (PK+FK), AuthorId (PK+FK), IsPrimary | Join table |
| `BookGenre` | BookId (PK+FK), GenreId (PK+FK) | Join table |
| `BookDownload` | UserId (FK), BookId (FK), DownloadedAt, IpAddress | Audit log |

#### Value Objects

- `Email` — immutable, validates format (must contain `@` and `.`), stores lowercase

#### Enums

- `UserRole`: `Regular = 1`, `Admin = 2`
- `BookLanguage`: `Spanish = 1`, `English = 2`, `Other = 3`
- `BookStatus`: `Available = 1`, `Unavailable = 2`, `Removed = 3`

---

## 4. Architecture Layer Diagrams

### 4.1 Clean Architecture Layers

*See diagram: `images/05-clean-architecture-layers.jpg`*

```
┌──────────────────────────────────────────────────────┐
│  Presentation Layer   (WebApi · Blazor · React)       │  ← depends on Application
│  ┌────────────────────────────────────────────────┐  │
│  │  Infrastructure Layer  (EF Core · JWT · FS)    │  │  ← implements Domain interfaces
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Application Layer  (CQRS · Validators)  │  │  │  ← depends on Domain
│  │  │  ┌────────────────────────────────────┐  │  │  │
│  │  │  │  Domain Layer  (Entities · Rules)  │  │  │  │  ← no dependencies
│  │  │  └────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 4.2 Dependency Flow

*See diagram: `images/06-dependency-flow.jpg`*

```
WebApi ──→ Application ──→ Domain ←── Infrastructure
```

Key point: **Infrastructure depends on Application** (to implement its interfaces), not the other way around. This is Dependency Inversion — `IUnitOfWork`, `IBookRepository`, `IJwtTokenService`, etc. are all defined in the inner layers and implemented in Infrastructure.

---

## 5. Sequence Diagrams

### 5.1 User Registration

*See diagram: `images/07-seq-user-registration.jpg`*

**Flow:** `Client → AuthController → MediatR → ValidationBehavior → RegisterUserCommandHandler → UserRepository → PasswordHashService → JwtTokenService → DB`

Key steps:
1. `ValidationBehavior` validates email format, password strength (min 8, uppercase, lowercase, digit, special char), password confirmation match
2. `UserRepository.EmailExistsAsync(email)` — throws `ApplicationValidationException` if duplicate
3. `PasswordHashService.HashPassword(password)` — BCrypt, work factor 12
4. `User.Create(email, hash)` — domain factory method, normalizes email to lowercase
5. `JwtTokenService.GenerateToken(userId, email, "Regular")` — HMAC-SHA256, 60-minute expiry
6. Returns `201 Created` with `ApiResponse<AuthResponseDto>` containing the JWT

### 5.2 Book Search

*See diagram: `images/08-seq-book-search.jpg`*

**Endpoint:** `GET /api/books/search?title=&authorName=&genreName=&year=&pageNumber=1&pageSize=20`

No authentication required. `SearchBooksQueryHandler` calls `IBookRepository.SearchAsync()` which builds a dynamic LINQ query with optional `WHERE` clauses on title (contains), author name (contains), genre name (contains), and publication year. Results are ordered by title and paginated with `Skip/Take`. AutoMapper maps `Book` → `BookSummaryDto`.

Returns `PagedResult<BookSummaryDto>` with `TotalCount`, `TotalPages`, `HasNextPage`, `HasPreviousPage`.

### 5.3 Book Download

*See diagram: `images/09-seq-book-download.jpg`*

**Endpoint:** `GET /api/books/{id}/download` — requires authentication (`[Authorize]`)

Key steps:
1. JWT Bearer authentication middleware validates token; sets `ClaimsPrincipal` on `HttpContext`
2. `CurrentUserService` reads `sub` claim to get `UserId`
3. `BookRepository.GetByIdAsync(id)` — `NotFoundException` if not found
4. Checks `book.HasFile` — `NotFoundException` if no epub uploaded yet
5. `BookDownload.Create(userId, bookId, ipAddress)` — audit log entry persisted
6. `FileStorageService.GetAbsolutePath(book.FilePath)` — converts relative to absolute path
7. Controller returns `PhysicalFile(path, "application/epub+zip")` — streaming file response

### 5.4 Admin Create Book

*See diagram: `images/10-seq-admin-create-book.jpg`*

**Endpoint:** `POST /api/books` — requires `[Authorize(Roles="Admin")]`

Key steps:
1. Authorization middleware checks `role` claim = `"Admin"` — `403 Forbidden` if not Admin
2. `ValidationBehavior` validates title (required, max 500), pages (≥ 0), language (valid enum), authorIds (not empty)
3. For each `authorId` in request: `AuthorRepository.GetByIdAsync()` — throws `NotFoundException` if not found
4. For each `genreId` in request: `GenreRepository.GetByIdAsync()`
5. `Book.Create(title, pages, language)` — sets initial `Status = Unavailable`
6. `book.BookAuthors.Add(new BookAuthor { IsPrimary = true })` for first author
7. `UnitOfWork.SaveChangesAsync()` — single DB transaction
8. Returns `201 Created` with the new `Guid` book ID

### 5.5 API Request Pipeline

*See diagram: `images/11-seq-api-pipeline.jpg`*

Full middleware traversal for any API request. Security headers are added on both the inbound and outbound passes. JWT validation happens before authorization role checks. Any exception anywhere in the pipeline is caught by `ExceptionHandlingMiddleware` and mapped to a structured `ApiResponse` with the appropriate HTTP status.

---

## 6. Database Diagrams

### 6.1 Entity Relationship Diagram

*See diagram: `images/12-db-er-diagram.jpg`*

**7 Tables:**

```
Books ──< BookAuthors >── Authors
Books ──< BookGenres  >── Genres
Books ──< BookDownloads
Users ──< BookDownloads
```

| Relationship | Type | Delete Rule |
|---|---|---|
| Books → BookAuthors | 1 : N (FK BookId) | CASCADE |
| Authors → BookAuthors | 1 : N (FK AuthorId) | RESTRICT |
| Books → BookGenres | 1 : N (FK BookId) | CASCADE |
| Genres → BookGenres | 1 : N (FK GenreId) | RESTRICT |
| Books → BookDownloads | 1 : N (FK BookId) | RESTRICT |
| Users → BookDownloads | 1 : N (FK UserId) | RESTRICT |

### 6.2 Table Details

*See diagram: `images/13-db-table-details.jpg`*

**Migration:** `20260330192513_InitialCreate` (SQL Server, code-first)

Key schema decisions:
- All PKs are `uniqueidentifier` (GUID) — conflict-free distributed generation
- Enum columns stored as `nvarchar(20)` strings (not integer codes) — human-readable in raw SQL
- `Isbn` has a **filtered unique index** (`WHERE Isbn IS NOT NULL`) to allow multiple null ISBNs
- `Genre.Name` and `User.Email` have **unique indexes** enforced at the database level
- All base-entity tables have `IsDeleted bit DEFAULT 0` columns with global EF query filters
- `BookDownloads.IpAddress` is `nvarchar(45)` to support both IPv4 (max 15) and IPv6 (max 39 + brackets)

**12 Indexes total** covering: title search, status filtering, ISBN lookup, author/genre join traversal, download history queries.

---

## 7. UI Mockups

> All mockups represent the Blazor WASM SPA (same layout applies to React SPA).

### 7.1 Home Page — Book Catalog

*See diagram: `images/14-ui-home-page.jpg`*

**Layout:**
- **Navbar:** Logo, search bar, Genres link, Authors link, Login/Register buttons
- **Hero banner:** Welcome message, "Browse Catalog" CTA button
- **Filter row:** Genre dropdown, Language dropdown, Year dropdown, Apply button
- **Book grid:** 4 columns × 2 rows of book cards; each card shows cover image, title, author, genre tag, and Download button
- **Pagination:** Previous / page numbers / Next
- **Footer:** Copyright and links

### 7.2 Login / Register Pages

*See diagram: `images/15-ui-login-register.jpg`*

**Login form:**
- Email + Password fields
- "Forgot password?" link
- "Sign In" button
- Error banner shown for failed credentials (400 from API)
- Link to registration

**Register form:**
- FirstName, LastName (optional), Email, Password, Confirm Password
- Inline validation feedback before API call (FluentValidation errors from 400 response)
- Rate-limited: max 10 registration attempts per minute
- On success: JWT stored in `localStorage`, redirect to home

### 7.3 Admin Dashboard

*See diagram: `images/16-ui-admin-dashboard.jpg`*

**Layout:**
- **Top navbar:** App title, logged-in user name
- **Sidebar:** Navigation links (Dashboard, Books, Authors, Genres, Users, Upload Files)
- **Stats cards:** Total Books, Total Authors, Total Users, Total Downloads
- **Books table:** Title, Author, Genre, Language, Status columns; Edit / Delete action buttons
- **Pagination** below table

### 7.4 Book Detail Page

*See diagram: `images/17-ui-book-detail.jpg`*

**Layout:**
- **Left column:** Book cover image, availability badge, language badge
- **Right column:** Title, Author name (linked), metadata grid (Pages, Year, ISBN, Language, Genre)
- **Download button:** Triggers `GET /api/books/{id}/download` — requires authentication
- **Description:** Full synopsis text
- **Related Books:** 4 related-title cards at the bottom

---

## 8. Technology Stack

### Backend

| Component | Technology | Version |
|---|---|---|
| Runtime | .NET | 10.0 |
| Web Framework | ASP.NET Core | 10.0 |
| ORM | Entity Framework Core | 10.0 |
| Database | SQL Server | 2022 |
| Messaging | MediatR | 12.x |
| Validation | FluentValidation | 11.x |
| Mapping | AutoMapper | 13.x |
| Authentication | JWT Bearer | 10.0 |
| Password Hashing | BCrypt.Net-Next | 4.0 (work factor 12) |
| API Docs | Microsoft.AspNetCore.OpenApi + Scalar | 10.* |
| Rate Limiting | ASP.NET Core built-in | 10.0 |

### Frontend (Blazor)

| Component | Technology |
|---|---|
| Framework | Blazor WebAssembly (.NET 10) |
| Storage | Blazored.LocalStorage |
| Auth | Microsoft.AspNetCore.Components.Authorization |
| HTTP | HttpClient + AuthorizationMessageHandler (JWT injector) |

### Frontend (React)

| Component | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| HTTP | Axios |

### Testing

| Component | Technology |
|---|---|
| Test Framework | xUnit 2.x / 3.x |
| Assertions | FluentAssertions 6.x / 8.x |
| Mocking | Moq 4.x |
| Integration Tests | Microsoft.AspNetCore.Mvc.Testing + EF InMemory |

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| **All GUIDs as PKs** | Conflict-free distributed ID generation; no identity column to manage |
| **Soft Delete pattern** | Data is never physically deleted; `IsDeleted` flag + global EF filters keep it invisible |
| **Enum stored as nvarchar** | Human-readable in raw SQL; survives enum renaming without migrations |
| **Explicit join entities** | `BookAuthor` has `IsPrimary` column — can't be modeled with shadow join tables |
| **CQRS + MediatR** | Commands and queries have clear, isolated responsibilities; pipeline extensible via behaviors |
| **FluentValidation in pipeline** | Separates validation logic from handler business logic; `ValidationBehavior` fires before every command |
| **BCrypt work factor 12** | Balance between security (resistant to brute-force) and performance (~300ms per hash) |
| **JWT ClockSkew = 0** | No tolerance for clock drift — tokens expire at exactly their stated `exp` |
| **Rate limiting on auth** | Fixed window 10 req/min per remote IP prevents brute-force credential stuffing |
| **File storage: .epub only** | `FileStorageService` validates file extension; prevents arbitrary file upload |
| **OWASP security headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` applied globally |
| **Auto-migrate on startup** | Development only — simplifies onboarding; disabled in Production |

---

## 10. Security Architecture

### Authentication Flow

```
1. Client sends POST /api/auth/login {email, password}
2. Server verifies BCrypt hash (work factor 12)
3. On success: generates HMAC-SHA256 JWT with claims:
   sub (userId), email, role, jti (unique token ID), iat (issued at)
4. Client stores JWT in localStorage
5. For protected endpoints: client sends Authorization: Bearer <token>
6. ASP.NET Core JWT middleware validates:
   - Signature (HMAC-SHA256 with server secret key)
   - Issuer + Audience
   - Expiry (ClockSkew = 0 — exact precision)
7. [Authorize] checks IsAuthenticated
8. [Authorize(Roles="Admin")] checks role claim
```

### Authorization Matrix

| Endpoint | Anonymous | Regular User | Admin |
|---|---|---|---|
| `GET /api/books/search` | ✓ | ✓ | ✓ |
| `GET /api/books/{id}` | ✓ | ✓ | ✓ |
| `GET /api/books/{id}/download` | ✗ | ✓ | ✓ |
| `POST /api/books` | ✗ | ✗ | ✓ |
| `PUT /api/books/{id}` | ✗ | ✗ | ✓ |
| `DELETE /api/books/{id}` | ✗ | ✗ | ✓ |
| `GET /api/authors` | ✓ | ✓ | ✓ |
| `POST /api/authors` | ✗ | ✗ | ✓ |
| `GET /api/genres` | ✓ | ✓ | ✓ |
| `POST /api/genres` | ✗ | ✗ | ✓ |
| `GET /api/users` | ✗ | ✗ | ✓ |
| `PATCH /api/users/{id}/role` | ✗ | ✗ | ✓ |
| `POST /api/files/books/{id}/upload` | ✗ | ✗ | ✓ |
| `POST /api/auth/register` | ✓ (rate-limited) | ✓ | ✓ |
| `POST /api/auth/login` | ✓ (rate-limited) | ✓ | ✓ |

### OWASP Top 10 Mitigations

| Risk | Mitigation |
|---|---|
| A01 Broken Access Control | Role-based JWT claims + `[Authorize(Roles)]` on every write endpoint |
| A02 Cryptographic Failures | BCrypt-12 for passwords; HMAC-SHA256 for JWT; HTTPS enforced |
| A03 Injection | EF Core parameterized queries (no raw SQL) |
| A05 Security Misconfiguration | OWASP headers middleware; CORS origin whitelist |
| A07 Auth Failures | Rate limiting on auth endpoints; ClockSkew=0; JWT expiry enforcement |
| A08 Software Integrity | NuGet package lock files; vulnerability audits |

---

*EBook Library Architecture Documentation — Component 11 of 10 (Supplemental)*
