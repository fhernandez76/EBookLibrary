# Component 02 — Domain Layer

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete Domain layer for EBook Library.
> **Session goal:** Generate all entities, value objects, enums, domain events, and repository interfaces. The Domain project must have **zero** external NuGet dependencies.
> **Project:** `src/EBookLibrary.Domain/` (class library, .NET 10, C# 14, nullable enabled)

---

## Context

The Domain layer is the innermost layer of the Clean Architecture. It contains:
- **Entities**: Objects with identity that persist over time
- **Value Objects**: Immutable objects defined by their attributes
- **Enums**: Domain-specific enumerations
- **Domain Events**: Notifications of things that happened
- **Repository Interfaces**: Contracts for data access (implemented in Infrastructure)
- **No business logic that requires external services** — only pure C# logic

---

## Task 1 — Base Infrastructure

### File: `Common/BaseEntity.cs`
```csharp
namespace EBookLibrary.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; protected set; }
    public bool IsDeleted { get; protected set; } = false;

    private readonly List<IDomainEvent> _domainEvents = new();
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);
    public void ClearDomainEvents() => _domainEvents.Clear();
    public void MarkAsUpdated() => UpdatedAt = DateTime.UtcNow;
    public void SoftDelete()
    {
        IsDeleted = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
```

### File: `Events/IDomainEvent.cs`
```csharp
using MediatR;
namespace EBookLibrary.Domain.Events;

/// <summary>
/// Marker interface for domain events. Inherits INotification so MediatR can dispatch them.
/// Note: Add MediatR as the only domain-level dependency ONLY if domain events are dispatched here.
/// Otherwise, keep this as a plain marker interface and dispatch from Application layer.
/// </summary>
public interface IDomainEvent : INotification
{
    Guid Id { get; }
    DateTime OccurredAt { get; }
}
```

**Note to AI:** Since IDomainEvent inherits INotification (MediatR), add MediatR as a dependency ONLY in Domain if you choose to dispatch events from here. The preferred approach is to keep IDomainEvent as a plain marker interface: `public interface IDomainEvent { Guid Id { get; } DateTime OccurredAt { get; } }` — and let the Application layer handle dispatch.

---

## Task 2 — Enums

### File: `Enums/UserRole.cs`
```csharp
namespace EBookLibrary.Domain.Enums;

public enum UserRole
{
    Regular = 1,
    Admin = 2
}
```

### File: `Enums/BookLanguage.cs`
```csharp
namespace EBookLibrary.Domain.Enums;

public enum BookLanguage
{
    Spanish = 1,
    English = 2,
    Other = 3
}
```

### File: `Enums/BookStatus.cs`
```csharp
namespace EBookLibrary.Domain.Enums;

public enum BookStatus
{
    Available = 1,      // ePub file exists on disk
    Unavailable = 2,    // File not yet uploaded
    Removed = 3         // Soft-deleted
}
```

---

## Task 3 — Core Entities

### File: `Entities/Author.cs`

Generate an `Author` entity with:
- `Id` (Guid, from BaseEntity)
- `Name` (string, required, max 300 chars)
- `Biography` (string?, nullable)
- `CreatedAt`, `UpdatedAt`, `IsDeleted` (from BaseEntity)
- Navigation property: `ICollection<BookAuthor> BookAuthors`
- Factory method: `static Author Create(string name, string? biography = null)`
- `Update(string name, string? biography)` method that calls `MarkAsUpdated()`

```csharp
namespace EBookLibrary.Domain.Entities;

public sealed class Author : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Biography { get; private set; }

    // Navigation
    public ICollection<BookAuthor> BookAuthors { get; private set; } = new List<BookAuthor>();

    private Author() { } // EF Core

    public static Author Create(string name, string? biography = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        if (name.Length > 300) throw new ArgumentException("Author name cannot exceed 300 characters.", nameof(name));

        return new Author
        {
            Name = name.Trim(),
            Biography = biography?.Trim()
        };
    }

    public void Update(string name, string? biography)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        Biography = biography?.Trim();
        MarkAsUpdated();
    }
}
```

### File: `Entities/Genre.cs`

Generate a `Genre` entity with:
- `Id` (Guid, from BaseEntity)
- `Name` (string, required, max 100 chars)
- `Description` (string?, nullable)
- Navigation: `ICollection<BookGenre> BookGenres`
- Factory: `static Genre Create(string name, string? description = null)`
- `Update(string name, string? description)` method

```csharp
namespace EBookLibrary.Domain.Entities;

public sealed class Genre : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public ICollection<BookGenre> BookGenres { get; private set; } = new List<BookGenre>();

    private Genre() { }

    public static Genre Create(string name, string? description = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        return new Genre { Name = name.Trim(), Description = description?.Trim() };
    }

    public void Update(string name, string? description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        Description = description?.Trim();
        MarkAsUpdated();
    }
}
```

### File: `Entities/Book.cs`

Generate a `Book` entity with:
- `Id` (Guid, from BaseEntity)
- `Title` (string, required, max 500 chars)
- `Pages` (int, 0 means unknown)
- `PublicationYear` (int?, nullable)
- `Isbn` (string?, nullable, max 20)
- `Description` (string?, nullable)
- `CoverImagePath` (string?, relative path to cover image)
- `FilePath` (string?, relative path to ePub file, e.g. `books/aventuras/el-libro.epub`)
- `Language` (BookLanguage enum)
- `Status` (BookStatus enum)
- Navigation: `ICollection<BookAuthor> BookAuthors`, `ICollection<BookGenre> BookGenres`, `ICollection<BookDownload> Downloads`
- Factory: `static Book Create(string title, int pages, BookLanguage language)`
- Methods: `Update(...)`, `SetFilePath(string path)`, `MarkAsAvailable()`, `MarkAsUnavailable()`
- Domain event: `AddDomainEvent(new BookCreatedEvent(Id))`

```csharp
namespace EBookLibrary.Domain.Entities;

public sealed class Book : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public int Pages { get; private set; }
    public int? PublicationYear { get; private set; }
    public string? Isbn { get; private set; }
    public string? Description { get; private set; }
    public string? CoverImagePath { get; private set; }
    public string? FilePath { get; private set; }
    public BookLanguage Language { get; private set; } = BookLanguage.Spanish;
    public BookStatus Status { get; private set; } = BookStatus.Unavailable;

    // Navigations
    public ICollection<BookAuthor> BookAuthors { get; private set; } = new List<BookAuthor>();
    public ICollection<BookGenre> BookGenres { get; private set; } = new List<BookGenre>();
    public ICollection<BookDownload> Downloads { get; private set; } = new List<BookDownload>();

    private Book() { }

    public static Book Create(string title, int pages, BookLanguage language = BookLanguage.Spanish)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        var book = new Book
        {
            Title = title.Trim(),
            Pages = pages >= 0 ? pages : 0,
            Language = language
        };
        return book;
    }

    public void Update(string title, int pages, int? publicationYear, string? isbn,
        string? description, BookLanguage language)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        Title = title.Trim();
        Pages = pages >= 0 ? pages : 0;
        PublicationYear = publicationYear;
        Isbn = isbn?.Trim();
        Description = description?.Trim();
        Language = language;
        MarkAsUpdated();
    }

    public void SetFilePath(string relativePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath, nameof(relativePath));
        FilePath = relativePath;
        Status = BookStatus.Available;
        MarkAsUpdated();
    }

    public void SetCoverImagePath(string relativePath) 
    { 
        CoverImagePath = relativePath; 
        MarkAsUpdated(); 
    }

    public void MarkAsUnavailable() { Status = BookStatus.Unavailable; MarkAsUpdated(); }
    public bool HasFile => !string.IsNullOrWhiteSpace(FilePath) && Status == BookStatus.Available;
}
```

### File: `Entities/BookAuthor.cs` (Join entity)

```csharp
namespace EBookLibrary.Domain.Entities;

/// <summary>Many-to-many join between Book and Author</summary>
public sealed class BookAuthor
{
    public Guid BookId { get; private set; }
    public Guid AuthorId { get; private set; }
    public bool IsPrimary { get; private set; } = true; // primary vs. co-author

    public Book Book { get; private set; } = null!;
    public Author Author { get; private set; } = null!;

    private BookAuthor() { }

    public static BookAuthor Create(Guid bookId, Guid authorId, bool isPrimary = true)
        => new() { BookId = bookId, AuthorId = authorId, IsPrimary = isPrimary };
}
```

### File: `Entities/BookGenre.cs` (Join entity)

```csharp
namespace EBookLibrary.Domain.Entities;

/// <summary>Many-to-many join between Book and Genre</summary>
public sealed class BookGenre
{
    public Guid BookId { get; private set; }
    public Guid GenreId { get; private set; }

    public Book Book { get; private set; } = null!;
    public Genre Genre { get; private set; } = null!;

    private BookGenre() { }

    public static BookGenre Create(Guid bookId, Guid genreId)
        => new() { BookId = bookId, GenreId = genreId };
}
```

### File: `Entities/User.cs`

Generate a `User` entity with:
- `Id` (Guid, from BaseEntity)
- `Email` (string, required, max 256, unique)
- `PasswordHash` (string, required — never store plain text)
- `FirstName` (string?, nullable, max 100)
- `LastName` (string?, nullable, max 100)
- `Role` (UserRole enum, default Regular)
- `IsActive` (bool, default true)
- Navigation: `ICollection<BookDownload> Downloads`
- Factory: `static User Create(string email, string passwordHash)`
- Methods: `UpdateProfile(...)`, `ChangeRole(UserRole)`, `Deactivate()`, `Activate()`, `UpdateEmail(string)`, `ResetPassword(string)`

```csharp
namespace EBookLibrary.Domain.Entities;

public sealed class User : BaseEntity
{
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string? FirstName { get; private set; }
    public string? LastName { get; private set; }
    public UserRole Role { get; private set; } = UserRole.Regular;
    public bool IsActive { get; private set; } = true;

    public ICollection<BookDownload> Downloads { get; private set; } = new List<BookDownload>();

    private User() { }

    public static User Create(string email, string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash, nameof(passwordHash));

        return new User
        {
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash
        };
    }

    public void UpdateProfile(string? firstName, string? lastName)
    {
        FirstName = firstName?.Trim();
        LastName = lastName?.Trim();
        MarkAsUpdated();
    }

    public void ChangeRole(UserRole newRole) { Role = newRole; MarkAsUpdated(); }
    public void Deactivate() { IsActive = false; MarkAsUpdated(); }
    public void Activate() { IsActive = true; MarkAsUpdated(); }

    public void UpdateEmail(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        Email = email.Trim().ToLowerInvariant();
        MarkAsUpdated();
    }

    public void ResetPassword(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash, nameof(passwordHash));
        PasswordHash = passwordHash;
        MarkAsUpdated();
    }

    public string FullName => string.Join(" ", new string?[] { FirstName, LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
```

### File: `Entities/BookDownload.cs`

```csharp
namespace EBookLibrary.Domain.Entities;

/// <summary>Records every time a user downloads/requests a book</summary>
public sealed class BookDownload
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public Guid BookId { get; private set; }
    public DateTime DownloadedAt { get; private set; } = DateTime.UtcNow;
    public string? IpAddress { get; private set; }

    public User User { get; private set; } = null!;
    public Book Book { get; private set; } = null!;

    private BookDownload() { }

    public static BookDownload Create(Guid userId, Guid bookId, string? ipAddress = null)
        => new() { UserId = userId, BookId = bookId, IpAddress = ipAddress };
}
```

---

## Task 4 — Domain Events

### File: `Events/BookCreatedEvent.cs`
```csharp
namespace EBookLibrary.Domain.Events;

public record BookCreatedEvent(Guid BookId) : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
```

### File: `Events/BookDownloadedEvent.cs`
```csharp
namespace EBookLibrary.Domain.Events;

public record BookDownloadedEvent(Guid BookId, Guid UserId) : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
```

---

## Task 5 — Repository Interfaces

### File: `Interfaces/Repositories/IRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(T entity, CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IBookRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IBookRepository : IRepository<Book>
{
    Task<(IEnumerable<Book> Items, int TotalCount)> SearchAsync(
        string? title, string? authorName, string? genreName,
        int? publicationYear, int pageNumber, int pageSize,
        CancellationToken ct = default);

    Task<Book?> GetWithDetailsAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(string title, string authorName, CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IAuthorRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IAuthorRepository : IRepository<Author>
{
    Task<Author?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<IEnumerable<Author>> SearchByNameAsync(string nameQuery, CancellationToken ct = default);
    Task<(IEnumerable<Author> Items, int TotalCount)> GetPagedAsync(int pageNumber, int pageSize, CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IGenreRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IGenreRepository : IRepository<Genre>
{
    Task<Genre?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<IEnumerable<Genre>> GetAllOrderedAsync(CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IUserRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<(IEnumerable<User> Items, int TotalCount)> GetPagedAsync(int pageNumber, int pageSize, CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IBookDownloadRepository.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IBookDownloadRepository
{
    Task AddAsync(BookDownload download, CancellationToken ct = default);
    Task<IEnumerable<BookDownload>> GetByUserAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<BookDownload>> GetByBookAsync(Guid bookId, CancellationToken ct = default);
    Task<int> CountByBookAsync(Guid bookId, CancellationToken ct = default);
}
```

### File: `Interfaces/Repositories/IUnitOfWork.cs`
```csharp
namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IUnitOfWork : IDisposable
{
    IBookRepository Books { get; }
    IAuthorRepository Authors { get; }
    IGenreRepository Genres { get; }
    IUserRepository Users { get; }
    IBookDownloadRepository BookDownloads { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}
```

---

## Task 6 — Value Objects

### File: `ValueObjects/Email.cs`
```csharp
namespace EBookLibrary.Domain.ValueObjects;

/// <summary>Immutable value object representing a validated email address</summary>
public sealed class Email : IEquatable<Email>
{
    public string Value { get; }

    private Email(string value) => Value = value;

    public static Email Create(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        email = email.Trim().ToLowerInvariant();

        if (email.Length > 256)
            throw new ArgumentException("Email address is too long.", nameof(email));

        if (!email.Contains('@') || !email.Contains('.'))
            throw new ArgumentException("Email address format is invalid.", nameof(email));

        return new Email(email);
    }

    public bool Equals(Email? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is Email other && Equals(other);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
    public static implicit operator string(Email email) => email.Value;
}
```

---

## Deliverables Checklist

- [ ] `Common/BaseEntity.cs` with audit fields and domain events
- [ ] `Events/IDomainEvent.cs` marker interface
- [ ] `Events/BookCreatedEvent.cs`
- [ ] `Events/BookDownloadedEvent.cs`
- [ ] `Enums/UserRole.cs`
- [ ] `Enums/BookLanguage.cs`
- [ ] `Enums/BookStatus.cs`
- [ ] `Entities/Author.cs` with factory and update methods
- [ ] `Entities/Genre.cs` with factory and update methods
- [ ] `Entities/Book.cs` with all properties and methods
- [ ] `Entities/BookAuthor.cs` join entity
- [ ] `Entities/BookGenre.cs` join entity
- [ ] `Entities/User.cs` with factory and role methods
- [ ] `Entities/BookDownload.cs`
- [ ] `ValueObjects/Email.cs`
- [ ] `Interfaces/Repositories/IRepository.cs`
- [ ] `Interfaces/Repositories/IBookRepository.cs`
- [ ] `Interfaces/Repositories/IAuthorRepository.cs`
- [ ] `Interfaces/Repositories/IGenreRepository.cs`
- [ ] `Interfaces/Repositories/IUserRepository.cs`
- [ ] `Interfaces/Repositories/IBookDownloadRepository.cs`
- [ ] `Interfaces/Repositories/IUnitOfWork.cs`
- [ ] `dotnet build` on Domain project succeeds with 0 warnings

---

*Component 02 of 10 — EBook Library Project*
