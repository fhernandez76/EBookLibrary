# Chapter 12 — Unit Tests

> *"A test you trust is worth a hundred tests you fear to run."*

---

## What you will learn

- The unit-testing pyramid as it applies to a Clean Architecture
  project: most tests at the Domain and Application layers, fewer at
  the Web API edge.
- The xUnit + FluentAssertions + Moq triad and the small set of
  conventions that keeps tests readable.
- How to test MediatR handlers without spinning up a database.
- How to test controllers without spinning up the ASP.NET Core
  pipeline.
- How `WebApplicationFactory` enables genuine integration tests when
  the unit-test layer is not enough.
- How to measure coverage and what coverage actually proves.

---

## 12.1 The pyramid, restated

The classical testing pyramid says: many small unit tests, a moderate
number of integration tests, a few end-to-end tests. In a Clean
Architecture project the pyramid maps cleanly onto the layers.

**Table 12.1 — What lives at each tier in this project.**

| Tier              | Project                          | Speed     | Volume target |
|-------------------|----------------------------------|-----------|----------------|
| Domain unit       | `EBookLibrary.Domain.Tests`      | Microseconds | High (every invariant) |
| Application unit  | `EBookLibrary.Application.Tests` | Milliseconds | High (every handler)   |
| Web API integration | `EBookLibrary.WebApi.Tests`    | Tens of ms | Medium (every endpoint shape) |
| End-to-end        | `EBookLibrary.E2E.Tests`         | Seconds   | Low (critical journeys only) |

The Domain tests *never* touch a database, an HTTP client, or a file.
Application tests use Moq for the repository interfaces. Web API
tests use `WebApplicationFactory` with an in-memory or test-container
database. E2E tests (Chapter 13) drive a real browser against a real
backend.

> **Architect's Note:** The pyramid is not religion. Some teams
> invert it ("the testing trophy" — Kent C. Dodds) on the grounds
> that integration tests catch the real bugs. The shape that matters
> for *this* project is "many fast, few slow"; how many of the fast
> ones live in Domain versus Application versus controllers is a
> matter of which layer holds the most consequential logic. In our
> case that is Application.

---

## 12.2 The toolkit

The whole testing stack fits in five NuGet packages:

```xml
<PackageReference Include="xunit" Version="2.9.2" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
<PackageReference Include="FluentAssertions" Version="6.12.2" />
<PackageReference Include="Moq" Version="4.20.72" />
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
```

xUnit is the runner. FluentAssertions makes assertions read like
English. Moq mocks the interfaces your handler depends on. The
ASP.NET Core integration tests add `Microsoft.AspNetCore.Mvc.Testing`
for `WebApplicationFactory`.

> **In Practice:** Every team has a tabs-versus-spaces argument over
> the assertion library. NUnit's `Assert.That` and FluentAssertions'
> `Should().Be()` and Shouldly's `ShouldBe` all do the same thing.
> Pick one, write a one-paragraph rationale in your README, and stop
> revisiting the choice.

---

## 12.3 A Domain test

Domain tests are the fastest, smallest tests in the project. They
construct an entity and assert that its invariants hold.

**Listing 12.1 — `EBookLibrary.Domain.Tests/Entities/BookTests.cs`.**

```csharp
public sealed class BookTests
{
    [Fact]
    public void Create_with_valid_title_succeeds()
    {
        var book = Book.Create("Don Quixote", BookLanguage.Spanish);

        book.Title.Should().Be("Don Quixote");
        book.Status.Should().Be(BookStatus.Draft);
        book.IsDeleted.Should().BeFalse();
        book.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Create_with_blank_title_throws(string? title)
    {
        var act = () => Book.Create(title!, BookLanguage.Spanish);

        act.Should().Throw<DomainValidationException>()
           .WithMessage("*Title*");
    }

    [Fact]
    public void Publish_from_draft_emits_BookPublishedEvent()
    {
        var book = Book.Create("Don Quixote", BookLanguage.Spanish);

        book.Publish();

        book.Status.Should().Be(BookStatus.Published);
        book.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<BookPublishedEvent>();
    }

    [Fact]
    public void Publish_when_already_published_throws()
    {
        var book = Book.Create("Don Quixote", BookLanguage.Spanish);
        book.Publish();

        var act = () => book.Publish();

        act.Should().Throw<DomainException>()
           .WithMessage("*already published*");
    }
}
```

Four tests, four invariants, fewer than fifty lines. Each test name
reads as a sentence: *"Create with valid title succeeds."*. Each
assertion reads as a sentence too. There is one `Arrange–Act–Assert`
flow per test and no setup beyond the `Create()` call.

