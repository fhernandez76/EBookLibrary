# Chapter 6 — The Infrastructure Layer

> *"All the framework code lives here, on purpose."*

---

## What you will learn

- How EF Core's `DbContext` plus Fluent API entity configurations
  describe a database schema without leaking back into the Domain
  layer.
- How global query filters make soft delete a property of the schema
  rather than a property of every query.
- How a generic repository plus a unit of work satisfy the interfaces
  declared by Application without becoming a thin wrapper over EF
  Core.
- How JWT token generation, BCrypt password hashing, and file storage
  fit into the project as small, single-purpose services.
- How a single `AddInfrastructure()` extension method registers all of
  the above with the DI container.

---

## 6.1 What lives in Infrastructure, and why

Infrastructure is the layer where every framework dependency in the
project is allowed. EF Core, BCrypt, JWT libraries, file system APIs —
all live here. None of them appears in Application or Domain.

The trade-off is deliberate. Concentrating infrastructure in one place
makes the layer larger than the others; it also makes the rest of the
project entirely framework-free. Replacing EF Core with Dapper,
or BCrypt with Argon2, would touch only this project. Application code
would not change at all.

> **Foundations:** *Dependency injection* in .NET is the pattern by
> which a class declares its needs as constructor parameters and
> trusts the container to satisfy them at runtime. The container
> responsible — `IServiceCollection` registered into `IServiceProvider`
> — is built into ASP.NET Core. Infrastructure's job is to register
> its concrete classes against the interfaces Application declared.

---

## 6.2 `AppDbContext`

`AppDbContext` is the entry point to EF Core. It declares one
`DbSet<T>` per aggregate root, applies the entity configurations,
installs the global query filters for soft delete, and sets the
`UpdatedAt` timestamp on every save.

**Listing 6.1 — `Infrastructure/Persistence/AppDbContext.cs`.**

```csharp
public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Book>          Books     => Set<Book>();
    public DbSet<Author>        Authors   => Set<Author>();
    public DbSet<Genre>         Genres    => Set<Genre>();
    public DbSet<User>          Users     => Set<User>();
    public DbSet<BookAuthor>    BookAuthors    => Set<BookAuthor>();
    public DbSet<BookGenre>     BookGenres     => Set<BookGenre>();
    public DbSet<BookDownload>  BookDownloads  => Set<BookDownload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft delete — applied globally so handlers never have to remember it.
        modelBuilder.Entity<Book>()  .HasQueryFilter(b => !b.IsDeleted);
        modelBuilder.Entity<Author>().HasQueryFilter(a => !a.IsDeleted);
        modelBuilder.Entity<Genre>() .HasQueryFilter(g => !g.IsDeleted);
        modelBuilder.Entity<User>()  .HasQueryFilter(u => !u.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>()
                     .Where(e => e.State == EntityState.Modified))
        {
            entry.Entity.MarkAsUpdated();
        }
        return base.SaveChangesAsync(ct);
    }
}
```

Three details worth pausing on:

- **`ApplyConfigurationsFromAssembly`** picks up every
  `IEntityTypeConfiguration<T>` in the same project. There is no
  `OnModelCreating` to keep growing.
- **Global query filters** apply `WHERE IsDeleted = 0` to every read.
  Application handlers do not have to remember to add it.
- **`SaveChangesAsync` override** stamps `UpdatedAt` on every modified
  entity so handlers do not have to call `MarkAsUpdated()` by hand.

> **Pitfall:** A handler that *needs* to bypass the soft-delete filter
> (an admin "show deleted" view, for example) must call
> `IgnoreQueryFilters()` explicitly. Forgetting this is *the* most
> common bug after global filters are introduced. The fix is to make
> the bypass an explicit method on the repository, not a per-query
> opt-out scattered across handlers.

---

## 6.3 Entity configurations

Each entity has a Fluent API configuration in
`Persistence/Configurations/`. Listing 6.2 shows the most representative
one.

**Listing 6.2 — `Infrastructure/Persistence/Configurations/BookConfiguration.cs`.**

