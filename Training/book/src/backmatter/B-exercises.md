# Appendix B — Exercises with Solution Sketches

Each chapter ends with three exercises: *Easy*, *Medium*, and *Hard*.
This appendix provides solution sketches — not full code, but the
shape and the gotchas — so an instructor can validate a student's
answer or a self-learner can check their thinking.

Solutions reference the section the exercise came from.

---

## B.1 Chapter 1 — Introduction

**Easy.** Diagram the system in your own words.
*Sketch.* Three boxes (React, Blazor, API) over one cylinder
(SQL Server) over one folder (file storage). Arrows from frontends
through HTTPS to API; API to DB and to file storage.

**Medium.** Pick another familiar app and identify its layers.
*Sketch.* For most CRUD apps: a UI layer, a controller/handler tier,
a domain (often anemic in legacy systems), an ORM/repository, and a
DB. The exercise's value is finding the *missing* layer — usually a
real Domain.

**Hard.** Make the case for a *single* frontend on this project.
*Sketch.* Argument: less duplicated effort; one design system; one
release cadence. Counter-argument: the two-frontend setup is the
cleanest evidence the backend is frontend-agnostic. Both are
defensible; the answer depends on team staffing.

---

## B.2 Chapter 2 — Architecture Deep Dive

**Easy.** Identify the layer of `JwtTokenService`.
*Solution.* Infrastructure. It depends on a JWT library and produces
a string token; Application defines the *interface*
(`IJwtTokenService`) but never the implementation.

**Medium.** Find one place in the project where the dependency rule
is *almost* violated and explain how it is preserved.
*Solution.* `LoginUserCommandHandler` (Application) calls
`IJwtTokenService.GenerateToken(user)`. The handler depends on the
*interface*, declared in Application; the *implementation* lives in
Infrastructure. The rule is preserved by the interface seam.

**Hard.** Refactor to put authentication into its own bounded
context.
*Sketch.* Introduce an `IAuthenticationContext` aggregating user,
token service, hash service. Move `RegisterUser` and `LoginUser` into
a `Authentication.Application` project. Result: the Catalog context
no longer knows about user passwords. Trade-off: more projects, more
DI ceremony, a small cross-context event bus.

---

## B.3 Chapter 3 — Solution Setup

**Easy.** Add a new class library project to the solution.
*Solution.* `dotnet new classlib -n EBookLibrary.SharedKernel -o src/EBookLibrary.SharedKernel`,
then `dotnet sln add ./src/EBookLibrary.SharedKernel/`.

**Medium.** Add a `Directory.Build.props` rule that fails the build
on warnings as errors for `Application` only.
*Solution.* A second `Directory.Build.props` in
`src/EBookLibrary.Application/` setting `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`.
Files in subdirectories inherit the closest `Directory.Build.props`.

**Hard.** Set up a CI pipeline (GitHub Actions or Azure DevOps) that
runs `dotnet build`, `dotnet test`, and uploads coverage on every PR.
*Sketch.* GitHub Actions YAML with a `dotnet/setup-action`, then
`dotnet restore`, `dotnet build --no-restore`,
`dotnet test --no-build --collect:"XPlat Code Coverage"`, then a
`codecov/codecov-action`. Cache `~/.nuget/packages` to keep CI under
two minutes.

---

## B.4 Chapter 4 — Domain Layer

**Easy.** Add a `Publisher` aggregate.
*Sketch.* `Publisher : BaseEntity` with `Name`, `Country`,
`FoundedYear`. Static `Create(...)` factory validating non-empty
name. No relationships yet.

**Medium.** Add a domain rule "books cannot be published unless they
have at least one author".
*Sketch.* Modify `Book.Publish()` to throw if `BookAuthors.Count == 0`.
Add a unit test (`Publish_without_authors_throws`).

**Hard.** Replace `BookLanguage` enum with a `LanguageCode` value
object.
*Sketch.* `LanguageCode` is an immutable record validating an
ISO 639-1 two-letter code. Replace the `Language` property's type
on `Book`. Add an EF Core value converter (`HasConversion(...)`) so
the column stays `nvarchar(2)`. Migration is a no-op if the column
type doesn't change.

---

## B.5 Chapter 5 — Application Layer

**Easy.** Add a `GetBookByIdQuery`.
*Sketch.* Record `GetBookByIdQuery(Guid Id) : IRequest<Result<BookDto>>`.
Handler reads via `IBookRepository.GetByIdAsync(id)`, maps to DTO,
returns `Result.Success(dto)` or `Result.Failure("Not found")`.

**Medium.** Add a FluentValidation rule that ISBN, when present,
matches the ISBN-13 format.
*Sketch.* In `CreateBookCommandValidator`:
`RuleFor(x => x.Isbn).Matches(@"^\d{3}-\d-\d{6}-\d{2}-\d$").When(x => !string.IsNullOrEmpty(x.Isbn));`.