> **Pitfall:** Tests that share state across `[Fact]` methods (a
> static field, a `[ClassInitialize]` that mutates) are the hardest
> tests to debug when a single one fails for a reason that depends on
> the order they ran in. Prefer fresh setup per test, even when it
> repeats. The cost is a few extra microseconds; the benefit is that
> a red test means *that* test is broken, not "something earlier in
> the suite poisoned the well".

---

## 12.4 An Application handler test

Handler tests are where most of the business-logic coverage lives.
They construct the handler with mocked dependencies, send a command,
and assert on both the result *and* the calls made on the mocks.

**Listing 12.2 — `EBookLibrary.Application.Tests/Books/CreateBookCommandHandlerTests.cs`.**

```csharp
public sealed class CreateBookCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IBookRepository> _books = new();
    private readonly Mock<IFileStorage> _files = new();
    private readonly CreateBookCommandHandler _sut;

    public CreateBookCommandHandlerTests()
    {
        _uow.Setup(u => u.Books).Returns(_books.Object);
        _sut = new CreateBookCommandHandler(_uow.Object, _files.Object);
    }

    [Fact]
    public async Task Returns_failure_when_isbn_already_exists()
    {
        _books.Setup(r => r.ExistsByIsbnAsync("978-1-234567-89-0", default))
              .ReturnsAsync(true);

        var result = await _sut.Handle(new CreateBookCommand(
            Title: "Don Quixote", Isbn: "978-1-234567-89-0", /* … */),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("ISBN", StringComparison.OrdinalIgnoreCase));

        _books.Verify(r => r.AddAsync(It.IsAny<Book>(), default), Times.Never);
        _uow.Verify(u => u.SaveChangesAsync(default), Times.Never);   // ← important
    }

    [Fact]
    public async Task Adds_book_and_commits_when_valid()
    {
        _books.Setup(r => r.ExistsByIsbnAsync(It.IsAny<string>(), default))
              .ReturnsAsync(false);

        var result = await _sut.Handle(new CreateBookCommand(
            Title: "Don Quixote", Isbn: "978-1-234567-89-0", /* … */),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _books.Verify(r => r.AddAsync(
            It.Is<Book>(b => b.Title == "Don Quixote"), default), Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }
}
```

Notice two patterns.

- **The constructor builds the System Under Test once.** xUnit
  creates a fresh instance per test, so this is safe and keeps each
  `[Fact]` focused on Arrange/Act/Assert without ceremony.
- **Negative tests verify *no* side effect.** The `Times.Never`
  assertions are the line that catches the bug "validation passes
  but we still save". They are easy to forget; they are the *most*
  valuable assertions.

> **In Practice:** Moq is comfortable but verbose. NSubstitute is
> the same expressive power with less boilerplate. The choice is
> mostly taste. Whichever you pick, *do not mix them in one project* —
> the cognitive cost of two mocking grammars in one suite is more
> than the cost of either alone.

---

## 12.5 A controller test with `WebApplicationFactory`

Some bugs only show up when the full middleware pipeline runs:
attribute routing, model binding, JSON serialization, authentication,
exception middleware. `WebApplicationFactory<TEntryPoint>` boots an
in-memory ASP.NET Core server so tests can issue real HTTP requests
to the assembled app.

**Listing 12.3 — `EBookLibrary.WebApi.Tests/Controllers/BooksControllerTests.cs`.**

```csharp
public sealed class BooksControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public BooksControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory
            .WithWebHostBuilder(b => b.ConfigureServices(s =>
            {
                // Replace the real DbContext with an in-memory one.
                s.RemoveAll<DbContextOptions<AppDbContext>>();
                s.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("tests"));
            }))
            .CreateClient();
    }

    [Fact]
    public async Task Search_without_query_returns_200_and_envelope()
    {
        var resp = await _client.GetAsync("/api/books/search?pageNumber=1&pageSize=10");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<ApiResponse<PagedResult<BookListItem>>>();
        body.Should().NotBeNull();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task Create_without_token_returns_401()
    {
        var resp = await _client.PostAsJsonAsync("/api/books", new { Title = "Test" });

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_with_user_token_returns_403()
    {
        var token = await GetUserTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var resp = await _client.PostAsJsonAsync("/api/books", new { Title = "Test" });

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);   // protects the § 8.4 bug
    }
}
```

The third test is the one explicitly catching the *most consequential
JWT misconfiguration* from § 8.4. If the role claim is emitted as
`"role"` instead of `ClaimTypes.Role`, this assertion fails — the
endpoint returns `403` regardless of role, which is *not* what the
test expected. The test is the protection.