```csharp
public sealed class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> b)
    {
        b.ToTable("Books");
        b.HasKey(x => x.Id);

        b.Property(x => x.Title).IsRequired().HasMaxLength(500);
        b.Property(x => x.Isbn).HasMaxLength(20);
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.FilePath).HasMaxLength(500);

        // Enums as strings — see § 6.4.
        b.Property(x => x.Language).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Status)  .HasConversion<string>().HasMaxLength(20);

        b.HasIndex(x => x.Title);
        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.Isbn).IsUnique().HasFilter("[Isbn] IS NOT NULL");

        // Domain events live in memory only.
        b.Ignore(x => x.DomainEvents);
    }
}
```

`BookAuthorConfiguration` and `BookGenreConfiguration` declare the
composite primary keys for the join entities:

```csharp
b.HasKey(x => new { x.BookId, x.AuthorId });
```

That is all the join entities need; their navigation properties are
inferred.

---

## 6.4 Why enums are stored as strings

`Language` and `Status` are stored as strings, not integers. The cost
is a few bytes per row. The benefits are three.

1. **Renumbering is safe.** Adding a new enum value never shifts
   existing rows.
2. **The database is human-readable.** A DBA reading the table sees
   `"Spanish"` instead of `1`.
3. **Cross-system integration is robust.** Other systems reading the
   table do not need to share the enum definition.

> **Architect's Note:** This is a small example of *biasing for
> readability*. The performance difference between an `nvarchar(20)`
> and a `tinyint` is negligible at this scale. The cost of the
> integer-encoded enum becomes apparent the day someone files a bug
> with the message "I see status=2 in the database, what is that?".

---

## 6.5 The repository implementations

The generic repository handles the boring methods:

**Listing 6.3 — `Infrastructure/Repositories/GenericRepository.cs`.**

```csharp
public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext Db;
    protected DbSet<T> Set => Db.Set<T>();

    public GenericRepository(AppDbContext db) => Db = db;

    public Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Set.FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
        => await Set.ToListAsync(ct);

    public Task AddAsync(T entity, CancellationToken ct = default)
        => Set.AddAsync(entity, ct).AsTask();

    public void Update(T entity) => Set.Update(entity);

    public void Remove(T entity) => entity.SoftDelete();   // not Set.Remove(entity)
}
```

Notice that `Remove` is a soft delete, not a `Set.Remove`. Hard delete
is reserved for the rare case it is needed (and is not exposed through
the interface).

The interesting repositories add operation-specific methods. Listing
6.4 is the heart of search.

**Listing 6.4 — `Infrastructure/Repositories/BookRepository.cs` (search).**

```csharp
public sealed class BookRepository : GenericRepository<Book>, IBookRepository
{
    public BookRepository(AppDbContext db) : base(db) { }

    public async Task<PagedResult<Book>> SearchAsync(
        string? title, string? authorName, string? genreName,
        int pageNumber, int pageSize, CancellationToken ct = default)
    {
        var q = Set.AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
            q = q.Where(b => b.Title.Contains(title));
        if (!string.IsNullOrWhiteSpace(authorName))
            q = q.Where(b => b.BookAuthors
                .Any(ba => ba.Author.Name.Contains(authorName)));
        if (!string.IsNullOrWhiteSpace(genreName))
            q = q.Where(b => b.BookGenres
                .Any(bg => bg.Genre.Name.Contains(genreName)));

        var total = await q.CountAsync(ct);

        var items = await q
            .Include(b => b.BookAuthors).ThenInclude(ba => ba.Author)
            .Include(b => b.BookGenres) .ThenInclude(bg => bg.Genre)
            .OrderBy(b => b.Title)
            .Skip((pageNumber - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<Book>
        {
            Items = items, TotalCount = total,
            PageNumber = pageNumber, PageSize = pageSize,
        };
    }
}
```

> **In Practice:** Repositories that call `Include` for navigation
> properties on every read are doing the work the API needs and no
> more. A repository that returned only the book without its authors
> and genres would force the handler to make a follow-up query for
> each book — the *N+1 query* problem. Choosing the right `Include`
> per repository method is one of the underappreciated arts of EF
> Core.

