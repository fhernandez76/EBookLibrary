# Component 04 — Infrastructure Layer

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete Infrastructure layer for EBook Library.
> **Session goal:** Generate EF Core DbContext, entity configurations, repository implementations, JWT service, password hashing service, and file storage service.
> **Project:** `src/EBookLibrary.Infrastructure/` (.NET 10, C# 14)
> **Prerequisites:** Domain layer (Component 02) and Application layer (Component 03) must exist.

---

## Context

The Infrastructure layer:
- Implements all interfaces defined in the Application layer
- Contains the EF Core `AppDbContext` with Fluent API configurations
- Contains repository implementations
- Implements JWT token generation, BCrypt password hashing, and file storage
- Is the only layer that talks to SQL Server and the file system
- Must be DB-agnostic: SQL Server specific code is isolated so switching to PostgreSQL only requires changing provider registration

---

## Task 1 — EF Core DbContext

### File: `Persistence/AppDbContext.cs`

```csharp
using EBookLibrary.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Book> Books => Set<Book>();
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<User> Users => Set<User>();
    public DbSet<BookAuthor> BookAuthors => Set<BookAuthor>();
    public DbSet<BookGenre> BookGenres => Set<BookGenre>();
    public DbSet<BookDownload> BookDownloads => Set<BookDownload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all IEntityTypeConfiguration<T> classes in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global query filters — soft delete
        modelBuilder.Entity<Book>().HasQueryFilter(b => !b.IsDeleted);
        modelBuilder.Entity<Author>().HasQueryFilter(a => !a.IsDeleted);
        modelBuilder.Entity<Genre>().HasQueryFilter(g => !g.IsDeleted);
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-set UpdatedAt for modified entities
        foreach (var entry in ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.State == EntityState.Modified))
        {
            entry.Entity.MarkAsUpdated();
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
```

---

## Task 2 — Entity Configurations (Fluent API)

### File: `Persistence/Configurations/BookConfiguration.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EBookLibrary.Infrastructure.Persistence.Configurations;

public class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Title)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(b => b.Isbn)
            .HasMaxLength(20);

        builder.Property(b => b.Description)
            .HasMaxLength(4000);

        builder.Property(b => b.FilePath)
            .HasMaxLength(1000);

        builder.Property(b => b.CoverImagePath)
            .HasMaxLength(1000);

        builder.Property(b => b.Language)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(b => b.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Indexes
        builder.HasIndex(b => b.Title);
        builder.HasIndex(b => b.Status);
        builder.HasIndex(b => b.IsDeleted);
        builder.HasIndex(b => b.Isbn)
            .IsUnique()
            .HasFilter("[Isbn] IS NOT NULL");

        // Ignore domain events (not persisted)
        builder.Ignore(b => b.DomainEvents);
    }
}
```

### File: `Persistence/Configurations/AuthorConfiguration.cs`

```csharp
public class AuthorConfiguration : IEntityTypeConfiguration<Author>
{
    public void Configure(EntityTypeBuilder<Author> builder)
    {
        builder.ToTable("Authors");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Name).IsRequired().HasMaxLength(300);
        builder.Property(a => a.Biography).HasMaxLength(2000);
        builder.HasIndex(a => a.Name);
        builder.Ignore(a => a.DomainEvents);
    }
}
```

### File: `Persistence/Configurations/GenreConfiguration.cs`

```csharp
public class GenreConfiguration : IEntityTypeConfiguration<Genre>
{
    public void Configure(EntityTypeBuilder<Genre> builder)
    {
        builder.ToTable("Genres");
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Name).IsRequired().HasMaxLength(100);
        builder.Property(g => g.Description).HasMaxLength(500);
        builder.HasIndex(g => g.Name).IsUnique();
        builder.Ignore(g => g.DomainEvents);
    }
}
```

### File: `Persistence/Configurations/UserConfiguration.cs`

```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.PasswordHash).IsRequired().HasMaxLength(500);
        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);
        builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        builder.Ignore(u => u.DomainEvents);
    }
}
```

### File: `Persistence/Configurations/BookAuthorConfiguration.cs`

```csharp
public class BookAuthorConfiguration : IEntityTypeConfiguration<BookAuthor>
{
    public void Configure(EntityTypeBuilder<BookAuthor> builder)
    {
        builder.ToTable("BookAuthors");
        builder.HasKey(ba => new { ba.BookId, ba.AuthorId });

        builder.HasOne(ba => ba.Book)
            .WithMany(b => b.BookAuthors)
            .HasForeignKey(ba => ba.BookId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ba => ba.Author)
            .WithMany(a => a.BookAuthors)
            .HasForeignKey(ba => ba.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

### File: `Persistence/Configurations/BookGenreConfiguration.cs`

```csharp
public class BookGenreConfiguration : IEntityTypeConfiguration<BookGenre>
{
    public void Configure(EntityTypeBuilder<BookGenre> builder)
    {
        builder.ToTable("BookGenres");
        builder.HasKey(bg => new { bg.BookId, bg.GenreId });

        builder.HasOne(bg => bg.Book)
            .WithMany(b => b.BookGenres)
            .HasForeignKey(bg => bg.BookId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(bg => bg.Genre)
            .WithMany(g => g.BookGenres)
            .HasForeignKey(bg => bg.GenreId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

### File: `Persistence/Configurations/BookDownloadConfiguration.cs`

```csharp
public class BookDownloadConfiguration : IEntityTypeConfiguration<BookDownload>
{
    public void Configure(EntityTypeBuilder<BookDownload> builder)
    {
        builder.ToTable("BookDownloads");
        builder.HasKey(d => d.Id);

        builder.HasOne(d => d.User)
            .WithMany(u => u.Downloads)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Book)
            .WithMany(b => b.Downloads)
            .HasForeignKey(d => d.BookId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(d => d.IpAddress).HasMaxLength(45); // IPv6 max length
        builder.HasIndex(d => d.UserId);
        builder.HasIndex(d => d.BookId);
        builder.HasIndex(d => d.DownloadedAt);
    }
}
```

---

## Task 3 — Generic Repository

### File: `Repositories/GenericRepository.cs`

```csharp
namespace EBookLibrary.Infrastructure.Repositories;

public class GenericRepository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    // virtual allows AuthorRepository and GenreRepository to override with eager-loading
    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IEnumerable<T>> GetAllAsync(CancellationToken ct = default)
        => await _dbSet.ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct = default)
        => await _dbSet.AddAsync(entity, ct);

    public Task UpdateAsync(T entity, CancellationToken ct = default)
    {
        _context.Entry(entity).State = EntityState.Modified;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity, CancellationToken ct = default)
    {
        // Soft delete is handled at entity level via SoftDelete()
        _context.Entry(entity).State = EntityState.Modified;
        return Task.CompletedTask;
    }
}
```

### File: `Repositories/BookRepository.cs`

```csharp
namespace EBookLibrary.Infrastructure.Repositories;

public class BookRepository : GenericRepository<Book>, IBookRepository
{
    public BookRepository(AppDbContext context) : base(context) { }

