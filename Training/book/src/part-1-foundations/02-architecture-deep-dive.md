# Chapter 2 — Architecture Deep Dive

> *"Architecture is the decisions that are hard to change. Make them
> consciously."*

---

## What you will learn

- The two competing organizing forces in any layered architecture
  (frameworks pulling outward, business rules pulling inward) and how
  Clean Architecture resolves them.
- The *dependency rule* and how it is enforced in this project at the
  `.csproj` level.
- The four levels of the C4 model and how to read each one.
- CQRS as practiced in this project, why it improves testability, and
  what its costs are.
- The six architectural decisions that shape every later chapter, the
  alternatives that were considered, and the rationale for each choice.

---

## 2.1 The problem layered architecture is trying to solve

A traditional three-tier architecture is the first one most engineers
learn:

```
Controller  →  Service  →  Repository  →  Database
```

It works adequately for small applications. As the project grows, three
problems appear in succession:

1. **The service layer becomes a god class.** Read methods,
   write methods, file uploads, password hashing, and notification
   sending end up in the same class because there is nowhere else to
   put them.
2. **The service layer cannot be tested without a database.** It
   imports the ORM directly, which means a unit test of business logic
   requires a real `DbContext` and a real connection.
3. **Changing infrastructure ripples upward.** Switching from SQL Server
   to PostgreSQL, or from cookie auth to JWT, requires editing service
   classes that should not have known about either.

These three problems share a single root cause: *dependencies point
the wrong way*. The controller depends on a service that depends on a
repository that depends on the database. The thing that should change
least often (business behavior) is being held hostage by the thing that
changes most often (the framework, the database, the auth mechanism).

Clean Architecture inverts this. The inner layers — the parts that
encode the *business* — define interfaces. The outer layers — the parts
that contain the *technology* — implement those interfaces. The arrow
of dependency, in source code, points inward.

---

## 2.2 Clean Architecture — the four layers

Figure 2.1 shows the four layers of Clean Architecture as practiced in
this project. The rendering style is Simon Brown's; the substance is
Robert Martin's.

![Figure 2.1 — Clean Architecture layers as implemented in EBook Library.](figures/05-clean-architecture-layers.jpg)

The four layers, from the inside out:

- **Domain.** Entities, value objects, enumerations, repository
  *interfaces* (not implementations), and domain events. Pure C#, zero
  external NuGet packages. The Domain layer would compile if every
  other project in the solution were deleted.
- **Application.** CQRS handlers, validators, DTOs, AutoMapper profiles,
  pipeline behaviors, and the *interfaces* for any infrastructure
  service the handlers need (`IJwtService`, `IUnitOfWork`,
  `IPasswordHasher`, `IFileStorage`). References Domain only.
- **Infrastructure.** EF Core `DbContext` and configurations, repository
  implementations, JWT token generation, BCrypt password hashing, file
  storage. Implements the interfaces declared by Application; references
  Application and Domain.
- **Web API.** Controllers, middleware, the response envelope,
  authentication setup, OpenAPI configuration. References Application
  and Infrastructure (the latter only for dependency-injection
  registration in `Program.cs`).

### The dependency rule

> **Source code dependencies must point inward. Nothing in an inner
> circle can know about something in an outer circle.**

This single rule is the difference between Clean Architecture and any
other layered scheme. Table 2.1 makes it concrete for this project.

**Table 2.1 — What each layer can and cannot reference.**

| Layer          | May reference                  | May not reference            |
|----------------|--------------------------------|------------------------------|
| Domain         | Nothing (pure .NET BCL)        | Application, Infrastructure, Web API |
| Application    | Domain                         | Infrastructure, Web API      |
| Infrastructure | Application, Domain            | Web API                      |
| Web API        | Application, Infrastructure    | (none — it is the outermost) |

The rule is enforced by `.csproj` project references rather than by
convention. If you accidentally try to reference EF Core from the
Application project, the build fails. Figure 2.2 shows the resulting
dependency graph.

![Figure 2.2 — Dependency flow between projects, enforced by .csproj references.](figures/06-dependency-flow.jpg)

### Why this matters in practice

The payoff of obeying the dependency rule is concentrated in two places:

1. **Unit tests.** Application handlers depend only on interfaces from
   Domain. To test a handler, you mock its dependencies and instantiate
   the handler directly. No `WebApplicationFactory`, no in-memory EF
   Core provider, no fixtures. Chapter 12 shows hundreds of these
   tests; each runs in milliseconds.
