# Appendix F — Index

Page numbers refer to chapter sections (e.g., "§ 6.4" means
Chapter 6, section 4). Words in *italics* indicate the primary
treatment of the term.

---

## A

- **ADR (Architecture Decision Record)** — Appendix C *passim*; § 14.4
- **Admin user** seed — *§ 9.6*
- **Aggregate** — § 4.5; *Glossary*
- **Aggregate root** — § 4.5; § 6.5
- **`AllowAnonymous`** — § 8.5
- **`ApiResponse<T>`** — *§ 7.2*; A.8
- **Application Layer** — Chapter 5; § 2.3
- **Argon2id** — § 8.3 *(Architect's Note)*
- **Authentication** — Chapter 8; § 7.5
  - middleware order — *§ 7.5*
  - JWT — § 6.7; *§ 8.1*
  - vs. authorization — § 7.5; § 8.5
- **Authorization** — § 8.5
  - attributes — *§ 8.5*
  - role-based — § 8.4
- **Auto-waiting (Playwright)** — § 13.3; § 13.8
- **Axios interceptors** — *§ 10.2*

## B

- **Backups** — *§ 15.8*
- **Base URL (frontend)** — § 11.7; § 13.10
- **`BaseEntity`** — § 4.3
- **BCrypt** — § 6.7; *§ 8.3*; ADR-006
- **Blazor** — Chapter 11
  - render modes — *§ 11.2*
  - WebAssembly — § 11.2
  - vs. React — *§ 11.9*
- **`Book` aggregate** — § 4.5
- **bUnit** — § 11.5; § 12.2; *Glossary*

## C

- **Caching (TanStack Query)** — *§ 10.4*
- **Checkpoint** sidebar — used at end of every chapter
- **Claims** — § 6.7; § 8.1; § 8.4
- **`ClaimTypes.Role`** — *§ 6.7*; *§ 8.4*; § 12.5; ADR-005
- **Clean Architecture** — Chapter 2; ADR-001
- **Coverage (test)** — *§ 12.7*
- **CORS** — *§ 7.6*
  - and authentication order — § 7.5
  - `AllowCredentials` pitfall — § 7.6
- **Correlation ID** — *§ 15.6*
- **CQRS** — Chapter 5; ADR-002
- **`CurrentUserService`** — § 6.7

## D

- **Database**
  - migrations — Chapter 9
  - schema — *§ 9.4*
  - seeding — *§ 9.5*
  - verification queries — § 9.9
- **Deployment** — Chapter 15
- **Disaster recovery** — *§ 15.8*
- **`DbContext`** — *§ 6.2*
- **Dependency Injection** — § 6.1; § 6.10
- **Dependency rule** — § 2.2; ADR-001
- **Docker** — *§ 15.4*
- **Domain Events** — § 4.6
- **Domain Layer** — Chapter 4; § 2.3
- **`DomainValidationException`** — § 4.4
- **DTO (Data Transfer Object)** — § 5.6; *Glossary*

## E

- **EF Core** — Chapter 6; ADR-004
  - global query filters — *§ 6.2*
  - migrations — Chapter 9
  - in-memory provider — § 12.5 *(Pitfall)*
- **End-to-end (E2E) tests** — Chapter 13
- **Enums as strings** — *§ 6.4*
- **Envelope (response)** — *§ 7.2*
- **Exception middleware** — *§ 7.4*

## F

- **File storage** — *§ 6.9*; § 15.10
- **Five-minute test** — § 1.6
- **Fluent API (EF Core)** — § 6.3
- **FluentValidation** — *§ 5.3*
- **Frontend** — see *React*, *Blazor*

## G

- **Generic repository** — *§ 6.5*
- **Global query filter** — *§ 6.2*
- **Glossary** — Appendix D
- **Golden signals (SRE)** — *§ 15.7*

## H

- **Handler (MediatR)** — *§ 5.4*
- **Health checks** — *§ 15.3*
  - liveness vs readiness — § 15.3
- **HTTPS** — § 7.5; § 15.1
- **`HttpClient`** (Blazor) — *§ 11.7*

## I

- **`IConfiguration`** — § 9.1; § 15.2
- **`Include` (EF Core)** — § 6.5
- **Index** — Appendix F (this appendix)
- **Infrastructure Layer** — Chapter 6
- **Integration tests** — *§ 12.5*
- **Invariant** — § 4.4
- **`IPipelineBehavior`** — § 5.5
- **`IUnitOfWork`** — *§ 6.6*

## J

- **JWT (JSON Web Token)** — *§ 8.1*; ADR-005
  - claims — § 6.7; § 8.4
  - signing — § 6.7; § 7.6
  - storage exposure — *§ 8.6*; ADR-011

## L

- **Layered architecture** — Chapter 2
- **Listing** numbering convention — Preface
- **Liveness probe** — § 15.3
- **Local file storage** — § 6.9
- **`localStorage`** — *§ 8.6*; § 10.3; ADR-011
- **Logging (Serilog)** — *§ 15.6*
- **Login flow** — § 5.4 (backend); § 10.5 (React); § 11.5 (Blazor)

## M

- **MediatR** — Chapter 5; ADR-002
  - pipeline behavior — *§ 5.5*
- **Middleware** — § 7.4; § 7.5
  - exception — *§ 7.4*
  - ordering — *§ 7.5*
- **Migration (EF Core)** — Chapter 9
  - model snapshot — § 9.2 *(Pitfall)*
- **Moq** — § 12.2; § 12.4
- **MudBlazor** — *§ 11.4*; ADR-012
- **`MultipleActiveResultSets`** — § 9.1 *(Pitfall)*

## N

- **N+1 query** — § 6.5 *(In Practice)*
- **Non-root container user** — § 15.4

## O

- **Observability** — *§ 15.7*
- **OpenAPI** — § 7.8; ADR-008
- **Optimistic update** — *§ 10.4*
- **OWASP** — § 6.9; § 8.3; § 8.7

## P

- **Page Object Model** — *§ 13.4*
- **Paging** — § 6.5; A.2
- **Path traversal** — § 6.9 *(Pitfall)*
- **Password hashing** — § 6.7; § 8.3
- **Pipeline behavior (MediatR)** — *§ 5.5*
- **Playwright** — Chapter 13; ADR-009
- **Pre-flight checklist** — *§ 15.1*
- **Problem Details (RFC 7807)** — § 7.9 (Hard exercise)
- **Production-readiness** — Chapter 15

## Q

- **Query (CQRS)** — Chapter 5
- **Query filter (global)** — *§ 6.2*

## R

- **Rate limiting** — § 7.5; § 8.7
- **React** — Chapter 10
  - vs. Blazor — *§ 11.9*
- **Readiness probe** — § 15.3
- **Refresh tokens** — § 8.7 (Hard exercise); ADR-005
- **Repository** — § 6.5; § 6.6
- **`Result<T>`** — *§ 5.4*; ADR-003
- **Role claim** — *§ 6.7*; *§ 8.4*
- **Runbook** — *§ 15.9*

## S

- **Scalar (OpenAPI UI)** — § 7.8; ADR-008
- **Search (book)** — *§ 6.5*; A.2
- **Secrets management** — *§ 15.5*
- **Seeding (database)** — *§ 9.5*
- **Serilog** — *§ 15.6*
- **`SignInAsync`** — § 13.4
- **Soft delete** — *§ 6.2*
- **Solution structure** — Chapter 3
- **Specifications** — Appendix E
- **SQL Server** — § 6.10; § 9.1
- **Stale-while-revalidate** — § 10.4
- **Static SSR (Blazor)** — § 11.2

## T

- **TanStack Query** — *§ 10.4*
- **Testcontainers** — § 13.6; § 12.5
- **Testing pyramid** — *§ 12.1*
- **Trace Viewer (Playwright)** — *§ 13.7*
- **Two-pass seeder** — § 9.5
- **TypeScript** — § 10.1; § 10.2

## U

- **Unit of Work** — *§ 6.6*
- **Unit tests** — Chapter 12
- **User-secrets** — § 9.1; § 15.2; § 15.5

## V

- **Validation** — *§ 5.3*
- **Value object** — § 4.7
- **Vite** — § 10.1; § 10.9

## W

- **WebApi project** — Chapter 7
- **`WebApplicationFactory`** — *§ 12.5*
- **WebAssembly (Blazor)** — § 11.2
- **Work factor (BCrypt)** — *§ 8.3*

## X

- **XSS (Cross-Site Scripting)** — *§ 8.6*
- **xUnit** — § 12.2

## Z

- **Zustand** — *§ 10.3*; ADR-010
