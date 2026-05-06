# Chapter 01 — Architecture Deep Dive

> *"Architecture is the decisions that are hard to change. Make them consciously."*

---

## Chapter Objectives

By the end of this chapter you will:
- Understand Clean Architecture and why it matters in a real project
- Be able to explain CQRS and why it improves testability
- Know the dependency rules that govern every file in this solution
- Read and interpret C4 architecture diagrams at all four levels
- Understand the key design decisions made in EBook Library and their trade-offs

---

## 1.1 The Problem with Traditional Layered Architecture

Before understanding Clean Architecture, consider the problem it solves.

In a traditional three-tier architecture, a typical flow looks like:

```
Controller → Service → Repository → Database
```

This works fine for small apps, but breaks down as complexity grows:
- The **Service** class imports the database ORM directly — you can't unit test it without a database
- Changing the database requires modifying **Service** classes
- Business logic leaks into controllers or repositories
- No clear boundary between "what the application does" and "how it does it"

**Clean Architecture** solves this by inverting dependencies: the inner layers define **interfaces**, and outer layers **implement** them.

---

## 1.2 Clean Architecture — The Layers

```mermaid
graph TD
    subgraph "Outer — Frameworks & Drivers"
        WebApi["WebApi<br/>(ASP.NET Core Controllers)"]
        React["React SPA<br/>(Vite + TypeScript)"]
        Blazor["Blazor WASM<br/>(.NET / C#)"]
        EF["EF Core<br/>(SQL Server)"]
    end

    subgraph "Interface Adapters"
        Infra["Infrastructure<br/>(Repository implementations<br/>JWT · BCrypt · File Storage)"]
    end

    subgraph "Application Business Rules"
        App["Application<br/>(CQRS Handlers · Validators<br/>DTOs · Service Interfaces)"]
    end

    subgraph "Enterprise Business Rules"
        Domain["Domain<br/>(Entities · Value Objects<br/>Repository Interfaces · Enums)"]
    end

    WebApi --> App
    React -->|"HTTP REST"| WebApi
    Blazor -->|"HTTP REST"| WebApi
    Infra --> App
    Infra --> EF
    App --> Domain

    style Domain fill:#2d6a4f,color:#fff
    style App fill:#1a3c7c,color:#fff
    style Infra fill:#6d4c41,color:#fff
    style WebApi fill:#4a4a8a,color:#fff
```

### The Dependency Rule (most important rule)

> **Source code dependencies must point inward. Nothing in an inner circle can know about something in an outer circle.**

| Layer | Can reference | Cannot reference |
|---|---|---|
| Domain | Nothing (pure .NET BCL) | Application, Infrastructure, WebApi |
| Application | Domain only | Infrastructure, WebApi |
| Infrastructure | Application + Domain | WebApi |
| WebApi | Application + Infrastructure | (no restriction — outermost) |

This rule is enforced by the `.csproj` project references:
```
Domain.csproj    → no references
Application.csproj → references Domain
Infrastructure.csproj → references Application
WebApi.csproj    → references Application + Infrastructure
```

**Why does this matter?**

You can write unit tests for your Application handlers without a database — because Application only depends on Domain interfaces, and you can mock them. If Infrastructure could bleed into Application, you'd need a real SQL Server to run tests.

---

## 1.3 The EBook Library Project Structure

```
EBookLibrary/
├── src/
│   ├── EBookLibrary.Domain/          ← Zero external NuGet dependencies
│   ├── EBookLibrary.Application/     ← MediatR, FluentValidation, AutoMapper
│   ├── EBookLibrary.Infrastructure/  ← EF Core, BCrypt, JWT
│   ├── EBookLibrary.WebApi/          ← ASP.NET Core 10 controllers
│   ├── EBookLibrary.React/           ← Vite + React 18 + TypeScript SPA
│   └── EBookLibrary.Blazor/          ← Blazor WebAssembly
├── tests/
│   ├── EBookLibrary.Domain.Tests/
│   ├── EBookLibrary.Application.Tests/
│   ├── EBookLibrary.WebApi.Tests/
│   └── EBookLibrary.E2E.Tests/       ← Playwright browser tests
└── scripts/
    └── EBookLibrary.Seeder/          ← Data seeding console app
```