2. **Substitutability.** The decision to use SQL Server lives in
   exactly one line of `Infrastructure/DependencyInjection.cs`. The
   decision to use BCrypt lives in one file. The decision to use JWT
   lives in two. Replacing any of them does not require touching
   Application, Domain, or any handler.

> **Architect's Note:** Clean Architecture is not the only way to
> achieve these properties. *Hexagonal* (Cockburn) and *Onion* (Palermo)
> are close cousins and produce the same dependency graph by slightly
> different vocabulary. *Vertical Slice Architecture* (Bogard) takes the
> same primitives and re-organizes them by feature instead of by layer,
> trading one form of duplication for another. Pick one and use it; do
> not invent a fourth.

> **Pitfall:** The single most common mistake in newly-adopted Clean
> Architecture codebases is leaking the ORM into Application by
> typing a handler as `IQueryable<Book>` or by depending on EF Core's
> `Include()`. The leak is small and usually defended on grounds of
> performance. It will compound until your "Application" layer is in
> fact a thin layer of EF Core wrappers, and then the architecture is
> no longer doing any work for you.

---

## 2.3 The project structure

Listing 2.1 shows the directory layout that results from obeying the
rules above. Chapter 3 will create it; Chapters 4–11 will fill it in.

**Listing 2.1 — Solution layout.**

```text
EBookLibrary/
├── src/
│   ├── EBookLibrary.Domain/          ← zero NuGet dependencies
│   ├── EBookLibrary.Application/     ← MediatR, FluentValidation, AutoMapper
│   ├── EBookLibrary.Infrastructure/  ← EF Core, BCrypt, JWT
│   ├── EBookLibrary.WebApi/          ← ASP.NET Core 10 controllers
│   ├── EBookLibrary.React/           ← Vite + React 18 + TypeScript
│   └── EBookLibrary.Blazor/          ← Blazor WebAssembly
├── tests/
│   ├── EBookLibrary.Domain.Tests/
│   ├── EBookLibrary.Application.Tests/
│   ├── EBookLibrary.WebApi.Tests/
│   └── EBookLibrary.E2E.Tests/       ← Playwright browser tests
└── scripts/
    └── EBookLibrary.Seeder/          ← data seeding console application
```

Two observations are worth making before you scroll past:

- The two frontends live alongside the backend in `src/`. They are full
  members of the solution, not sub-modules.
- There are *four* test projects, one per backend layer plus an E2E
  project. The split mirrors the dependency graph: Domain tests have
  no infrastructure, WebApi tests use `WebApplicationFactory`, and the
  E2E project uses Playwright to drive a real browser.

---

## 2.4 CQRS — separating reads from writes

CQRS — Command Query Responsibility Segregation — is the second
architectural choice that pervades the project. It is independent of
Clean Architecture (you can have one without the other) but the two
combine well.

The idea is simple: **write operations and read operations are
different enough that they should not share a class.** A write changes
state, returns a result that confirms the change, and is usually invoked
once per user action. A read does not change state, returns data
suitable for rendering, and may be invoked many times per page.

> **Foundations:** A *handler* in MediatR is a class with a single
> method, conventionally named `Handle`, that takes one *request*
> object as its argument and returns one response. The handler is
> instantiated by the dependency-injection container; the request
> object is a plain C# class with no behavior. The mediator looks up
> the handler for a given request type and invokes it. That is the
> entire library.

### The shape of a CQRS handler

In this project, every API operation is exactly one of:

- A **command** (writes) — `RegisterUserCommand`, `LoginUserCommand`,
  `CreateBookCommand`, `UpdateBookCommand`, `DeleteBookCommand`,
  `DownloadBookCommand`, `UploadBookFileCommand`.
- A **query** (reads) — `SearchBooksQuery`, `GetBookByIdQuery`,
  `GetAuthorByIdQuery`, `GetUsersPagedQuery`, …

Each one has exactly one handler class. Listing 2.2 sketches the
shape; Chapter 5 walks the implementation in detail.

**Listing 2.2 — Shape of a typical command handler.**

```csharp
public sealed class CreateBookCommand : IRequest<Guid>
{
    public string Title { get; init; } = "";
    public Guid[] AuthorIds { get; init; } = Array.Empty<Guid>();
    public Guid[] GenreIds  { get; init; } = Array.Empty<Guid>();
}

public sealed class CreateBookCommandHandler
    : IRequestHandler<CreateBookCommand, Guid>
{
    private readonly IUnitOfWork _uow;

    public CreateBookCommandHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<Guid> Handle(CreateBookCommand cmd, CancellationToken ct)
    {
        var book = Book.Create(cmd.Title, BookLanguage.Spanish);
        // (… link authors and genres …)
        await _uow.Books.AddAsync(book, ct);
        await _uow.SaveChangesAsync(ct);
        return book.Id;
    }
}
```

