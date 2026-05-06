# Appendix C — Architecture Decision Records

This appendix collects the major architecture decisions made during
the project. Each ADR follows the lightweight "context / decision /
consequences" template. The decisions are *not* presented as
universally right — they are right *for this project's constraints*,
and the consequences section calls out the costs.

---

## ADR-001 — Adopt Clean Architecture

**Status.** Accepted.

**Context.** The project must serve two frontends (React and Blazor),
must remain teachable as a reference for junior-to-lead engineers,
and must be replaceable in any one infrastructure choice (database,
file storage, auth provider) without rewriting business logic.

**Decision.** Adopt Clean Architecture with four projects: Domain,
Application, Infrastructure, WebApi. The dependency rule is
absolute — inner layers know nothing of outer layers.

**Consequences.**
- (+) Business logic is independently testable and infrastructure-free.
- (+) Adding a third frontend or swapping the database is a localized
  change.
- (–) More projects than a "single Web API project" alternative.
  Increases solution cognitive load slightly.
- (–) Engineers new to the pattern need a chapter of orientation
  (Chapter 2).

---

## ADR-002 — MediatR for CQRS

**Status.** Accepted.

**Context.** Application logic should be testable as small units;
controllers should be dispatchers, not orchestrators; the same
pattern should serve commands (writes) and queries (reads).

**Decision.** Every Application use case is a `IRequest<Result<T>>`
implementation handled by an `IRequestHandler`. Controllers receive
`ISender` and call `Sender.Send(...)`.

**Consequences.**
- (+) Each handler is a single class, single responsibility, single
  unit test.
- (+) Cross-cutting behaviors (logging, validation, auth checks)
  attach as `IPipelineBehavior` once and apply everywhere.
- (–) An additional library dependency.
- (–) Some teams call this "indirection without value" — the
  argument has merit when controllers are thin already. The
  pipeline behaviors are the deciding factor.

---

## ADR-003 — `Result<T>` instead of exceptions for business failures

**Status.** Accepted.

**Context.** "User not found", "ISBN already exists", "validation
failed" are *expected* outcomes, not exceptional ones. Throwing
exceptions for them obscures intent, slows the happy path, and
forces the controller to translate exception types into status
codes.

**Decision.** Handlers return `Result<T>` with `IsSuccess`,
`Value`, and `Errors`. Controllers map results to status codes
explicitly. Exceptions are reserved for genuinely exceptional
situations (DB connection lost, OOM, programmer errors).

**Consequences.**
- (+) Happy path is fast; failure path is explicit.
- (+) Control flow visible in handler code.
- (–) Boilerplate around `Result.Success/Failure` construction.
- (–) Mixing `Result<T>` with libraries that throw exceptions
  (e.g., EF Core) requires translation in Infrastructure.

---

## ADR-004 — EF Core over Dapper

**Status.** Accepted.

**Context.** The project's domain is moderately complex (joins,
soft delete, navigation properties). The team's seniority spans
junior to lead.

**Decision.** Use EF Core 10 as the primary ORM. Reach for Dapper
only when a measurable performance issue makes the trade worth it.

**Consequences.**
- (+) Migrations, change tracking, navigation properties, and global
  query filters are first-class.
- (+) Approachable for engineers without deep SQL background.
- (–) Surprises around N+1, lazy loading, and AsNoTracking semantics
  require attention.
- (–) Bulk operations beyond ~10K rows need supplementing
  (`EFCore.BulkExtensions` or raw `SqlBulkCopy`).

---

## ADR-005 — JWT (HS256) for authentication

**Status.** Accepted.

**Context.** A small project serving SPAs needs authentication that
is stateless, simple to implement, and well-understood across the
.NET ecosystem.

**Decision.** Use JSON Web Tokens with HMAC-SHA256 signing. Tokens
are 60-minute-lifetime, signed with a 256-bit secret, validated by
the standard `JwtBearer` middleware.

**Consequences.**
- (+) Stateless — no session table, no sticky load balancing.
- (+) Self-describing — claims travel with the token.
- (–) Cannot be revoked before expiry without an external blacklist.
- (–) Stored in `localStorage` in this project — XSS exposure
  documented (§ 8.6); production should consider httpOnly cookies.
- (–) Refresh-token strategy deferred to v2.

---

## ADR-006 — BCrypt with work factor 12

**Status.** Accepted.

**Context.** Password storage must resist offline attacks against a
stolen database.

**Decision.** Use BCrypt with work factor 12 (~250 ms per hash on
modern CPUs).