> **Pitfall:** EF Core's in-memory provider is fine for fast smoke
> tests of HTTP shapes. It is *not* a faithful SQL Server. It does
> not enforce constraints the way SQL Server does, it does not
> support transactions identically, and global query filters can
> behave subtly differently. For tests that depend on real database
> behavior — concurrency, indexes, ranking — use Testcontainers with
> a real SQL Server image.

---

## 12.6 What to test, what to skip

A handful of practical rules cuts most of the "what should I test?"
debate.

- **Test every Domain invariant.** Each "throws when…" rule deserves
  a one-line `[Fact]`. Cheap, valuable, regression-resistant.
- **Test every Application handler.** Both the success path and the
  most plausible failure path.
- **Test the controller's wiring, not its logic.** It has no logic —
  just verify the dispatch is correct and the status codes match.
- **Skip tests of EF Core itself.** EF Core is tested by Microsoft.
  You are not paid to re-test it.
- **Skip tests of trivial one-liners.** A getter that returns a field
  does not need a test.
- **Do test value object equality.** Equality is the kind of
  silently-wrong code that bites later.

The combined effect: a test count that grows with *behavior*, not
with lines of code.

---

## 12.7 Coverage and what it proves

The project measures line coverage with `coverlet.collector`. A
typical run looks like:

```
EBookLibrary.Domain          — 95%   (most one-line constructors covered by handler tests)
EBookLibrary.Application     — 88%   (every handler covered, edge branches mixed)
EBookLibrary.Infrastructure  — 62%   (covered indirectly by integration tests)
EBookLibrary.WebApi          — 78%   (controllers covered; Program.cs is excluded)
```

The numbers are useful as a *trend* and dangerous as a *target*.
Coverage measures whether a line ran during the suite — it does not
measure whether the line was *exercised meaningfully*. A handler test
that calls the handler and asserts nothing has 100% coverage and zero
value.

> **Architect's Note:** Goodhart's Law applies: "When a measure
> becomes a target, it ceases to be a good measure." A team mandate
> of "we must hit 90% coverage" produces tests written to satisfy the
> mandate, not to catch bugs. Track coverage, look at the trend, and
> investigate sharp drops. Do not fail the build on a coverage
> threshold.

---

## 12.8 Running the suite

The whole suite runs from the repository root.

```powershell
# Run everything (except E2E, which is its own project)
dotnet test --filter "FullyQualifiedName!~E2E"

# Run a single project
dotnet test tests/EBookLibrary.Application.Tests/

# Collect coverage
dotnet test --collect:"XPlat Code Coverage"
```

A target of "all unit tests run in under thirty seconds on a
developer laptop" is a useful discipline. If the suite drifts past
thirty seconds, the slow tests are usually doing something they do
not need to do (touching a real database, awaiting a real timer,
booting a WebApplicationFactory per test rather than per class).

---

## 12.9 Checkpoint

You are ready for Chapter 13 when:

- [ ] `dotnet test` is green from a clean checkout.
- [ ] You can name the assertion in Listing 12.3 that protects
      against the JWT role-claim bug.
- [ ] You can write a Domain test from scratch for an invariant in
      one of the entities you authored in Chapter 4.
- [ ] You can explain when EF Core's in-memory provider is enough
      and when it is misleading.
- [ ] Coverage is reported but does not fail the build.

---

## Key takeaways

- Most tests live at Domain and Application — fast, focused,
  database-free.
- xUnit + FluentAssertions + Moq is the project's standard stack.
- Negative tests need `Times.Never` assertions; the line "we did
  *not* save" catches the bug "we validated wrong but saved anyway".
- `WebApplicationFactory` exposes the full middleware pipeline for
  integration tests when unit tests cannot reach.
- Coverage is a useful trend signal and a misleading target. Track
  it; do not gate on it.

---

## Exercises

**Easy.** Add a `[Theory]` to `BookTests` with `InlineData` covering
five separate invalid `Isbn` values and one valid one. Use a single
test method with a `bool expectedValid` parameter.

**Medium.** Write a test for `LoginUserCommandHandler` that asserts
the *generic* error message is returned for both "no such user" and
"wrong password" — protecting the § 5.5 anti-enumeration property.

**Hard.** Replace the in-memory database in Listing 12.3 with
**Testcontainers** running a real SQL Server image. Measure how the
suite duration changes. Discuss the trade-off of fidelity for speed
and where in your project's test pyramid Testcontainers belongs.

---

## Further reading

- xUnit documentation. <https://xunit.net/>
- FluentAssertions documentation. <https://fluentassertions.com/>
- Vladimir Khorikov, *Unit Testing Principles, Practices, and
  Patterns* — the best modern book on the subject.
- Roy Osherove, *The Art of Unit Testing*, 3rd ed.
- Kent C. Dodds, *"The Testing Trophy and Testing Classifications"* —
  the case for inverting the pyramid.