The controller does not have to know any of this. It accepts an HTTP
request, builds the command, and calls `mediator.Send(command)`. That
single line is the boundary between the API and the application.

### The MediatR pipeline

MediatR supports *pipeline behaviors*, which are the CQRS equivalent of
ASP.NET Core middleware: classes that wrap every handler invocation,
running before and after. This project ships two:

- **`LoggingBehavior`** — logs the request type, the user (if any), and
  the elapsed milliseconds.
- **`ValidationBehavior`** — runs the FluentValidation validator
  registered for the request type and throws a `ValidationException` if
  the request is invalid, before the handler ever runs.

Cross-cutting concerns therefore live in *one place each*, not in
every handler.

> **In Practice:** The same engineering instinct that suggests adding a
> behavior for "auditing" or "authorization" is correct, up to a point.
> Past three or four behaviors the pipeline becomes a place where
> behavior hides. The project deliberately keeps it short.

---

## 2.5 The C4 model

The diagrams in this book follow Simon Brown's **C4 model**, which
describes a software system at four levels of abstraction. Think of it
as Google Maps for architecture: each level zooms in.

### Level 1 — System Context

*Who uses the system, and what external systems does it talk to?*

![Figure 2.3 — System Context diagram.](figures/01-c4-system-context.jpg)

### Level 2 — Container

*What deployable units make up the system?* This is the diagram you
already saw in § 1.4 (Figure 1.1). It is reproduced here at full size
because it is the diagram you will refer back to most often.

![Figure 2.4 — Container diagram (re-shown from Chapter 1).](figures/02-c4-container.jpg)

### Level 3 — Component (Web API)

*What components live inside the Web API container?*

![Figure 2.5 — Component diagram of the Web API.](figures/03-c4-component-api.jpg)

### Level 4 — Code (Domain)

*What classes live inside the Domain layer?* Notice that this diagram
shows only `BaseEntity`, the core entities, and the join entities.
Value objects and domain events are introduced where they are first
used.

![Figure 2.6 — Class diagram of the Domain layer.](figures/04-c4-code-domain.jpg)

> **Foundations:** You do not need to memorize the C4 levels. What you
> need is the habit of asking, when reviewing or producing a diagram,
> *"at what level of zoom is this?"* Most of the unhelpful diagrams in
> production codebases mix levels: a single picture showing both
> deployable units and individual class methods. Pick a level and stay
> there.

---

## 2.6 Six architectural decisions

The remainder of this chapter names the six architectural decisions that
shape this codebase. Each one names the choice, the alternative that
was considered, and the rationale. Architecture Decision Records for
each appear in Appendix C; this section is the one-paragraph summary.

### Decision 1 — Controller-based API, not Minimal APIs

ASP.NET Core 10 supports two ways of declaring endpoints: classic MVC
controllers and the newer *Minimal APIs* (top-level endpoint maps in
`Program.cs`). The project uses controllers. Minimal APIs are excellent
for small, focused services with a handful of endpoints. With eight
controllers, role-based authorization, and attribute-based OpenAPI
metadata, classic controllers carry their weight.

### Decision 2 — Soft delete, not hard delete

Every entity inherits from `BaseEntity`, which carries an `IsDeleted`
flag and a `DeletedAt` timestamp. EF Core *global query filters*
automatically add `WHERE IsDeleted = 0` to every read. The alternative —
removing rows entirely — was rejected because users may have downloaded
a book that an administrator later "deletes", and the foreign-key chain
would break. Soft delete preserves referential integrity without
exposing deleted rows to normal queries.

### Decision 3 — Repository + Unit of Work over direct `DbContext`

Application handlers depend on `IUnitOfWork`, which exposes one
repository property per entity and one `SaveChangesAsync()` method.
The alternative — injecting `AppDbContext` directly — would have
coupled the Application layer to EF Core. The cost of the abstraction
is a few additional interface declarations; the benefit is that
Application can be unit-tested with hand-built fakes or Moq.

### Decision 4 — Stateless JWT, no refresh tokens in v1