    public async Task<Book?> GetWithDetailsAsync(Guid id, CancellationToken ct = default)
        => await _dbSet
            .Include(b => b.BookAuthors).ThenInclude(ba => ba.Author)
            .Include(b => b.BookGenres).ThenInclude(bg => bg.Genre)
            .FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<(IEnumerable<Book> Items, int TotalCount)> SearchAsync(
        string? title, string? authorName, string? genreName,
        int? publicationYear, int pageNumber, int pageSize,
        CancellationToken ct = default)
    {
        var query = _dbSet
            .Include(b => b.BookAuthors).ThenInclude(ba => ba.Author)
            .Include(b => b.BookGenres).ThenInclude(bg => bg.Genre)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
            query = query.Where(b => b.Title.Contains(title));

        if (!string.IsNullOrWhiteSpace(authorName))
            query = query.Where(b => b.BookAuthors.Any(ba => ba.Author.Name.Contains(authorName)));

        if (!string.IsNullOrWhiteSpace(genreName))
            query = query.Where(b => b.BookGenres.Any(bg => bg.Genre.Name.Contains(genreName)));

        if (publicationYear.HasValue)
            query = query.Where(b => b.PublicationYear == publicationYear.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(b => b.Title)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<bool> ExistsAsync(string title, string authorName, CancellationToken ct = default)
        => await _dbSet.AnyAsync(b =>
            b.Title == title &&
            b.BookAuthors.Any(ba => ba.Author.Name == authorName), ct);
}
```

### File: `Repositories/AuthorRepository.cs`

> **Note:** `GetByIdAsync` is overridden to eager-load `BookAuthors`, and `GetPagedAsync` includes
> the same `.Include` — both are required so AutoMapper can evaluate `AuthorDto.BookCount`
> (`s.BookAuthors.Count`) without encountering a null navigation collection.

```csharp
namespace EBookLibrary.Infrastructure.Repositories;

public class AuthorRepository : GenericRepository<Author>, IAuthorRepository
{
    public AuthorRepository(AppDbContext context) : base(context) { }

    // Override to eager-load BookAuthors so AuthorDto.BookCount can be mapped
    public override async Task<Author?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.Include(a => a.BookAuthors).FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task<Author?> GetByNameAsync(string name, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(a => a.Name == name, ct);

    public async Task<IEnumerable<Author>> SearchByNameAsync(string nameQuery, CancellationToken ct = default)
        => await _dbSet
            .Where(a => a.Name.Contains(nameQuery))
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

    public async Task<(IEnumerable<Author> Items, int TotalCount)> GetPagedAsync(
        int pageNumber, int pageSize, CancellationToken ct = default)
    {
        var total = await _dbSet.CountAsync(ct);
        var items = await _dbSet
            .Include(a => a.BookAuthors)   // required for BookCount mapping
            .OrderBy(a => a.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
```

### File: `Repositories/GenreRepository.cs`

> **Note:** Same pattern as `AuthorRepository` — `GetByIdAsync` is overridden and `GetAllOrderedAsync`
> includes `BookGenres` so `GenreDto.BookCount` (`s.BookGenres.Count`) can be evaluated by AutoMapper.

```csharp
namespace EBookLibrary.Infrastructure.Repositories;

public class GenreRepository : GenericRepository<Genre>, IGenreRepository
{
    public GenreRepository(AppDbContext context) : base(context) { }

    // Override to eager-load BookGenres so GenreDto.BookCount can be mapped
    public override async Task<Genre?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.Include(g => g.BookGenres).FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<Genre?> GetByNameAsync(string name, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(g => g.Name == name, ct);

    public async Task<IEnumerable<Genre>> GetAllOrderedAsync(CancellationToken ct = default)
        => await _dbSet
            .Include(g => g.BookGenres)    // required for BookCount mapping
            .OrderBy(g => g.Name)
            .ToListAsync(ct);
}
```

### File: `Repositories/UserRepository.cs`

Generate UserRepository extending GenericRepository<User> implementing IUserRepository:
- `GetByEmailAsync` — by email (ToLowerInvariant comparison)
- `EmailExistsAsync` — any match
- `GetPagedAsync` — paged sorted by email

### File: `Repositories/BookDownloadRepository.cs`

Generate BookDownloadRepository implementing IBookDownloadRepository (does NOT extend GenericRepository since BookDownload doesn't extend BaseEntity):
- `AddAsync` — adds to DbSet
- `GetByUserAsync` — by userId, ordered by DownloadedAt desc
- `GetByBookAsync` — by bookId
- `CountByBookAsync` — count downloads for a book

---

## Task 4 — Unit of Work

### File: `Persistence/UnitOfWork.cs`

```csharp
namespace EBookLibrary.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public IBookRepository Books { get; }
    public IAuthorRepository Authors { get; }
    public IGenreRepository Genres { get; }
    public IUserRepository Users { get; }
    public IBookDownloadRepository BookDownloads { get; }

    public UnitOfWork(
        AppDbContext context,
        IBookRepository books,
        IAuthorRepository authors,
        IGenreRepository genres,
        IUserRepository users,
        IBookDownloadRepository bookDownloads)
    {
        _context = context;
        Books = books;
        Authors = authors;
        Genres = genres;
        Users = users;
        BookDownloads = bookDownloads;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
        => _transaction = await _context.Database.BeginTransactionAsync(ct);

    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
        if (_transaction is not null)
            await _transaction.CommitAsync(ct);
    }

    public async Task RollbackTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
            await _transaction.RollbackAsync(ct);
    }

    public void Dispose() => _transaction?.Dispose();
}
```

---

## Task 5 — Services

> **Required csproj change:** Before implementing services, add a `FrameworkReference` to the Infrastructure class library so that `IHttpContextAccessor` and `AddHttpContextAccessor()` are available at compile time. Edit `src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj` and add inside the top-level `<Project>` element:
>
> ```xml
> <ItemGroup>
>   <FrameworkReference Include="Microsoft.AspNetCore.App" />
> </ItemGroup>
> ```
>
> This is required because `CurrentUserService` depends on `Microsoft.AspNetCore.Http.IHttpContextAccessor`, which lives in the ASP.NET Core shared framework and is not available in plain class libraries without this reference.

### File: `Services/JwtTokenService.cs`

```csharp
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EBookLibrary.Infrastructure.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings) => _settings = settings.Value;

    public string GenerateToken(Guid userId, string email, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.ExpiryInMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public bool ValidateToken(string token, out Guid userId)
    {
        userId = Guid.Empty;
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_settings.SecretKey);
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _settings.Issuer,
                ValidateAudience = true,
                ValidAudience = _settings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out var validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            userId = Guid.Parse(jwtToken.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
```

### File: `Services/JwtSettings.cs` (options class)

```csharp
namespace EBookLibrary.Infrastructure.Services;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryInMinutes { get; set; } = 60;
}
```

### File: `Services/PasswordHashService.cs`

```csharp
using BCrypt.Net;

namespace EBookLibrary.Infrastructure.Services;

public class PasswordHashService : IPasswordHashService
{
    public string HashPassword(string plainText)
        => BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: 12);

    public bool VerifyPassword(string plainText, string hash)
        => BCrypt.Net.BCrypt.Verify(plainText, hash);
}
```

### File: `Services/FileStorageService.cs`

```csharp
using Microsoft.Extensions.Options;

namespace EBookLibrary.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly FileStorageSettings _settings;

    public FileStorageService(IOptions<FileStorageSettings> settings) => _settings = settings.Value;

    public async Task<string> SaveBookFileAsync(Stream fileStream, string originalFileName,
        string genreName, CancellationToken ct = default)
    {
        // Sanitize file name
        var sanitizedName = SanitizeFileName(Path.GetFileNameWithoutExtension(originalFileName));
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();

        if (!_settings.AllowedExtensions.Contains(extension))
            throw new ArgumentException($"File extension '{extension}' is not allowed.");

        var sanitizedGenre = SanitizeFileName(genreName);
        var relativePath = Path.Combine("books", sanitizedGenre, $"{sanitizedName}{extension}");
        var absolutePath = Path.Combine(_settings.BasePath, relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using var fileOutput = new FileStream(absolutePath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(fileOutput, ct);

        return relativePath.Replace('\\', '/'); // Always store with forward slashes
    }

    public string GetAbsolutePath(string relativePath)
        => Path.Combine(_settings.BasePath, relativePath.Replace('/', Path.DirectorySeparatorChar));

    public bool FileExists(string relativePath)
        => File.Exists(GetAbsolutePath(relativePath));

    public async Task DeleteFileAsync(string relativePath, CancellationToken ct = default)
    {
        var absolutePath = GetAbsolutePath(relativePath);
        if (File.Exists(absolutePath))
            await Task.Run(() => File.Delete(absolutePath), ct);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name
            .ToLowerInvariant()
            .Replace(' ', '-')
            .Where(c => !invalid.Contains(c)));
    }
}
```

### File: `Services/FileStorageSettings.cs`

```csharp
namespace EBookLibrary.Infrastructure.Services;

public class FileStorageSettings
{
    public string BasePath { get; set; } = string.Empty;
    public List<string> AllowedExtensions { get; set; } = new() { ".epub" };
}
```

### File: `Services/CurrentUserService.cs`

```csharp
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace EBookLibrary.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    public Guid? UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("sub");
            return sub is not null && Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email => _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email)
                         ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("email");

    public string? Role => _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role);
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
    public bool IsAdmin => Role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) ?? false;
}
```

---

## Task 6 — Dependency Injection

### File: `DependencyInjection.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EBookLibrary.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // EF Core — SQL Server (DB-agnostic: change UseSqlServer → UseNpgsql for PostgreSQL)
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        // Repositories
        services.AddScoped<IBookRepository, BookRepository>();
        services.AddScoped<IAuthorRepository, AuthorRepository>();
        services.AddScoped<IGenreRepository, GenreRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBookDownloadRepository, BookDownloadRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Services
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPasswordHashService, PasswordHashService>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Options
        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
        services.Configure<FileStorageSettings>(configuration.GetSection("FileStorageSettings"));

        return services;
    }
}
```

---

## Deliverables Checklist

- [ ] `Persistence/AppDbContext.cs` with all DbSets, global query filters, and override SaveChangesAsync
- [ ] `Persistence/Configurations/` — 6 entity configuration files
- [ ] `Persistence/UnitOfWork.cs`
- [ ] `Repositories/GenericRepository.cs`
- [ ] `Repositories/BookRepository.cs` with full-text search
- [ ] `Repositories/AuthorRepository.cs`
- [ ] `Repositories/GenreRepository.cs`
- [ ] `Repositories/UserRepository.cs`
- [ ] `Repositories/BookDownloadRepository.cs`
- [ ] `Services/JwtTokenService.cs` and `JwtSettings.cs`
- [ ] `Services/PasswordHashService.cs` (BCrypt)
- [ ] `Services/FileStorageService.cs` and `FileStorageSettings.cs`
- [ ] `Services/CurrentUserService.cs`
- [ ] `DependencyInjection.cs` extension method
- [ ] `dotnet build` on Infrastructure project succeeds

---

*Component 04 of 10 — EBook Library Project*