---

## 1.4 CQRS — Command Query Responsibility Segregation

CQRS is a pattern that **separates read operations from write operations**.

### The Problem Without CQRS

```csharp
public class BookService
{
    // 20+ methods on one class — reads and writes mixed
    public Task<PagedResult<Book>> SearchAsync(BookFilter filter) { ... }
    public Task<Book> GetByIdAsync(Guid id) { ... }
    public Task<Book> CreateAsync(CreateBookDto dto) { ... }
    public Task UpdateAsync(Guid id, UpdateBookDto dto) { ... }
    public Task DeleteAsync(Guid id) { ... }
    public Task<string> UploadFileAsync(Stream file) { ... }
    public Task<string> DownloadFileAsync(Guid bookId) { ... }
    // ... more methods
}
```

This class becomes a "God Service" — impossible to test in isolation, violates Single Responsibility.

### The Solution — MediatR Handlers

With CQRS, each operation is a **separate class**:

```
Commands (write, mutate state):
├── RegisterUserCommand + RegisterUserCommandHandler
├── LoginUserCommand + LoginUserCommandHandler
├── CreateBookCommand + CreateBookCommandHandler
├── UpdateBookCommand + UpdateBookCommandHandler
├── DeleteBookCommand + DeleteBookCommandHandler
└── DownloadBookCommand + DownloadBookCommandHandler

Queries (read, return data):
├── SearchBooksQuery + SearchBooksQueryHandler
├── GetBookByIdQuery + GetBookByIdQueryHandler
├── GetAuthorByIdQuery + GetAuthorByIdQueryHandler
└── GetUsersPagedQuery + GetUsersPagedQueryHandler
```

Each handler has exactly **one responsibility**. Testing is trivial:

```csharp
[Fact]
public async Task Handle_ValidCredentials_ReturnsToken()
{
    // Arrange — mock only what this handler needs
    var uow = TestMockFactory.CreateUnitOfWork(users: userRepoMock);
    var jwt = TestMockFactory.CreateJwtService("test-token");
    var handler = new LoginUserCommandHandler(uow.Object, jwt.Object, passwordHash.Object);

    // Act
    var result = await handler.Handle(new LoginUserCommand("user@test.com", "pass"), default);

    // Assert
    result.Token.Should().Be("test-token");
}
```

### The MediatR Pipeline

MediatR does more than just dispatch requests. It supports **pipeline behaviors** — middleware that runs before and after every handler:

```mermaid
sequenceDiagram
    participant Controller
    participant MediatR
    participant LoggingBehavior
    participant ValidationBehavior
    participant Handler

    Controller->>MediatR: Send(command)
    MediatR->>LoggingBehavior: Handle (before)
    LoggingBehavior->>ValidationBehavior: next()
    ValidationBehavior->>ValidationBehavior: Run FluentValidation
    alt Validation fails
        ValidationBehavior-->>Controller: throw ValidationException
    end
    ValidationBehavior->>Handler: next()
    Handler->>Handler: Execute business logic
    Handler-->>ValidationBehavior: result
    ValidationBehavior-->>LoggingBehavior: result
    LoggingBehavior->>LoggingBehavior: Log completion
    LoggingBehavior-->>Controller: result
```

Every command/query automatically gets:
1. **Request logging** (LoggingBehavior) — logs the request type and execution time
2. **Validation** (ValidationBehavior) — runs FluentValidation, throws on failure

This is cross-cutting concern handling without polluting handlers.

---

## 1.5 C4 Architecture Model

The C4 model describes a system at four levels of abstraction. Think of it like Google Maps zoom levels: zooming in reveals more detail.

### Level 1 — System Context

*Who uses the system, and what external systems does it interact with?*

```mermaid
C4Context
    title EBook Library — System Context

    Person(user, "Regular User", "Browses, searches, and downloads eBooks")
    Person(admin, "Admin", "Manages catalog, authors, genres, users")

    System(ebook, "EBook Library", "Web application for browsing and downloading eBooks")

    System_Ext(sqlserver, "SQL Server 2022", "Stores all application data")
    System_Ext(filesystem, "File System", "Stores ePub files")

    Rel(user, ebook, "Uses", "HTTPS")
    Rel(admin, ebook, "Manages via admin panel", "HTTPS")
    Rel(ebook, sqlserver, "Reads/writes data", "EF Core / SQL")
    Rel(ebook, filesystem, "Stores/retrieves ePub files", "File I/O")
```

