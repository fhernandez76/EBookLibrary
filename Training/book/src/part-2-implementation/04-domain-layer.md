# Chapter 4 — The Domain Layer

> *"The model is not the database. The model is what the business does."*

---

## What you will learn

- Why the Domain layer is the only layer in the project that takes zero
  external NuGet dependencies, and what that constraint buys you.
- How to design entities with private setters, factory methods, and
  protected invariants — the *anemic model* anti-pattern, and how to
  avoid it.
- How to model many-to-many relationships (books ↔ authors, books ↔
  genres) with explicit join entities.
- How to declare repository contracts that the Application layer can
  consume without knowing how data is persisted.
- The role of domain events in keeping cross-aggregate side effects
  out of handlers.

---

## 4.1 The Domain layer's job

Open the `EBookLibrary.Domain` project. There is nothing in it but C#.
No EF Core, no MediatR, no AutoMapper, no FluentValidation. The
`.csproj` file is twelve lines long and lists no `<PackageReference>`
elements at all.

That is not an accident waiting to be filled in. It is a contract.

The Domain layer answers exactly one question: *what does the business
do?* Books have titles. Books are written by authors. Books belong to
genres. Books can be downloaded by registered users. A user has an
email and a hashed password. An administrator can create authors,
genres, and books.

These statements are framework-independent. They were true before .NET
existed. They will be true after the project switches off SQL Server.
The Domain layer says them in C#.

> **Foundations:** Eric Evans, in *Domain-Driven Design* (2003), called
> this layer the *ubiquitous language*: the vocabulary that the
> business analyst, the developer, the database administrator, and the
> end user all use the same way. If the people in the room start
> calling something different things — "user" in the UI, "account"
> in the database, "subject" in the auth code — your domain model has
> failed at its primary job.

Figure 4.1 is the Level-4 view from Chapter 2 (Figure 2.6). It is the
only diagram you will need for the rest of this chapter.

![Figure 4.1 — Domain model, all entities and their relationships.](figures/04-c4-code-domain.jpg)

---

## 4.2 `BaseEntity` — what every entity inherits

Listing 4.1 is the first non-trivial file in the Domain project, and
the one most other entities depend on.

**Listing 4.1 — `Domain/Common/BaseEntity.cs`.**

```csharp
namespace EBookLibrary.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id          { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; protected set; }
    public bool IsDeleted   { get; protected set; }
    public DateTime? DeletedAt { get; protected set; }

    private readonly List<IDomainEvent> _events = new();
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _events.AsReadOnly();

    public void SoftDelete()
    {
        IsDeleted = true;
        DeletedAt = DateTime.UtcNow;
    }

    public void MarkAsUpdated() => UpdatedAt = DateTime.UtcNow;

    protected void AddDomainEvent(IDomainEvent evt) => _events.Add(evt);
    public void ClearDomainEvents() => _events.Clear();
}
```

Three design choices in this file repay attention.

First, `protected set` on the public properties. External code can read
`book.Title` but cannot write to it. The only way an entity changes
state is through the methods the entity itself exposes. That sounds
restrictive and is. It is also the difference between a domain *model*
(which protects its invariants) and a domain *record* (which is just a
DTO with friends).

Second, the soft-delete pair (`IsDeleted` + `DeletedAt`). Chapter 6
will show how a global EF Core query filter applies these to every
read query. Hard delete is reserved for the rare case where regulatory
compliance requires it.

Third, `DomainEvents`. The collection lives in memory only — never
persisted. Chapter 5 will show how the Application layer reads it after
`SaveChangesAsync` to dispatch side effects without polluting the
handler.

> **Pitfall:** A common first attempt at `IDomainEvent` defines it as
> `IDomainEvent : MediatR.INotification`. This adds a NuGet dependency
> on MediatR to the Domain layer, breaking the zero-dependency
> contract. The fix is one line: declare your own marker interface,
> and have the *Application* layer adapt it to MediatR.

---

## 4.3 The `Book` entity

Listing 4.2 shows the `Book` entity with its factory method, its
many-to-many relationships, and its update behavior.

**Listing 4.2 — `Domain/Entities/Book.cs` (abridged).**