JWT tokens issued at login expire after sixty minutes. There is no
refresh-token mechanism. The alternative — refresh tokens, typically
backed by Redis or a database table — was rejected as out of scope for
v1. It is the most natural Chapter 8 follow-on exercise (Appendix B,
exercise 8.H).

### Decision 5 — JWT in `localStorage`, not httpOnly cookies

The React and Blazor frontends store the JWT in browser
`localStorage`. The alternative — httpOnly cookies — is more secure
against XSS but requires CSRF protection and complicates the
cross-origin request flow during local development. The trade-off is
documented in code; § 8.6 spells it out.

> **Pitfall:** Do not adopt the `localStorage` pattern in a
> public-facing production application without first evaluating the XSS
> exposure of your codebase. The right answer for production is almost
> always httpOnly cookies. The codebase chooses `localStorage` because
> it is a learning project, not because it is the right default.

### Decision 6 — Database-agnostic by construction

Only one file in the entire codebase mentions SQL Server:
`Infrastructure/DependencyInjection.cs`, where
`UseSqlServer(connectionString)` is registered. Switching to PostgreSQL
is one line: `UseNpgsql(connectionString)`. This is not a value
judgment about either database; it is a side effect of putting all
infrastructure decisions in one place.

---

## 2.7 The end-to-end request flow

To make the architecture tangible before Chapter 3 begins, Figure 2.7
traces a single request — `GET /api/books/search?title=cervantes` —
through every layer.

![Figure 2.7 — End-to-end sequence for a book search.](figures/08-seq-book-search.jpg)

Notice that no single layer in the diagram has more than one job: the
controller maps HTTP to a query, the mediator dispatches it, the
validation behavior validates it, the handler orchestrates it, the
repository queries through EF Core, EF Core compiles to SQL, SQL Server
returns rows, and the response unwinds back through the same path. If
any one of these steps becomes inaccurate over time, you change exactly
one file.

---

## 2.8 Checkpoint

You are ready for Chapter 3 when you can:

- [ ] Explain why the Domain layer has zero NuGet dependencies, in one
      sentence, without consulting the book.
- [ ] State the dependency rule and name which layers may reference
      which.
- [ ] Describe what CQRS is and why it improves testability over a
      thicker service layer.
- [ ] Read Figure 2.7 from top to bottom and name what each layer does.
- [ ] Name the six architectural decisions in § 2.6 and the alternative
      considered for each.

---

## Key takeaways

- Clean Architecture inverts dependencies so that business rules sit at
  the center and infrastructure sits at the edges. The dependency rule
  is enforced by `.csproj` references, not convention.
- CQRS, implemented via MediatR, separates write operations from read
  operations into one handler per operation. Each handler is trivial to
  unit test.
- The C4 model gives you four levels of zoom (Context, Container,
  Component, Code) and a habit of asking "at what level is this
  diagram?".
- Six architectural decisions in this codebase have alternatives that
  would also have been correct in different circumstances. Knowing the
  alternatives is what distinguishes "doing Clean Architecture" from
  "having read about Clean Architecture".

---

## Exercises

**Easy.** For each layer in Table 2.1, name one NuGet package that
*should not* appear in that layer's `.csproj`. Verify your answers
against the actual `.csproj` files in `Automatic/EBookLibrary/src/`.

**Medium.** Pick one of the six decisions in § 2.6 and write a
counter-argument: what circumstances would make the *opposite* choice
correct? (For example, when *would* refresh tokens be the right answer?
When *would* hard delete be safer than soft?) The exercise trains the
muscle of holding both sides of an architectural decision in your head.

**Hard.** Re-draw Figure 2.1 from memory after closing the book. Then
re-draw Figure 2.7 from memory. Compare your two drawings to the
originals. The places where you got the diagram wrong are the places
the architecture is not yet intuitive — re-read the corresponding
section.

---

## Further reading

- Robert C. Martin, *Clean Architecture* — Chapters 22 (The Clean
  Architecture) and 32 (The Dependency Rule).
- Alistair Cockburn, *"Hexagonal Architecture"* (2005). The original
  port-and-adapter formulation. <https://alistair.cockburn.us/hexagonal-architecture/>
- Jeffrey Palermo, *"The Onion Architecture"* (2008).
- Jimmy Bogard, *"Vertical Slice Architecture"*. The strongest
  alternative to Clean Architecture for application code.
- Simon Brown, *Software Architecture for Developers, Vol. 2* — the C4
  model in book form. The free version of the model lives at
  <https://c4model.com>.
- Greg Young, *"CQRS Documents by Greg Young"* — the original CQRS
  long-form essay.