### Level 2 — Container

*What deployable units make up the system?*

```mermaid
C4Container
    title EBook Library — Containers

    Person(user, "User")
    Person(admin, "Admin")

    Container(react, "React SPA", "React 18 + TypeScript + Vite", "Primary browser UI — Barnes & Noble style")
    Container(blazor, "Blazor WASM", "C# + .NET 10", "Alternative browser UI — runs C# in browser")
    Container(api, "Web API", "ASP.NET Core 10", "REST API — all business logic entry point")
    ContainerDb(db, "SQL Server 2022", "MS SQL Server", "Stores books, users, genres, authors, downloads")
    Container(files, "File Storage", "Disk/NFS", "ePub file storage, organized by genre")

    Rel(user, react, "Uses", "HTTPS :5173")
    Rel(user, blazor, "Uses (alternative)", "HTTPS :7278")
    Rel(admin, react, "Manages catalog", "HTTPS")
    Rel(react, api, "API calls", "REST / JSON over HTTPS :5149")
    Rel(blazor, api, "API calls", "REST / JSON over HTTPS :5149")
    Rel(api, db, "CRUD via EF Core", "SQL/TDS")
    Rel(api, files, "Read/write ePub files", "File I/O")
```

### Level 3 — Component (Web API)

*What are the major components inside the Web API container?*

```mermaid
C4Component
    title Web API — Components

    Container_Ext(react, "React SPA")
    Container_Ext(blazor, "Blazor WASM")

    Component(auth_ctrl, "AuthController", "POST /api/auth/register, /login")
    Component(books_ctrl, "BooksController", "GET /api/books/search, /{id}, /download")
    Component(admin_ctrl, "AuthorsController, GenresController, UsersController", "Admin CRUD")
    Component(files_ctrl, "FilesController", "POST /api/files/upload")
    Component(mediator, "MediatR Mediator", "Dispatches commands/queries to handlers")
    Component(middleware, "Middleware Pipeline", "Exception handling, request logging, JWT auth")
    Component(app_layer, "Application Layer", "CQRS handlers, validators, DTOs")

    Rel(react, auth_ctrl, "")
    Rel(blazor, auth_ctrl, "")
    Rel(auth_ctrl, mediator, "Send(command)")
    Rel(books_ctrl, mediator, "Send(query)")
    Rel(admin_ctrl, mediator, "Send(command)")
    Rel(files_ctrl, mediator, "Send(command)")
    Rel(mediator, app_layer, "Dispatches to handlers")
    Rel(middleware, auth_ctrl, "Wraps all requests")
```

### Level 4 — Code (Domain)

*What are the classes inside the Domain layer?*

```mermaid
classDiagram
    class BaseEntity {
        +Guid Id
        +DateTime CreatedAt
        +DateTime? UpdatedAt
        +bool IsDeleted
        +SoftDelete()
        +MarkAsUpdated()
        +AddDomainEvent(IDomainEvent)
    }

    class Book {
        +string Title
        +string? Isbn
        +string? Description
        +int Pages
        +int? PublicationYear
        +string? FilePath
        +BookLanguage Language
        +BookStatus Status
        +ICollection~BookAuthor~ BookAuthors
        +ICollection~BookGenre~ BookGenres
        +Create(title, language) Book$
        +Update(title, description, pages, year)
        +SetFilePath(path)
        +MarkAvailable()
    }

    class Author {
        +string Name
        +string? Biography
        +ICollection~BookAuthor~ BookAuthors
        +Create(name, biography) Author$
        +Update(name, biography)
    }

    class Genre {
        +string Name
        +string? Description
        +ICollection~BookGenre~ BookGenres
        +Create(name, description) Genre$
        +Update(name, description)
    }

    class User {
        +string Email
        +string PasswordHash
        +string? FirstName
        +string? LastName
        +UserRole Role
        +bool IsActive
        +Create(email, passwordHash) User$
        +UpdateRole(UserRole)
        +Deactivate()
    }

    class BookAuthor {
        +Guid BookId
        +Guid AuthorId
    }

    class BookGenre {
        +Guid BookId
        +Guid GenreId
    }

    class BookDownload {
        +Guid UserId
        +Guid BookId
        +DateTime DownloadedAt
    }

    BaseEntity <|-- Book
    BaseEntity <|-- Author
    BaseEntity <|-- Genre
    BaseEntity <|-- User
    Book "1" --> "*" BookAuthor
    Book "1" --> "*" BookGenre
    Author "1" --> "*" BookAuthor
    Genre "1" --> "*" BookGenre
    User "1" --> "*" BookDownload
    Book "1" --> "*" BookDownload
```

