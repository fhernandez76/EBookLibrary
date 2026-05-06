# Chapter 5 — The Application Layer

> *"A handler does one thing. If it does two, it is two handlers."*

---

## What you will learn

- How to wire MediatR into a CQRS layer with one handler per
  operation.
- How to use the `Result<T>` pattern to distinguish *expected* failures
  (validation, not-found, wrong-password) from *unexpected* failures
  (database down, infrastructure error).
- How `ValidationBehavior` and `LoggingBehavior` add cross-cutting
  concerns to every request without polluting handlers.
- How AutoMapper profiles project entities into DTOs without leaking
  Domain types out of Application.
- How to design DTOs (`PagedResult<T>`, `BookSummaryDto`,
  `BookDetailDto`) so the API surface is stable as the entities evolve.

---

## 5.1 What Application is, and is not

The Application layer orchestrates business operations. It does not
contain business *rules* — those live in entities — and it does not
contain *infrastructure* — that lives behind interfaces. Application is
the choreographer.

A typical Application handler does five things in order:

1. Receives a request object (a command or a query).
2. Validates it (delegated to FluentValidation via the pipeline).
3. Loads any entities it needs through `IUnitOfWork`.
4. Calls methods on those entities, or constructs new ones.
5. Saves changes and returns a result.

That is the whole job. Steps 2–5 are short enough that a typical
handler fits on one screen.

![Figure 5.1 — Component view of the Web API showing where Application sits.](figures/03-c4-component-api.jpg)

---

## 5.2 The `Result<T>` pattern