```csharp
public sealed class Book : BaseEntity
{
    public string Title       { get; private set; } = "";
    public string? Isbn       { get; private set; }
    public string? Description { get; private set; }
    public int Pages          { get; private set; }
    public int? PublicationYear { get; private set; }
    public string? FilePath    { get; private set; }
    public BookLanguage Language { get; private set; }
    public BookStatus Status     { get; private set; } = BookStatus.Draft;

    public ICollection<BookAuthor> BookAuthors { get; private set; } = new List<BookAuthor>();
    public ICollection<BookGenre>  BookGenres  { get; private set; } = new List<BookGenre>();

    private Book() { }   // EF Core needs this; no other code may use it.

    public static Book Create(string title, BookLanguage language)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));
        if (title.Length > 500)
            throw new ArgumentException("Title is too long.", nameof(title));

        return new Book { Title = title.Trim(), Language = language };
    }

    public void Update(string title, string? description, int pages, int? year)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.", nameof(title));

        Title = title.Trim();
        Description = description?.Trim();
        Pages = pages;
        PublicationYear = year;
        MarkAsUpdated();
    }

    public void SetFilePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("Path is required.", nameof(path));
        FilePath = path;
        MarkAsUpdated();
    }

    public void MarkAvailable()
    {
        if (FilePath is null)
            throw new InvalidOperationException("Cannot publish a book with no file.");
        Status = BookStatus.Available;
        MarkAsUpdated();
    }
}
```

The shape is the lesson, not the field list. `Book` exposes:

- A *named* construction path (`Create`) that validates inputs.
- A *narrow* mutation surface (`Update`, `SetFilePath`, `MarkAvailable`)
  rather than a setter per property.
- A state machine on `Status` enforced by `MarkAvailable()` refusing to
  publish an unfileable book.

A handler that wants to make a book available calls
`book.MarkAvailable()` and gets either a successfully published book or
a thrown exception explaining the precondition that failed. The handler
does not need to repeat the rule. The rule lives in one place.

> **Architect's Note:** The shape above is what Martin Fowler called a
> *Rich Domain Model*, in opposition to the *Anemic Domain Model* in
> which entities are bags of public setters and all the behavior lives
> in services. The two are not equally good. The anemic model is
> easier to write on day one and steadily worse to live with for the
> remainder of the project's life.

---

## 4.4 The join entities

Books have many authors. Authors have many books. Books have many
genres. Genres have many books. EF Core can model these "skipped"
many-to-many relationships implicitly, but doing so makes the join
invisible to the Domain layer. The project models the joins
explicitly:

**Listing 4.3 — `Domain/Entities/BookAuthor.cs`.**

```csharp
public sealed class BookAuthor
{
    public Guid BookId   { get; private set; }
    public Guid AuthorId { get; private set; }

    public Book   Book   { get; private set; } = null!;
    public Author Author { get; private set; } = null!;

    private BookAuthor() { }

    public static BookAuthor Create(Guid bookId, Guid authorId)
        => new BookAuthor { BookId = bookId, AuthorId = authorId };
}
```

`BookGenre` follows the same template. The composite key
(`BookId` + `AuthorId`) is configured in Chapter 6's
`BookConfiguration` Fluent API.

> **In Practice:** Explicit join entities are uncomfortable to type and
> easy to underestimate. They pay back the day you need to add a
> *property* to the join — for example, "the order in which authors
> are credited on the book cover", or "the date the genre tag was
> applied". With an explicit join, the property goes on
> `BookAuthor`. With an implicit join, you have to introduce a new
> entity, migrate the database, and rewrite the LINQ. Plan for the
> property you do not yet need.

---

## 4.5 The `User` entity

The `User` entity is the only entity in the project that does
something subtle to its inputs:

**Listing 4.4 — `Domain/Entities/User.cs` (abridged).**

```csharp
public sealed class User : BaseEntity
{
    public string Email        { get; private set; } = "";
    public string PasswordHash { get; private set; } = "";
    public string? FirstName   { get; private set; }
    public string? LastName    { get; private set; }
    public UserRole Role       { get; private set; } = UserRole.Regular;
    public bool IsActive       { get; private set; } = true;

    private User() { }

    public static User Create(string email, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        return new User
        {
            Email        = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
        };
    }

    public void UpdateRole(UserRole role) { Role = role; MarkAsUpdated(); }
    public void Deactivate()              { IsActive = false; MarkAsUpdated(); }
    public void ResetPassword(string newHash)
    {
        if (string.IsNullOrWhiteSpace(newHash))
            throw new ArgumentException("Hash required.", nameof(newHash));
        PasswordHash = newHash;
        MarkAsUpdated();
    }
}
```

The line that matters is `Email = email.Trim().ToLowerInvariant()`.
Email lookups in the Application layer are strictly equality
comparisons; the database has a unique index on `Email`. If the entity
did not normalize on the way in, two users could register as
`Alice@example.com` and `alice@example.com` and the second registration
would succeed. The fix could go in three places (the validator, the
handler, the entity) and only one of them is correct: the entity, where
the invariant cannot be bypassed.

> **Pitfall:** Putting normalization in a validator alone is the
> classic *defense-in-one-place* error. Validation is a UX layer
> (returns 400 to the user); invariants are a correctness layer
> (refuse to construct an invalid entity). The first does not
> substitute for the second.

---

## 4.6 Repository interfaces

Application code does not query the database. It asks an interface.
Listing 4.5 shows the interfaces that Application will use throughout
Part II; their EF Core implementations are the subject of Chapter 6.