---

## 1.6 Key Design Decisions

Understanding *why* certain choices were made prevents you from second-guessing them during implementation.

### Decision 1 — Controller-based API, not Minimal APIs

**Choice:** ASP.NET Core controller-based API  
**Alternative considered:** Minimal APIs (the newer ASP.NET Core approach)  
**Reason:** For a project this size (8+ controllers, complex middleware, role-based auth), controllers provide better organization. Minimal APIs are excellent for small, focused services. Controllers also integrate better with existing tooling like Swagger/Scalar attribute-based documentation.

### Decision 2 — Soft Delete Strategy

**Choice:** All entities have `IsDeleted` (bool) + global query filters in EF Core  
**Alternative considered:** Hard delete (permanent removal)  
**Reason:** In a library system, deleting a book that users have downloaded could cause referential integrity issues. Soft delete allows the record to remain in the DB (maintaining FK constraints) while hiding it from normal queries.

**Implementation:**
```csharp
// In AppDbContext.OnModelCreating:
modelBuilder.Entity<Book>().HasQueryFilter(b => !b.IsDeleted);
// Every LINQ query on Books automatically adds WHERE IsDeleted = 0
```

### Decision 3 — Repository + Unit of Work Pattern over Direct DbContext

**Choice:** `IBookRepository`, `IAuthorRepository`, etc. accessed via `IUnitOfWork`  
**Alternative considered:** Inject `AppDbContext` directly into Application handlers  
**Reason:** 
1. **Testability** — mock `IUnitOfWork` without a real database
2. **Abstraction** — Application layer doesn't know about EF Core
3. **Transaction management** — `IUnitOfWork.SaveChangesAsync()` batches all changes in one transaction

### Decision 4 — No Refresh Tokens in v1

**Choice:** JWT tokens expire in 60 minutes, no refresh mechanism  
**Alternative considered:** Refresh token rotation (Redis-backed or DB-backed)  
**Reason:** Simplicity for v1. The learning focus is the architecture pattern, not token lifecycle management. Adding refresh tokens is a natural v2 enhancement exercise (see Appendix B).

### Decision 5 — JWT in localStorage (Not httpOnly Cookies)

**Choice:** JWT token stored in browser `localStorage`  
**Alternative considered:** httpOnly cookies (more secure against XSS)  
**Reason:** Simplicity and CORS compatibility for a learning project. In production, httpOnly cookies would be the recommended approach. This trade-off is documented in the codebase.

> **Security note:** If you adapt this project for production use, replace `localStorage` JWT storage with httpOnly cookies and implement CSRF protection.

### Decision 6 — Database-Agnostic Design

**Choice:** EF Core with SQL Server, but the design allows switching providers  
**Implementation:** Only `DependencyInjection.cs` in Infrastructure references `UseSqlServer()`. Switching to PostgreSQL requires changing one line: `UseSqlServer()` → `UseNpgsql()`.

---

## 1.7 Request Flow — End to End

Tracing a complete request through all layers makes the architecture tangible. Here is the flow for `GET /api/books/search?title=cervantes`:

