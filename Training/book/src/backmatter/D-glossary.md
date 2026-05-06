# Appendix D — Glossary

Definitions are scoped to how the term is used in this book; many
have broader meanings in the wider field.

**Aggregate.** A cluster of domain objects treated as a single unit
for data changes. Each aggregate has one *root* entity through which
all access flows. Example: `Book` is the root of an aggregate that
includes its `BookAuthor` and `BookGenre` join entries.

**Aggregate root.** The entity that owns an aggregate. Repositories
are scoped per aggregate root, not per entity.

**ADR (Architecture Decision Record).** A short document recording
the context, decision, and consequences of a non-obvious
architectural choice. See Appendix C.

**Application Layer.** The Clean Architecture layer that orchestrates
domain operations into use cases. Contains commands, queries,
handlers, and validators.

**Authorization vs. Authentication.** *Authentication* answers "who
are you?". *Authorization* answers "are you allowed?". The middleware
order matters (§ 7.5).

**bUnit.** A unit-testing library for Blazor components.

**BCrypt.** A deliberately-slow password hashing algorithm with a
configurable *work factor* (cost). The project uses cost 12.

**Behavior (MediatR pipeline).** A class implementing
`IPipelineBehavior<TRequest,TResponse>` that wraps every handler
invocation. Used for cross-cutting concerns like validation and
logging.

**Clean Architecture.** A layered architecture in which the
dependency direction always points *inward* — outer layers know inner
layers, never the reverse. Coined by Robert C. Martin.

**Command (CQRS).** A request that *changes* state. Returns
acknowledgment, not domain data.

**CORS.** Cross-Origin Resource Sharing — the browser mechanism
that allows or blocks cross-origin HTTP calls. Configured in
`Program.cs` (§ 7.6).

**Correlation ID.** A unique identifier stamped on every log entry
of a single request, used to reconstruct an end-to-end trace.

**CQRS (Command Query Responsibility Segregation).** Separating
write operations (commands) from read operations (queries) into
distinct types and handlers.

**`DbContext`.** EF Core's central abstraction over a database
connection, transaction, and identity map.

**Dependency Inversion.** The principle that high-level modules
should not depend on low-level modules; both should depend on
abstractions.

**Dependency Injection.** The pattern of providing a class's
dependencies through constructor parameters rather than constructing
them internally.

**DTO (Data Transfer Object).** A flat object carrying data across
process boundaries (typically HTTP). Distinct from a Domain entity,
which has behavior and invariants.

**Domain Event.** A record that something significant has happened
in the domain (e.g., `BookPublishedEvent`). Raised by aggregates,
dispatched by Infrastructure to subscribers.

**Domain Layer.** The innermost Clean Architecture layer. Contains
entities, value objects, domain events, and domain exceptions. Has
no dependencies on any other project.

**E2E (End-to-End) test.** A test that drives the application
through its outermost interface (typically a real browser) against a
real backend.

**Entity.** A domain object with an identity that persists across
state changes. `Book` is an entity; two books with identical titles
are different books.

**FluentValidation.** A .NET library for declarative validation with
an expressive fluent API.

**Generic Repository.** A repository providing the basic
`GetById/GetAll/Add/Update/Remove` for any aggregate root.
Specific repositories extend it with operation-specific methods.

**Global Query Filter (EF Core).** A `WHERE` clause applied
automatically to every query against an entity. The project uses
them to implement soft delete (§ 6.2).

**Handler (MediatR).** A class that handles one request type. Single
public method, single responsibility.

**Health Check.** An endpoint that reports whether the service is
healthy. *Liveness* and *readiness* are two distinct flavors
(§ 15.3).

**HMAC-SHA256.** The symmetric signing algorithm used by the
project's JWTs. The same secret signs and verifies.

**IConfiguration.** ASP.NET Core's abstraction over configuration
sources (JSON files, environment variables, user secrets).