**Hard.** Add a `LoggingBehavior<TRequest,TResponse>` to the MediatR
pipeline.
*Sketch.* Implement `IPipelineBehavior<,>`, log "handling X" before
`next()`, log "handled X in Nms" after, register *before* the
validation behavior so logging captures the validation step too.

---

## B.6 Chapter 6 — Infrastructure Layer

**Easy.** Add `IPublisherRepository` and EF configuration.
*Sketch.* Interface in Application; implementation extends
`GenericRepository<Publisher>`; `PublisherConfiguration` sets
`Name HasMaxLength(200)` and an index. Register in
`AddInfrastructure()`.

**Medium.** Replace `LocalFileStorage` with `AzureBlobFileStorage`.
*Sketch.* `IAzureBlobOptions` with container name and connection
string; constructor obtains a `BlobContainerClient`; `SaveAsync`
uploads with `client.UploadBlobAsync(safeName, stream)`. *No file in
Application or Domain changes* — the litmus test.

**Hard.** Convert `BookRepository.SearchAsync` to a compiled query.
*Sketch.* `EF.CompileAsyncQuery((AppDbContext db, string title) => db.Books.Where(...))` —
note that `IQueryable` chains for paging cannot be inside the
compiled portion. Measure with BenchmarkDotNet; expect a small win
for hot-path scenarios with stable filters.

---

## B.7 Chapter 7 — Web API

**Easy.** Add a `HealthController` with `GET /api/health`.
*Sketch.* The one acceptable controller without MediatR. Return
`new { status = "ok", version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() }`.
Decorate with `[AllowAnonymous]`.

**Medium.** Add `ConcurrencyException` mapping in the exception
middleware.
*Sketch.* Throw the exception from a handler when
`SaveChangesAsync` raises `DbUpdateConcurrencyException`. Map to
`409 Conflict` with the message "The record was modified by another
user. Please reload."

**Hard.** Replace the response envelope with RFC 7807 *Problem
Details*.
*Sketch.* Failures return `{ type, title, status, detail, instance }`
with `Content-Type: application/problem+json`. Successes return raw
DTOs. *Won:* interoperability with HTTP-aware tools. *Lost:* the
uniform shape that simplified frontends. The exercise's value is
articulating the trade-off; either choice is defensible.

---

## B.8 Chapter 8 — Authentication

**Easy.** Decode a real JWT at `jwt.io` and verify the role claim
type is the long Microsoft URL.
*Solution.* Paste the token; in the *Decoded* panel, the role appears
under `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`.
If it appears under `role`, you have the bug from § 8.4.

**Medium.** Implement account lockout.
*Sketch.* Add `FailedLoginAttempts` and `LockoutUntil` columns to
`Users`. In `LoginUserCommandHandler`, increment on failure and
reset on success; if `FailedLoginAttempts >= 5` within 15 min, set
`LockoutUntil = now + 15 min` and return `429`. Reset on successful
login or password reset.

**Hard.** Add refresh tokens.
*Sketch.* New `UserRefreshToken` table with hashed token, expiry,
revoked-at. Login response: `{ accessToken (15 min), refreshToken (7 d) }`.
`POST /api/auth/refresh` validates, *rotates* (issues new
access+refresh, marks old refresh as revoked), and detects re-use of
a revoked token as theft (revoke entire family).

---

## B.9 Chapter 9 — Database & Migrations

**Easy.** Add `IsFeatured bool` non-null with default `false`.
*Sketch.* Modify `Book` and configuration; `dotnet ef migrations add
AddIsFeatured`; verify the generated migration includes
`defaultValue: false` in the `AddColumn` call.

**Medium.** Hand-write the matching `Down()` method.
*Sketch.* `migrationBuilder.DropColumn(name: "IsFeatured", table: "Books");`.
Run `dotnet ef database update <previous>` and verify the column is
gone.

**Hard.** Make the seeder accept JSON in addition to HTML.
*Sketch.* Extract `IBookSource` interface; concrete `HtmlBookSource`
and `JsonBookSource` implementations. The persistence loop in the
seeder takes an `IBookSource` and is unchanged. Unit-test
`JsonBookSource` against a sample stream — no database required.

---

## B.10 Chapter 10 — React

**Easy.** "Remember me" checkbox toggles `localStorage` /
`sessionStorage`.
*Sketch.* Two Zustand stores with different `persist` storage
options, or one store with `storage: rememberMe ? localStorage :
sessionStorage` chosen at create time (requires a small refactor —
build the store *after* knowing the value).

**Medium.** Debounced global search box.
*Sketch.* `const debounced = useDebounce(value, 350);` then
`useQuery({ queryKey: ['search', debounced], enabled: debounced.length >= 2 })`.
Verify in DevTools that no request fires until typing pauses for
350 ms.