```mermaid
sequenceDiagram
    participant Browser as Browser (React)
    participant MW as Middleware Pipeline
    participant Ctrl as BooksController
    participant MediatR
    participant VB as ValidationBehavior
    participant Handler as SearchBooksQueryHandler
    participant Repo as BookRepository
    participant EF as EF Core
    participant DB as SQL Server

    Browser->>MW: GET /api/books/search?title=cervantes
    MW->>MW: JWT validation (anonymous allowed)
    MW->>Ctrl: Route to BooksController.Search()
    Ctrl->>MediatR: Send(new SearchBooksQuery(filter))
    MediatR->>VB: Handle (pipeline)
    VB->>VB: Validate SearchBooksQuery
    VB->>Handler: next()
    Handler->>Repo: SearchAsync(filter, pageNumber, pageSize)
    Repo->>EF: LINQ query with filters
    EF->>DB: SELECT ... WHERE Title LIKE '%cervantes%'
    DB-->>EF: rows
    EF-->>Repo: List<Book>
    Repo-->>Handler: PagedResult<Book>
    Handler->>Handler: AutoMapper → PagedResult<BookSummaryDto>
    Handler-->>Ctrl: PagedResult<BookSummaryDto>
    Ctrl-->>Browser: 200 { success: true, data: { items: [...], totalCount: 42 } }
```

Every layer has a single, clear responsibility. No layer knows about the details of the layers outside it.

---

## 1.8 Dependency Flow Diagram

```mermaid
graph LR
    subgraph "Solution Projects"
        D["EBookLibrary.Domain<br/>📦 zero deps"]
        A["EBookLibrary.Application<br/>📦 MediatR · FluentValidation · AutoMapper"]
        I["EBookLibrary.Infrastructure<br/>📦 EF Core · BCrypt · JWT"]
        W["EBookLibrary.WebApi<br/>📦 ASP.NET Core"]
        BL["EBookLibrary.Blazor<br/>📦 Blazor WASM"]
        
        AT["Application.Tests<br/>📦 xUnit · Moq · FluentAssertions"]
        DT["Domain.Tests<br/>📦 xUnit · FluentAssertions"]
        WT["WebApi.Tests<br/>📦 xUnit · WebApplicationFactory"]
        ET["E2E.Tests<br/>📦 Playwright · NUnit"]
    end

    A -->|"project ref"| D
    I -->|"project ref"| A
    W -->|"project ref"| A
    W -->|"project ref"| I
    AT -->|"project ref"| A
    DT -->|"project ref"| D
    WT -->|"project ref"| W
```

---

## 1.9 Checkpoint ✅

Before moving to Chapter 02, you should be able to:

- [ ] Explain why the Domain layer has zero external NuGet dependencies
- [ ] Describe what CQRS is and how MediatR implements it
- [ ] Trace a request from the browser to the database and back through all layers
- [ ] Identify which project references which in the solution
- [ ] Explain the soft delete pattern and why it was chosen

---

## 1.10 🤖 AI-Assisted Development — Architecture

Architecture decisions are one area where AI tools are **least reliable**. Copilot can generate structurally correct code following Clean Architecture patterns, but it cannot:
- Know which trade-offs matter for your specific project
- Understand non-functional requirements (scale, team size, operational complexity)
- Make judgment calls about when simplicity beats purity

**What Copilot did well in this chapter's scope:**
- Generated the `BaseEntity` class with correct soft delete + domain event patterns
- Set up project references in `.csproj` files accurately
- Suggested appropriate NuGet packages per layer

**What required human judgment:**
- Decision to use controller-based API vs. minimal APIs
- Choosing not to implement refresh tokens in v1
- Deciding where to put responsibility boundaries (what goes in Application vs. Domain)

> **Lesson:** Use AI to generate structure; use your judgment for architectural decisions.

---

## Further Reading

- [docs/architecture/ARCHITECTURE.md](../docs/architecture/ARCHITECTURE.md) — Complete architecture document with all 17 diagrams
- [docs/architecture/diagrams/](../docs/architecture/diagrams/) — Source `.drawio` diagram files
- Clean Architecture by Robert C. Martin (book)
- MediatR documentation: https://github.com/jbogard/MediatR
- C4 Model: https://c4model.com

---

**← Previous:** [00 — Introduction](00-INTRODUCTION.md)  
**Next →** [02 — Solution Setup](02-SOLUTION-SETUP.md)