---

## 6.6 The unit of work

`UnitOfWork` is a thin coordinator that exposes one repository per
aggregate and a `SaveChangesAsync` that commits all of them in one
transaction.

**Listing 6.5 — `Infrastructure/Repositories/UnitOfWork.cs`.**

```csharp
public sealed class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;

    public IBookRepository           Books     { get; }
    public IAuthorRepository         Authors   { get; }
    public IGenreRepository          Genres    { get; }
    public IUserRepository           Users     { get; }
    public IBookDownloadRepository   Downloads { get; }

    public UnitOfWork(AppDbContext db)
    {
        _db = db;
        Books     = new BookRepository(db);
        Authors   = new AuthorRepository(db);
        Genres    = new GenreRepository(db);
        Users     = new UserRepository(db);
        Downloads = new BookDownloadRepository(db);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    public void Dispose() => _db.Dispose();
}
```

EF Core already coordinates the transaction; `UnitOfWork` is the seam
that lets Application call only one method to commit changes from
several repositories.

---

## 6.7 The JWT token service

The token service is the second-most-likely place in the project where
a wrong line silently breaks security. Listing 6.6 shows the correct
shape.

**Listing 6.6 — `Infrastructure/Services/JwtTokenService.cs`.**

```csharp
public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _opt;

    public JwtTokenService(IOptions<JwtOptions> opt) => _opt = opt.Value;

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier,     user.Id.ToString()),
            new Claim(ClaimTypes.Email,              user.Email),
            new Claim(ClaimTypes.Role,               user.Role.ToString()), // ← *important*
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:    _opt.Issuer,
            audience:  _opt.Audience,
            claims:    claims,
            expires:   DateTime.UtcNow.AddMinutes(_opt.ExpiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? Validate(string token) { /* … */ }
}
```

The line marked *important* uses `ClaimTypes.Role`, *not* the literal
string `"role"`. ASP.NET Core's `[Authorize(Roles="Admin")]` reads
`ClaimTypes.Role`. A custom `"role"` claim compiles, runs, generates a
plausible-looking token, and silently denies every authorized request.
This is the single most common JWT bug. Chapter 8 returns to it.

---

## 6.8 Password hashing and current-user services

Two more services round out Infrastructure. Both are short.

**Listing 6.7 — `Infrastructure/Services/PasswordHashService.cs`.**

```csharp
public sealed class PasswordHashService : IPasswordHasher
{
    private const int WorkFactor = 12;   // ~250ms per hash on modern CPUs

    public string Hash(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string hash)
        => BCrypt.Net.BCrypt.Verify(password, hash);
}
```

A work factor of 12 is the deliberate slowness that resists brute
force. Lower than 10 and offline attacks become tractable; higher than
13 and login starts to feel sluggish. Chapter 8 discusses the
trade-off.

**Listing 6.8 — `Infrastructure/Services/CurrentUserService.cs`.**

```csharp
public sealed class CurrentUserService : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserService(IHttpContextAccessor accessor) => _accessor = accessor;

    public Guid? UserId
    {
        get
        {
            var raw = _accessor.HttpContext?.User
                .FindFirstValue(ClaimTypes.NameIdentifier)
                ?? _accessor.HttpContext?.User
                    .FindFirstValue(JwtRegisteredClaimNames.Sub);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public string? Email
        => _accessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    public bool IsAdmin
        => _accessor.HttpContext?.User.IsInRole(UserRole.Admin.ToString()) == true;
}
```

The fallback between `ClaimTypes.NameIdentifier` and `Sub` is not
defensive programming — it is a real interop concern: different
versions of ASP.NET Core's JWT middleware put the user id in different
places.

---

## 6.9 File storage

`FileStorageService` reads and writes files under a configured base
path. The two design points worth noting are that it stores **relative**
paths in the database (so a backup restored on a different machine
still works) and that uploads are streamed (so the API can accept files
larger than memory).