**Listing 4.5 — `Domain/Interfaces/Repositories/` (abridged).**

```csharp
public interface IGenericRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Remove(T entity);   // soft-delete via BaseEntity.SoftDelete
}

public interface IBookRepository : IGenericRepository<Book>
{
    Task<PagedResult<Book>> SearchAsync(
        string? title, string? authorName, string? genreName,
        int pageNumber, int pageSize, CancellationToken ct = default);
}

public interface IUnitOfWork : IDisposable
{
    IBookRepository   Books   { get; }
    IAuthorRepository Authors { get; }
    IGenreRepository  Genres  { get; }
    IUserRepository   Users   { get; }
    IBookDownloadRepository Downloads { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

`IUnitOfWork` is the seam through which all Application code talks to
data. A handler injects `IUnitOfWork`, calls one or more repositories,
then calls `SaveChangesAsync()` exactly once. The Application layer
never instantiates a `DbContext`, never opens a transaction, never sees
a connection string.

> **Architect's Note:** The Repository pattern has a reputation, partly
> deserved, for adding ceremony around what is already an abstraction
> (EF Core's `DbSet<T>` is itself a repository). The reason this
> project still uses an explicit `IBookRepository` is that *Application
> handlers must be testable without EF Core*. With `IUnitOfWork`, a
> handler test mocks one interface and is done. Without it, every
> handler test needs an in-memory `DbContext` provider, and the
> "mocking" is a small bug-prone integration test in disguise.

---

## 4.7 Enumerations and value objects

The Domain folder contains two more directories worth a glance.

**`Enums/`** — `BookLanguage`, `BookStatus`, `UserRole`. All start at
1, never 0:

```csharp
public enum UserRole { Regular = 1, Admin = 2 }
```

> **Pitfall:** Defaulting an enum to value 0 means an
> uninitialized `UserRole` field is silently `Regular`. In a JWT claim
> system this turns into "everyone is a regular user, including
> someone whose role got dropped during deserialization". Start enums
> at 1.

**`ValueObjects/`** — currently empty. The project does not yet have a
case where the *identity* of a concept is irrelevant and only its
*value* matters (the canonical examples are `Money`, `Address`, or
`DateRange`). Appendix B has an exercise to introduce one.

---

## 4.8 Checkpoint

You are ready for Chapter 5 when:

- [ ] `dotnet build src/EBookLibrary.Domain/EBookLibrary.Domain.csproj`
      succeeds with zero warnings.
- [ ] `EBookLibrary.Domain.csproj` contains no `<PackageReference>`
      elements.
- [ ] You can name, without consulting the chapter, why every entity
      has a private parameterless constructor and a static `Create`
      method.
- [ ] You can explain in one sentence why `User.Email` is normalized
      inside the `Create` factory rather than in a validator.
- [ ] You can read `IUnitOfWork` and predict what its EF Core
      implementation in Chapter 6 will look like.

---

## Key takeaways

- The Domain layer takes zero external dependencies, deliberately.
  Every constraint that follows from this rule pays back in
  testability, swappability, and conceptual clarity.
- Entities expose narrow factory methods and behavior, not public
  setters. A *rich* domain model is harder to write on day one and
  cheaper to live with thereafter.
- Many-to-many relationships are modeled with explicit join entities,
  not EF Core's "skipped" implicit joins. This costs typing now and
  saves a migration later.
- Invariants belong in the entity, not in the validator alone.
- `IUnitOfWork` is the only data-access surface that the Application
  layer ever sees. Chapter 5 will rely on this completely.

---

## Exercises

**Easy.** Add a new entity, `Publisher`, with `Name` and optional
`Country`. Wire it through `BaseEntity`, give it a factory method,
and declare an `IPublisherRepository` interface. (No EF Core yet — just
the Domain pieces.)

**Medium.** Introduce a value object, `Isbn`, that wraps a `string`
and validates that it is exactly 13 numeric characters. Replace
`Book.Isbn` (currently `string?`) with `Isbn?`. Discuss in your own
notes what changes in the Application and Infrastructure layers as a
result.

**Hard.** Add a method `Book.Republish(int newPublicationYear)` that
refuses to run if the book is already in `BookStatus.Available` and
the year is in the future. Write the unit test for it before writing
the method (the test goes in `EBookLibrary.Domain.Tests`). This is the
test you will use again in Chapter 12 as a baseline.

---

## Further reading

- Eric Evans, *Domain-Driven Design.* The book that named most of the
  vocabulary in this chapter.
- Vaughn Vernon, *Implementing Domain-Driven Design.* A more practical
  follow-up. Chapters 5 and 6 cover entities and aggregates in depth.
- Martin Fowler, *"AnemicDomainModel"*.
  <https://martinfowler.com/bliki/AnemicDomainModel.html>
- Microsoft, *Domain model pattern in .NET microservices.*
  <https://docs.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/>
