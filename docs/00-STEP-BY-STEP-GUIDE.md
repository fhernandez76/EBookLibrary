# EBook Library — Complete Step-by-Step Development Guide

## Project Overview

**EBook Library** is a full-stack web application that allows registered users to search and download eBooks (ePub format) from a personal digital library of 51,599 deduplicated titles. The application is built using the latest Microsoft technology stack with Clean Architecture principles.

### Technology Stack
| Layer | Technology |
|---|---|
| Language | C# 14 / .NET 10 |
| Architecture | Clean Architecture + CQRS + EF Core |
| Backend | ASP.NET Core 10 Web API (controller-based) |
| ORM | Entity Framework Core 10 |
| Database | MS SQL Server 2022 (DB-agnostic design) |
| Auth | JWT Bearer Tokens |
| Frontend Option A | React 18 + TypeScript + Vite |
| Frontend Option B | Blazor WebAssembly |
| Tests | xUnit + Moq + FluentAssertions |
| API Docs | Scalar (via built-in ASP.NET Core OpenAPI) |

---

## Phase 1 — Solution Scaffolding (Component 01)

### Step 1.1 — Prerequisites
- Install [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Install [Visual Studio 2022 (17.8+)](https://visualstudio.microsoft.com/) or VS Code with C# Dev Kit
- Install [SQL Server 2022 Developer Edition](https://www.microsoft.com/sql-server)
- Install [SQL Server Management Studio (SSMS)](https://aka.ms/ssms) or Azure Data Studio
- Install [Node.js 20 LTS](https://nodejs.org/) (for React frontend)
- Install [Git](https://git-scm.com/)

### Step 1.2 — Create Solution Structure
Follow **Component 01 — Solution Setup** (`01-SOLUTION-SETUP.md`) to:
1. Create the root solution folder `EBookLibrary/`
2. Scaffold all 6 projects (Domain, Application, Infrastructure, WebApi, React, Blazor)
3. Configure project references (dependency graph)
4. Add all required NuGet packages
5. Set up `.gitignore` and solution-level configuration

**Output:** A compilable empty solution with correct project references.

---

## Phase 2 — Domain Layer (Component 02)

### Step 2.1 — Core Entities
Follow **Component 02 — Domain Layer** (`02-DOMAIN-LAYER.md`) to create:
- `BaseEntity` abstract class with audit fields
- `Book` entity (Id, Title, Pages, FilePath, Language, IsAvailable, etc.)
- `Author` entity
- `Genre` entity
- `User` entity with role management
- `BookDownload` entity (tracks who downloaded what)
- `BookAuthor` / `BookGenre` join entities

### Step 2.2 — Value Objects
- `Email` value object with validation
- `UserRole` enum (Admin, Regular)
- `Language` enum (Spanish, English, Other)

### Step 2.3 — Repository Interfaces
- `IBookRepository`
- `IAuthorRepository`
- `IGenreRepository`
- `IUserRepository`
- `IBookDownloadRepository`
- `IUnitOfWork`

### Step 2.4 — Domain Services & Events
- `IDomainEvent` marker interface
- `BookSearchedEvent`
- `BookDownloadedEvent`

**Output:** Pure domain layer with no external dependencies.

---

## Phase 3 — Application Layer / CQRS (Component 03)

### Step 3.1 — Install MediatR & FluentValidation
Follow **Component 03 — Application Layer** (`03-APPLICATION-LAYER.md`) for:
- MediatR pipeline setup
- FluentValidation integration
- AutoMapper profiles

### Step 3.2 — Authentication Use Cases
| Use Case | Type | Description |
|---|---|---|
| `RegisterUserCommand` | Command | New user signup with email & password |
| `LoginUserCommand` | Command | Returns JWT token on success |
| `GetCurrentUserQuery` | Query | Returns profile of authenticated user |

### Step 3.3 — Book Use Cases
| Use Case | Type | Description |
|---|---|---|
| `SearchBooksQuery` | Query | Search by title, author, genre, year |
| `GetBookByIdQuery` | Query | Get single book details |
| `GetBooksPagedQuery` | Query | Paginated book listing |
| `DownloadBookCommand` | Command | User requests eBook file |

### Step 3.4 — Admin Use Cases
| Use Case | Type | Description |
|---|---|---|
| `CreateBookCommand` | Command | Admin adds a new book |
| `UpdateBookCommand` | Command | Admin edits book metadata |
| `DeleteBookCommand` | Command | Admin removes a book |
| `CreateAuthorCommand` | Command | Admin adds an author |
| `UpdateAuthorCommand` | Command | Admin edits author |
| `DeleteAuthorCommand` | Command | Admin removes author |
| `CreateGenreCommand` | Command | Admin adds genre |
| `UpdateGenreCommand` | Command | Admin edits genre |
| `DeleteGenreCommand` | Command | Admin removes genre |
| `GetUsersQuery` | Query | Admin views all users |
| `UpdateUserRoleCommand` | Command | Admin changes user role |
| `UploadBookFileCommand` | Command | Admin uploads ePub file |

### Step 3.5 — DTOs & Validators
- `BookDto`, `BookDetailDto`, `BookSearchResultDto`
- `AuthorDto`, `GenreDto`
- `UserDto`, `RegisterUserDto`, `LoginDto`, `AuthResponseDto`
- `PagedResultDto<T>`
- FluentValidation validators for all commands

**Output:** Application layer with all CQRS handlers, DTOs, and validators.

---

## Phase 4 — Infrastructure Layer (Component 04)

### Step 4.1 — EF Core DbContext
Follow **Component 04 — Infrastructure Layer** (`04-INFRASTRUCTURE-LAYER.md`) for:
- `AppDbContext` with all DbSets
- Fluent API entity configurations
- Query filters (soft delete, active only)
- DB-agnostic configuration support

### Step 4.2 — Repository Implementations
- Concrete implementations for all repository interfaces
- Generic `Repository<T>` base class
- `UnitOfWork` implementation

### Step 4.3 — Services
- `JwtTokenService` — generates and validates JWT tokens
- `PasswordHashService` — bcrypt hashing
- `FileStorageService` — manages ePub files on disk
- `CurrentUserService` — extracts user from HttpContext

### Step 4.4 — DI Registration
- `DependencyInjection.cs` extension method for clean `Program.cs`

**Output:** Infrastructure layer ready to connect to SQL Server and file system.

---

## Phase 5 — Web API Layer (Component 05)

### Step 5.1 — Controllers
Follow **Component 05 — API Layer** (`05-API-LAYER.md`) to create:
- `AuthController` — Register, Login
- `BooksController` — Search, GetById, Download
- `AuthorsController` — CRUD (Admin)
- `GenresController` — CRUD (Admin)
- `UsersController` — List, UpdateRole (Admin)
- `FilesController` — Upload ePub (Admin)

### Step 5.2 — Middleware & Filters
- Global exception handling middleware
- Request/response logging middleware
- `[Authorize]` and `[RequireRole]` decorators

### Step 5.3 — Program.cs Configuration
- Scalar UI with JWT auth support
- CORS policy for frontend origins
- EF Core + SQL Server connection
- MediatR, AutoMapper, FluentValidation registrations
- JWT Bearer authentication middleware

**Output:** Fully functional REST API with Scalar UI.

---

## Phase 6 — JWT Authentication (Component 06)

Follow **Component 06 — Authentication** (`06-AUTHENTICATION.md`) for the complete auth flow:
1. User registers → password is bcrypt-hashed → stored in DB
2. User logs in → credentials verified → JWT token returned
3. JWT contains: `userId`, `email`, `role`, expiry
4. API validates JWT on each protected endpoint
5. Role-based authorization (`[Authorize(Roles = "Admin")]`)

**Output:** Secure JWT authentication and role-based authorization.

---

## Phase 7 — Database Migrations (Component 07)

Follow **Component 07 — Database Migrations** (`07-DATABASE-MIGRATIONS.md`) to:
1. Configure connection strings for SQL Server
2. Run the initial EF Core migration
3. Execute the two-pass seeder (`dotnet run --project scripts/EBookLibrary.Seeder`) — parses `lista_autor.html` + `lista_generos.html`, deduplicates all 51,599 books, normalizes 128 genres, and auto-loads data into the DB
4. Verify schema in SSMS

**Output:** Populated SQL Server database ready for development.

---

## Phase 8 — React Frontend (Component 08)

### Step 8.1 — Project Setup
Follow **Component 08 — React Frontend** (`08-REACT-FRONTEND.md`) for:
- Vite + React 18 + TypeScript scaffold
- Tailwind CSS for Barnes & Noble-style UI
- React Router v6 for navigation
- Axios + TanStack Query for API calls
- Zustand for auth state
- i18next for EN/ES localization

### Step 8.2 — Pages
| Page | Route | Description |
|---|---|---|
| Home | `/` | Hero section, featured books, categories |
| Search | `/search` | Full-text search with filters |
| Book Detail | `/books/:id` | Cover, metadata, download button |
| Login | `/login` | Email/password form |
| Register | `/register` | Signup form |
| Profile | `/profile` | User info, download history |
| Admin Dashboard | `/admin` | Stats overview |
| Admin Books | `/admin/books` | CRUD for books |
| Admin Authors | `/admin/authors` | CRUD for authors |
| Admin Genres | `/admin/genres` | CRUD for genres |
| Admin Users | `/admin/users` | User management |
| Admin Upload | `/admin/upload` | ePub file upload |

**Output:** A functioning React SPA connected to the backend API.

---

## Phase 9 — Blazor Frontend (Component 09)

Follow **Component 09 — Blazor Frontend** (`09-BLAZOR-FRONTEND.md`) for:
- Blazor WebAssembly project with authentication
- Same page structure as React frontend
- Localization (Spanish/English)
- Reusable Razor components
- HTTP client with JWT interceptor

**Output:** An alternative Blazor WebAssembly SPA.

---

## Phase 10 — Unit Tests (Component 10)

Follow **Component 10 — Unit Tests** (`10-UNIT-TESTS.md`) for:
- xUnit test projects for Domain, Application, and API layers
- Moq for mocking dependencies
- FluentAssertions for readable assertions
- In-memory EF Core for integration-style tests

### Critical Test Coverage
| Test Class | Coverage |
|---|---|
| `RegisterUserCommandHandlerTests` | Signup validation, duplicate email |
| `LoginUserCommandHandlerTests` | Valid login, wrong password, inactive user |
| `SearchBooksQueryHandlerTests` | Search by title, author, genre, pagination |
| `DownloadBookCommandHandlerTests` | File exists, file missing, unauthorized |
| `CreateBookCommandHandlerTests` | Valid book, duplicate ISBN |
| `JwtTokenServiceTests` | Token generation, expiry, claims |
| `BooksControllerTests` | HTTP status codes, response shapes |

**Output:** Comprehensive test suite with >80% coverage on the Application layer.

---

## Development Sequence Summary

```
Phase 1: Solution Setup          → 01-SOLUTION-SETUP.md
Phase 2: Domain Layer            → 02-DOMAIN-LAYER.md
Phase 3: Application Layer       → 03-APPLICATION-LAYER.md
Phase 4: Infrastructure Layer    → 04-INFRASTRUCTURE-LAYER.md
Phase 5: API Layer               → 05-API-LAYER.md
Phase 6: Authentication          → 06-AUTHENTICATION.md
Phase 7: Database & Migrations   → 07-DATABASE-MIGRATIONS.md
Phase 8: React Frontend          → 08-REACT-FRONTEND.md
Phase 9: Blazor Frontend         → 09-BLAZOR-FRONTEND.md
Phase 10: Unit Tests             → 10-UNIT-TESTS.md
```

---

## Key Architectural Decisions

### Clean Architecture Dependency Rule
```
Domain ← Application ← Infrastructure
                     ← WebApi
```
- **Domain**: No external dependencies. Pure C# classes.
- **Application**: Depends only on Domain. Uses interfaces for everything external.
- **Infrastructure**: Implements application interfaces. Depends on EF Core, JWT, file system.
- **WebApi**: Depends on Application (sends commands/queries via MediatR). Configures Infrastructure.

### CQRS with MediatR
- Commands mutate state and return minimal data (Id, success flag)
- Queries are read-only and return DTOs
- Each handler is a single-responsibility class
- Pipeline behaviors handle cross-cutting concerns (logging, validation, transactions)

### Database Agnosticism
- All SQL Server-specific configuration is isolated in `Infrastructure/Persistence/SqlServer/`
- Switching to PostgreSQL requires only adding the Npgsql EF Core package and changing the `UseNpgsql()` call
- Migrations folder is provider-specific: `Migrations/SqlServer/`, `Migrations/Postgres/`

### File Storage Strategy
- eBooks are stored on the server file system (NOT in the database)
- The `Book.FilePath` column stores a relative path: `books/{genre}/{filename}.epub`
- `FileStorageService` resolves the absolute path using a configurable base directory
- Future enhancement: swap to Azure Blob Storage by replacing `FileStorageService`

---

## Folder Structure Reference

```
EBookLibrary/
├── src/
│   ├── EBookLibrary.Domain/
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   ├── Enums/
│   │   ├── Events/
│   │   └── Interfaces/
│   ├── EBookLibrary.Application/
│   │   ├── Common/
│   │   │   ├── Behaviors/          ← MediatR Pipeline Behaviors
│   │   │   ├── Interfaces/         ← Service interfaces
│   │   │   ├── Mappings/           ← AutoMapper profiles
│   │   │   └── Models/             ← Shared DTOs (PagedResult, Result<T>)
│   │   ├── Auth/
│   │   │   ├── Commands/
│   │   │   └── Queries/
│   │   ├── Books/
│   │   │   ├── Commands/
│   │   │   └── Queries/
│   │   ├── Authors/
│   │   ├── Genres/
│   │   └── Users/
│   ├── EBookLibrary.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   ├── Configurations/     ← Fluent API configs
│   │   │   └── Migrations/
│   │   ├── Repositories/
│   │   ├── Services/               ← JWT, Password, FileStorage
│   │   └── DependencyInjection.cs
│   ├── EBookLibrary.WebApi/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Filters/
│   │   ├── Extensions/
│   │   └── Program.cs
│   ├── EBookLibrary.React/         ← Vite React TypeScript project
│   └── EBookLibrary.Blazor/        ← Blazor WebAssembly project
├── tests/
│   ├── EBookLibrary.Domain.Tests/
│   ├── EBookLibrary.Application.Tests/
│   └── EBookLibrary.WebApi.Tests/
├── docs/
│   └── (this file and all component guides)
├── scripts/
│   └── seed-data.sql              ← Generated from HTML book lists
└── EBookLibrary.sln
```

---

## Quick Reference — Most Important NuGet Packages

| Package | Project | Purpose |
|---|---|---|
| `MediatR` | Application | CQRS mediator |
| `FluentValidation.DependencyInjectionExtensions` | Application | Command/Query validation |
| `AutoMapper` | Application | Object mapping (DI extensions built-in since v12) |
| `Microsoft.EntityFrameworkCore.SqlServer` | Infrastructure | EF Core SQL Server provider |
| `Microsoft.EntityFrameworkCore.Tools` | Infrastructure | Migrations tooling |
| `BCrypt.Net-Next` | Infrastructure | Password hashing |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | WebApi | JWT middleware |
| `Microsoft.AspNetCore.OpenApi` | WebApi | OpenAPI document generation |
| `Scalar.AspNetCore` | WebApi | Interactive API UI |
| `xunit` | Tests | Test framework |
| `Moq` | Tests | Mocking |
| `FluentAssertions` | Tests | Assertion library |
| `Microsoft.EntityFrameworkCore.InMemory` | Tests | In-memory DB for tests |

---

*Document version: 1.0 — EBook Library Project — March 2026*