**Consequences.**
- (+) Mature, widely-supported, well-understood.
- (+) Adequate for the project's threat model.
- (–) Memory-hardness is weaker than Argon2id. New projects with
  GPU-attacker concerns should prefer Argon2id.
- (–) Work factor must be revisited as hardware advances.

---

## ADR-007 — Two frontends (React and Blazor) against one backend

**Status.** Accepted (project-specific; not a general recommendation).

**Context.** The project serves a pedagogical purpose and must
demonstrate that the backend is genuinely frontend-agnostic.

**Decision.** Ship both a React (Vite + TypeScript) SPA and a Blazor
WebAssembly SPA against the same Web API.

**Consequences.**
- (+) Strongest possible evidence of clean layering.
- (+) Engineers learn two stacks and the comparison sharpens
  judgment about both.
- (–) Two frontends, two release cadences, two design systems to
  maintain. *Real* projects should usually pick one.

---

## ADR-008 — Scalar for OpenAPI UI (not Swagger UI)

**Status.** Accepted.

**Context.** The Web API publishes OpenAPI 3.1 (the .NET 10
default). Swagger UI as of this writing does not yet handle 3.1
natively.

**Decision.** Use Scalar (`@scalar/aspnetcore`) at `/scalar/v1` as
the interactive API documentation surface.

**Consequences.**
- (+) Native OpenAPI 3.1 support.
- (+) Modern UI; better default theme.
- (–) Less ubiquitous; some toolchains assume Swagger UI by name.
- (–) Smaller community; fewer Stack Overflow answers.

---

## ADR-009 — Playwright (not Cypress) for E2E

**Status.** Accepted.

**Context.** The project needs end-to-end tests that drive a real
browser, run cross-browser, integrate cleanly into a .NET CI
pipeline, and work for both the React and Blazor frontends.

**Decision.** Use Playwright for .NET, with the NUnit adapter.

**Consequences.**
- (+) First-class .NET API; native cross-browser (Chromium, Firefox,
  WebKit).
- (+) Trace Viewer is the best-in-class debugging artifact.
- (+) Same library serves both frontends.
- (–) Cypress has a larger community and more integrations
  (Percy, Applitools).

---

## ADR-010 — Zustand (not Redux) for React state

**Status.** Accepted.

**Context.** The React app has two pieces of cross-component state
(auth and notifications). Reach-for-Redux would be over-engineering
at this scale.

**Decision.** Use Zustand for client state. Use TanStack Query for
all server state (no client-state mirror of server data).

**Consequences.**
- (+) Tiny library (~1.5 KB), no Provider, no boilerplate.
- (+) Per-slice subscriptions reduce re-renders without `connect`
  ceremony.
- (–) Redux's time-travel debugging and ecosystem of middleware are
  not available.
- (–) "What if state grows" must be answered honestly — at the
  point Zustand strains, switch the affected store, not the whole
  app.

---

## ADR-011 — `localStorage` JWT storage (with documented exposure)

**Status.** Accepted (with caveats).

**Context.** SPAs need somewhere to keep the access token across
page reloads. The two practical options are `localStorage` and
httpOnly cookies. The trade is XSS exposure (localStorage) versus
CSRF exposure (cookies, mitigated with anti-CSRF tokens).

**Decision.** Use `localStorage` for simplicity. Document the XSS
exposure and the mitigations (short token lifetimes, aggressive
escaping, CSP).

**Consequences.**
- (+) Simplest possible auth wiring; no backend cookie domain
  configuration.
- (–) Any XSS bug becomes a token theft. Production deployments
  should reconsider in favor of httpOnly cookies.
- (–) The trade is documented, not avoided. Make the choice
  knowingly.

---

## ADR-012 — MudBlazor for Blazor UI

**Status.** Accepted.

**Context.** The Blazor frontend needs ~70 components (buttons,
forms, dialogs, data grids, snackbars, layout) styled coherently.
Building these from scratch is months of work.

**Decision.** Use MudBlazor as the Blazor component library.

**Consequences.**
- (+) Material Design out of the box; strong documentation.
- (+) Active maintenance; release cadence matches .NET.
- (–) MudBlazor styles can be hard to override when the design needs
  to deviate from Material.
- (–) Vendor lock-in; switching to Radzen or Telerik later would
  touch nearly every page.

---

> Add new ADRs when the project makes a non-obvious decision the
> next maintainer would otherwise have to reverse-engineer.
> The cost of writing a one-page ADR is roughly fifteen minutes.
> The cost of reverse-engineering one is measured in days.