**Hard.** Move JWT to httpOnly cookie.
*Sketch.* Backend: `SameSite=Lax; Secure; HttpOnly`. Frontend: drop
`Authorization` header; rely on the browser to send the cookie.
`AllowCredentials()` in CORS already set. Add an anti-CSRF token
issued by the backend and echoed in a header. The auth Zustand store
loses the `token` field — it now only knows `isAuthenticated` (from a
`/api/auth/me` call) and `user`.

---

## B.11 Chapter 11 — Blazor

**Easy.** Snackbar on every successful API mutation.
*Sketch.* Wrap mutations in a method that calls
`Snackbar.Add(message, Severity.Success)` on success and
`Severity.Error` on failure.

**Medium.** Convert one page to code-behind and add a bUnit test.
*Sketch.* Move `@code` block to `Page.razor.cs` partial class. bUnit
test renders the component with mocked services and asserts on the
DOM.

**Hard.** Switch one page to Interactive Auto.
*Sketch.* Annotate the page `@rendermode RenderMode.InteractiveAuto`.
First render is server-side over SignalR; the Wasm runtime downloads
in the background; subsequent visits use Wasm. Measure first-paint
in DevTools Performance panel; weigh against the SignalR connection
cost.

---

## B.12 Chapter 12 — Unit Tests

**Easy.** `[Theory]` over five invalid and one valid ISBN.
*Sketch.* `[InlineData("978-1-234567-89-0", true)]`,
`[InlineData("12345", false)]`, etc. Single test method asserts
either no throw (valid) or `DomainValidationException` (invalid).

**Medium.** Test that login returns the *generic* error for both
"no such user" and "wrong password".
*Sketch.* Two tests, both asserting
`result.Errors[0].Should().Be("Invalid email or password.");`. Mock
`UserRepository` to return `null` in one and a valid user with a
non-matching hash in the other.

**Hard.** Replace in-memory DB with Testcontainers SQL Server.
*Sketch.* `MsSqlContainer` from `Testcontainers.MsSql` package;
`OneTimeSetUp` starts the container; `WebApplicationFactory` uses
the container's connection string. Suite duration grows by ~10 s
total but tests now exercise real SQL behavior.

---

## B.13 Chapter 13 — E2E Tests

**Easy.** Replace selectors with `data-testid`.
*Sketch.* Add `data-testid="email"` etc. on form inputs in the
React/Blazor source. Update Page Objects to use
`Page.Locator("[data-testid='email']")`.

**Medium.** New journey: registered reader downloads a book.
*Sketch.* Sign-up with timestamp-suffixed email, login, navigate to
known book. Use `await Page.RunAndWaitForDownloadAsync(async () =>
await Page.ClickAsync("[data-testid='download']"));` then assert
`download.SuggestedFilename` matches.

**Hard.** Parameterize base URL across React and Blazor.
*Sketch.* Read `BASE_URL` env var; `[TestFixture(Source = nameof(Frontends))]`
where `Frontends` returns `["http://localhost:5173", "https://localhost:7278"]`.
`data-testid` selectors are portable; assertions on raw markup are
not.

---

## B.14 Chapter 14 — AI-Assisted Development

**Easy.** "Explain back" exercise.
*Sketch.* Pick a method; ask "walk me through what this code does
line by line, and identify any edge cases that would break it".
Compare with reality. Note discrepancies.

**Medium.** Prompt-pattern A/B comparison.
*Sketch.* Score each output for convention adherence (1–5), defect
count (0–N), and time-to-correct. Expected: the *Role + Context +
Constraints + Example* output scores higher on adherence and
requires fewer corrections.

**Hard.** Build a team prompt library.
*Sketch.* `docs/prompts/new-handler.md`, `new-endpoint.md`,
`new-test.md`, `refactor.md`, `code-review.md`. Each is a fillable
template. The discussion answer: prompts as versioned artifacts mean
the team's idioms are *taught* to the model on every interaction
without human re-explaining.

---

## B.15 Chapter 15 — Deployment & Operations

**Easy.** `/health/ready` returns 503 when DB is stopped; live stays
200.
*Sketch.* Stop SQL Server; `curl /health/live` → 200; `curl /health/ready`
→ 503 with the failing check name in the body.

**Medium.** Serilog → Seq with correlation ids.
*Sketch.* `docker run -p 5341:80 datalust/seq`. Configure Serilog
sink. Add the correlation-id middleware. Hit an endpoint;
`X-Correlation-Id` header in response matches the property visible
in the Seq UI for every log line of that request.

**Hard.** Runbook for "API 5xx > 1% over 5 minutes".
*Sketch.* Sections: dashboard links, top-five-suspect causes
(deploy, DB, dependency outage, cert expiry, rate-limit
misconfig), `kubectl logs --since=10m -l app=ebook-api --all-containers`,
rollback (`kubectl rollout undo`), post-mortem template (timeline,
root cause, action items). Walk a teammate through it cold.