```csharp
public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _basePath;
    public LocalFileStorage(IOptions<FileStorageOptions> opt)
        => _basePath = opt.Value.BasePath;

    public async Task<string> SaveAsync(Stream content, string fileName, CancellationToken ct)
    {
        var safeName = Path.GetFileName(fileName);   // strips path separators
        var rel  = Path.Combine(DateTime.UtcNow.ToString("yyyy/MM"), Guid.NewGuid() + "-" + safeName);
        var full = Path.Combine(_basePath, rel);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        return rel.Replace('\\', '/');
    }

    public Task<Stream> OpenReadAsync(string relativePath, CancellationToken ct)
        => Task.FromResult<Stream>(File.OpenRead(Path.Combine(_basePath, relativePath)));
}
```

> **Pitfall:** `Path.GetFileName(fileName)` is the cheap fix for path
> traversal in user-supplied file names. Without it, a malicious upload
> can write to `..\..\..\Windows\System32\anything.exe`. The fix is one
> method call. The vulnerability has shipped in production code at
> companies you have heard of. Always strip the path.

---

## 6.10 Putting it together — `AddInfrastructure()`

A single extension method registers the entire layer.

**Listing 6.9 — `Infrastructure/DependencyInjection.cs`.**

```csharp
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseSqlServer(config.GetConnectionString("Default")));   // ← only line that names SQL Server

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPasswordHasher, PasswordHashService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICurrentUser, CurrentUserService>();
        services.AddScoped<IFileStorage, LocalFileStorage>();
        services.Configure<JwtOptions>(config.GetSection("Jwt"));
        services.Configure<FileStorageOptions>(config.GetSection("FileStorage"));

        services.AddHttpContextAccessor();

        return services;
    }
}
```

The line marked with the arrow is the *only* place in the entire
codebase that mentions SQL Server. Switching to PostgreSQL is one
change: `UseNpgsql(...)`.

---

## 6.11 Checkpoint

You are ready for Chapter 7 when:

- [ ] `dotnet build src/EBookLibrary.Infrastructure/` succeeds.
- [ ] You can name three reasons to store enums as strings in the DB.
- [ ] You can name the bug that occurs if `JwtTokenService` writes the
      role claim as `"role"` instead of `ClaimTypes.Role`.
- [ ] You can name the path-traversal protection in
      `LocalFileStorage.SaveAsync`.
- [ ] You can locate the single line in `DependencyInjection.cs` that
      would change if the project switched to PostgreSQL.

---

## Key takeaways

- All framework dependencies live in Infrastructure, on purpose.
- Global query filters make soft delete a property of the schema, not
  a habit handlers must remember.
- The repository methods are deliberately *operation-specific*; they
  include exactly the navigation properties the operation needs, and
  no more.
- `ClaimTypes.Role` is the single most consequential string in the JWT
  service. Use the constant, never the literal.
- `Path.GetFileName(userInput)` is the one-line defense against path
  traversal in user-supplied file names.

---

## Exercises

**Easy.** Add `IPublisherRepository` (continuing the exercise from
Chapter 4) with EF Core configuration and registration in
`AddInfrastructure()`. Verify the migration generated in Chapter 9
will pick it up.

**Medium.** Replace the local file storage implementation with one
that writes to Azure Blob Storage (or AWS S3). Verify that no file in
Application or Domain changes as a result. This is the litmus test
for whether infrastructure was properly isolated.

**Hard.** EF Core 10's *Compiled Queries* feature can speed up hot
paths. Identify one repository method (probably
`BookRepository.SearchAsync`) that would benefit and rewrite it as a
compiled query. Measure the difference with BenchmarkDotNet.

---

## Further reading

- Microsoft, *EF Core documentation*.
  <https://docs.microsoft.com/ef/core/>
- Vaughn Vernon, *"Effective Aggregate Design"* (three-part series). The
  background to why repositories are "per aggregate" rather than "per
  entity".
- Andrew Lock, *"Configuring options in ASP.NET Core"*. The
  `IOptions<T>` pattern used here.
- OWASP, *"Path Traversal"* cheat sheet.
  <https://owasp.org/www-community/attacks/Path_Traversal>