Most Application handlers can fail in two distinct ways: *expected*
failures the user should see (the email is already taken, the book
isn't found, the password is wrong) and *unexpected* failures that
indicate a system problem (the database is unreachable, the disk is
full).

Throwing exceptions for both blurs the line. The project uses
exceptions for the second category and a `Result<T>` type for the
first.

**Listing 5.1 — `Application/Common/Models/Result.cs` (abridged).**

```csharp
public sealed class Result<T>
{
    public bool IsSuccess => Errors.Count == 0;
    public T?   Value     { get; }
    public IReadOnlyList<string> Errors { get; }

    private Result(T? value, IReadOnlyList<string> errors)
    { Value = value; Errors = errors; }

    public static Result<T> Success(T value)        => new(value, Array.Empty<string>());
    public static Result<T> Failure(params string[] errors) => new(default, errors);
}

public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items   { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize   { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
```

The handler returns `Result<LoginResponse>`; the controller inspects
`IsSuccess` and maps to `200 OK` or `400 Bad Request`. The exception
middleware in Chapter 7 handles the "system broke" case separately.

> **Architect's Note:** There are three reasonable approaches to this
> problem in C#: throwing typed exceptions everywhere, returning
> `Result<T>` everywhere, or a hybrid where you throw for "this is a
> bug" and return `Result<T>` for "this is a UX outcome". The project
> uses the hybrid because it produces stack traces only for actual
> bugs and keeps user-facing failures cheap.

---

## 5.3 The MediatR pipeline

MediatR's *pipeline behaviors* are the application-layer equivalent of
ASP.NET Core middleware: they wrap every handler invocation. The
project ships two: validation and logging.

**Listing 5.2 — `Application/Common/Behaviors/ValidationBehavior.cs`.**

```csharp
public sealed class ValidationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var ctx = new ValidationContext<TRequest>(request);
        var failures = (await Task.WhenAll(
                _validators.Select(v => v.ValidateAsync(ctx, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ApplicationValidationException(failures);

        return await next();
    }
}
```

A request whose validators all pass continues to the handler. A request
that fails any validator throws — and that throw is caught in the Web
API's exception middleware and translated into a `400 Bad Request` with
the failure list. The handler itself never sees an invalid request.

`LoggingBehavior` is even shorter: it logs the request type, the user
identity, and the elapsed milliseconds before calling `await next()`
and after the call returns.

> **In Practice:** It is tempting to add a third behavior, then a
> fourth, then a fifth. By the time the pipeline has six behaviors
> (caching, retries, transactions, telemetry, authorization,
> auditing), the request flow is no longer obvious from reading any
> single file. The project keeps the pipeline at two on purpose. Add a
> third only when you can name a request that *every* handler should
> be subject to.

---

## 5.4 A complete handler — `LoginUserCommandHandler`

The login handler is short but worth reading carefully. It contains
the single most important security decision in the project.

**Listing 5.3 — `Application/Auth/Commands/LoginUser/LoginUserCommandHandler.cs`.**

```csharp
public sealed record LoginUserCommand(string Email, string Password)
    : IRequest<Result<LoginResponse>>;

public sealed class LoginUserCommandHandler
    : IRequestHandler<LoginUserCommand, Result<LoginResponse>>
{
    private readonly IUnitOfWork       _uow;
    private readonly IPasswordHasher   _hasher;
    private readonly IJwtTokenService  _jwt;

    public LoginUserCommandHandler(
        IUnitOfWork uow, IPasswordHasher hasher, IJwtTokenService jwt)
    { _uow = uow; _hasher = hasher; _jwt = jwt; }

    public async Task<Result<LoginResponse>> Handle(
        LoginUserCommand cmd, CancellationToken ct)
    {
        var user = await _uow.Users.GetByEmailAsync(
            cmd.Email.Trim().ToLowerInvariant(), ct);

        // SAME message for both failure modes — see § 5.5.
        if (user is null || !_hasher.Verify(cmd.Password, user.PasswordHash))
            return Result<LoginResponse>.Failure("Invalid email or password.");

        if (!user.IsActive)
            return Result<LoginResponse>.Failure("Account is deactivated.");

        var token = _jwt.GenerateToken(user);
        return Result<LoginResponse>.Success(
            new LoginResponse(token, user.Email, user.Role.ToString()));
    }
}
```

The handler depends on three interfaces and on no concrete classes.
Mocking those three interfaces makes the handler testable end-to-end in
under a millisecond. Chapter 12 will write that test.

---

## 5.5 The single most important security decision in this chapter

Notice the comment in Listing 5.3: *"SAME message for both failure
modes."* It is doing real work.

If a login handler returns `"Email not found."` for an unknown email
and `"Wrong password."` for a known one, an attacker can probe your
user database without any credentials at all. They submit
`alice@example.com` with a random password and read the response: if
the message is "wrong password", `alice@example.com` exists. This is
called a *user enumeration vulnerability*.

The fix is one line: collapse both failures into one message. The
trade-off is mild — a legitimate user who mistypes their email gets a
slightly less helpful message — and the gain is the elimination of a
class of attack that does not require breaking any cryptography.

> **Pitfall:** This same anti-pattern recurs in *password reset*
> flows. A reset endpoint that says "we sent you an email" if the
> account exists and "no such account" otherwise has the same
> problem. The fix is the same: respond identically in both cases.
> Chapter 8 covers this in more depth.

---

## 5.6 A complete query — `SearchBooksQueryHandler`

Queries are usually shorter than commands. They load data through the
repository, project it through AutoMapper, and return it.

**Listing 5.4 — `Application/Books/Queries/SearchBooks/SearchBooksQueryHandler.cs`.**

```csharp
public sealed record SearchBooksQuery(
    string? Title, string? Author, string? Genre,
    int PageNumber = 1, int PageSize = 20)
    : IRequest<PagedResult<BookSummaryDto>>;

public sealed class SearchBooksQueryHandler
    : IRequestHandler<SearchBooksQuery, PagedResult<BookSummaryDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper     _mapper;

    public SearchBooksQueryHandler(IUnitOfWork uow, IMapper mapper)
    { _uow = uow; _mapper = mapper; }

    public async Task<PagedResult<BookSummaryDto>> Handle(
        SearchBooksQuery q, CancellationToken ct)
    {
        // Defensive cap; do NOT trust the client.
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        var page = await _uow.Books.SearchAsync(
            q.Title, q.Author, q.Genre,
            q.PageNumber, pageSize, ct);

        return new PagedResult<BookSummaryDto>
        {
            Items      = _mapper.Map<IReadOnlyList<BookSummaryDto>>(page.Items),
            TotalCount = page.TotalCount,
            PageNumber = page.PageNumber,
            PageSize   = pageSize,
        };
    }
}
```

The `Math.Clamp(q.PageSize, 1, 100)` is the second small but important
decision in this chapter. If the client could pass any page size, an
attacker could request `pageSize=1000000` and force the database to
return every book in one call. Capping server-side prevents that.

> **In Practice:** Page-size caps are usually written as a
> *requirement* and forgotten. Put them in code, near the place that
> would have been wrong without them, with a comment naming the
> attacker scenario. The comment is what survives a refactor.

---

## 5.7 AutoMapper profiles and DTO design

`BookSummaryDto` and `BookDetailDto` are not just renamings of `Book`.
They are *contracts*: the JSON shape that frontends rely on. Changing
a Domain entity must not silently change the wire format.

**Listing 5.5 — `Application/Books/Mappings/BookMappingProfile.cs`.**

```csharp
public sealed class BookMappingProfile : Profile
{
    public BookMappingProfile()
    {
        CreateMap<Book, BookSummaryDto>()
            .ForMember(d => d.PrimaryAuthor,
                opt => opt.MapFrom(s => s.BookAuthors
                    .Select(ba => ba.Author.Name).FirstOrDefault() ?? "Unknown"))
            .ForMember(d => d.PrimaryGenre,
                opt => opt.MapFrom(s => s.BookGenres
                    .Select(bg => bg.Genre.Name).FirstOrDefault() ?? "Unclassified"));

        CreateMap<Book, BookDetailDto>()
            .ForMember(d => d.Authors, opt => opt.MapFrom(s =>
                s.BookAuthors.Select(ba => ba.Author.Name)))
            .ForMember(d => d.Genres,  opt => opt.MapFrom(s =>
                s.BookGenres.Select(bg => bg.Genre.Name)));
    }
}
```

The summary DTO is small — a search result page renders thousands of
them. The detail DTO carries the full author and genre lists for the
detail page. Two DTOs for one entity is normal in Application; one DTO
that grows additional fields whenever a new screen needs them is *not*
normal, and is a sign that the domain has not yet split into the
shapes the API needs.

> **Architect's Note:** AutoMapper has a long-running reputation for
> being "magic": failures appear at runtime, not at compile time. The
> project mitigates this by calling
> `cfg.AssertConfigurationIsValid()` in tests. If you find yourself
> debugging an AutoMapper exception in production, the missing
> assertion is the bug, not AutoMapper.

---

## 5.8 Service interfaces

Application defines interfaces for the small set of infrastructure
services that handlers cannot do without. Chapter 6 implements them.

**Listing 5.6 — `Application/Common/Interfaces/`.**

```csharp
public interface IPasswordHasher
{
    string Hash(string password);
    bool   Verify(string password, string hash);
}

public interface IJwtTokenService
{
    string GenerateToken(User user);
    ClaimsPrincipal? Validate(string token);
}

public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string fileName, CancellationToken ct);
    Task<Stream> OpenReadAsync(string relativePath, CancellationToken ct);
}

public interface ICurrentUser
{
    Guid?  UserId { get; }
    string? Email { get; }
    bool    IsAdmin { get; }
}
```

Four interfaces. That is the entire set. If the list grew to
fifteen, Application would be reaching for too many infrastructure
concepts; if it shrank to one, Application would be hiding
infrastructure concerns inside other handlers. Four is roughly the
right number for this project.

---

## 5.9 Dependency injection registration

A single extension method registers everything Application needs.

**Listing 5.7 — `Application/DependencyInjection.cs`.**

```csharp
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(
            typeof(DependencyInjection).Assembly));

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddAutoMapper(typeof(DependencyInjection).Assembly);

        return services;
    }
}
```

The Web API will call `services.AddApplication()` once in `Program.cs`.
Application has no further configuration story.

---

## 5.10 Checkpoint

You are ready for Chapter 6 when:

- [ ] `dotnet build src/EBookLibrary.Application/` succeeds.
- [ ] You can name the two pipeline behaviors and what each does.
- [ ] You can explain in one sentence why `LoginUserCommandHandler`
      uses the same error message for both failure modes.
- [ ] You can explain in one sentence why `SearchBooksQueryHandler`
      clamps `pageSize` to 100.
- [ ] You can name the four interfaces in `Common/Interfaces/` and
      what each is for.

---

## Key takeaways

- Application is the choreography layer. It contains no business
  rules and no infrastructure. Both live behind interfaces.
- `Result<T>` distinguishes expected user-facing failures from
  unexpected system failures. Exceptions are reserved for the second.
- The MediatR pipeline carries cross-cutting concerns; the project
  ships two behaviors and resists growing the list.
- The user-enumeration prevention in `LoginUserCommandHandler` is the
  single most important security decision in this chapter and costs
  one line of code.
- DTOs are contracts. Two DTOs per entity is normal; one DTO that
  grows is a sign that the API surface needs to split.

---

## Exercises

**Easy.** Add a query, `GetGenreByIdQuery`, with a handler that
returns `Result<GenreDto>` and the corresponding AutoMapper profile.
Mirror the structure of `GetBookByIdQueryHandler`.

**Medium.** The `PagedResult<T>` type currently does not expose
`HasNext` or `HasPrevious`. Add both as computed properties and update
the React frontend pagination control (Chapter 10) to use them. Note
which other DTOs change as a result.

**Hard.** Add a third pipeline behavior, `AuthorizationBehavior<,>`,
that reads a `[RequiresRole(UserRole.Admin)]` attribute on the
request type and throws `UnauthorizedAccessException` if the current
user does not have that role. Decide whether this duplicates the
controller-level `[Authorize(Roles="Admin")]` attribute (it does), and
when each layer is the right place to put the check.

---

## Further reading

- Vladimir Khorikov, *Functional C#: Result class.* The blog series
  that popularized the `Result<T>` pattern in the .NET community.
- Jimmy Bogard, *MediatR* documentation.
  <https://github.com/jbogard/MediatR/wiki>
- Microsoft, *AutoMapper Profile patterns.*
  <https://docs.automapper.org/en/stable/Configuration.html>
- Andrew Lock, *"Adding validation to your ASP.NET Core APIs"* —
  ValidationBehavior pattern in depth.