**Infrastructure Layer.** The Clean Architecture layer that
implements the interfaces declared by Application using concrete
frameworks (EF Core, BCrypt, JWT, file system).

**Invariant.** A rule that must always be true of an aggregate.
Enforced by the entity's methods, never by external code.

**JSON Web Token (JWT).** A self-describing, signed token carrying
claims about the user. Three Base64-encoded segments: header,
payload, signature.

**Liveness probe.** A check that asks "is the process alive?". A
failure typically restarts the process.

**MediatR.** A .NET library implementing the in-process Mediator
pattern. The project uses it for CQRS.

**Middleware.** ASP.NET Core's term for a request-pipeline
component. Order matters (§ 7.5).

**Migration (EF Core).** A versioned C# class describing a schema
change. Generated with `dotnet ef migrations add <Name>` and
applied with `dotnet ef database update`.

**Model snapshot.** EF Core's record of the cumulative model after
all migrations. Used to compute the next migration's diff. A
frequent merge-conflict victim.

**Moq.** A .NET mocking library used to build test doubles for
interfaces.

**MudBlazor.** A Material-Design component library for Blazor.

**N+1 query.** A query pattern where an outer query returns N rows
and the application then issues one additional query per row. The
performance footgun the EF Core `Include` is designed to prevent.

**OpenAPI.** An open specification (formerly *Swagger*) for
describing HTTP APIs. The project publishes OpenAPI 3.1 and renders
it with Scalar.

**Page Object Model.** An E2E pattern that encapsulates the
operations offered by a page in a class. The page object owns the
selectors; the test asks the page object to act.

**Pipeline behavior (MediatR).** See *Behavior*.

**Playwright.** Microsoft's cross-browser automation library. The
project uses Playwright for .NET.

**Query (CQRS).** A request that returns data without changing
state.

**Razor.** The .NET templating syntax that interleaves C# with HTML.
Used by Blazor.

**Readiness probe.** A check that asks "is the process ready to
serve traffic?". A failure removes the instance from the
load-balancer rotation but does not restart it.

**Repository.** An abstraction over the persistence of an aggregate.
The project uses one repository per aggregate root.

**`Result<T>`.** The discriminated-union-style envelope returned by
every Application handler. Carries either success + value, or
failure + errors.

**Scalar.** An OpenAPI documentation UI used by the project in
place of Swagger UI.

**Soft delete.** Marking a row as deleted (`IsDeleted = true`)
rather than removing it from the database. Filtered out of normal
queries by a global query filter.

**Specification (pattern).** A reusable query object representing a
business condition. The project does not currently use the pattern;
exercise B.4-Hard hints at it.

**Tagged Union.** A type that can be one of several variants. The
`Result<T>` envelope is a tagged union of "success with value" and
"failure with errors".

**TanStack Query.** The React server-state library used by the
project for caching, background refresh, and optimistic updates.

**Testcontainers.** A library for spinning up real services
(databases, message brokers) in Docker for integration and E2E
tests.

**Tracing.** Recording the path of a request through the system as
a series of timed *spans*. Playwright's *Trace Viewer* visualizes
these for browser tests.

**Unit of Work.** A pattern that coordinates multiple repository
operations into a single transaction. The project's `IUnitOfWork`
exposes one repository property per aggregate plus
`SaveChangesAsync`.

**User-secrets.** A .NET tool that stores per-developer secrets
outside source control, available at development time via
`IConfiguration`.

**Value Object.** A domain object with no identity, defined entirely
by its values. Two value objects with equal values are equal.

**Vite.** The build tool used by the React frontend. Provides
near-instant hot module replacement.

**WebApplicationFactory.** ASP.NET Core's in-memory test server,
used for integration tests against the assembled middleware
pipeline.

**WebAssembly (Wasm).** A binary instruction format that runs in
the browser. Blazor WebAssembly compiles .NET IL to Wasm so that C#
runs client-side.

**Zustand.** The React state-management library used by the project
for client state (auth, notifications).
