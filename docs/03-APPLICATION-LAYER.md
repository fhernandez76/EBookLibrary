# Component 03 — Application Layer (CQRS)

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete Application layer (CQRS with MediatR) for EBook Library.
> **Session goal:** Generate all Commands, Queries, Handlers, DTOs, Validators, Pipeline Behaviors, and service interfaces. No EF Core, no JWT, no file I/O — only orchestration.
> **Project:** `src/EBookLibrary.Application/` (.NET 10, C# 14)
> **Prerequisites:** Domain layer must exist (Component 02).

---

## Context

The Application layer orchestrates use cases by:
1. Receiving commands/queries from the API layer
2. Validating inputs (FluentValidation)
3. Using domain interfaces (repositories, services) to perform operations
4. Returning DTOs to the API layer

**Pattern used:** CQRS via MediatR — Commands mutate state, Queries return data.

---

## Task 1 — Common Infrastructure

### File: `Common/Models/Result.cs`
```csharp
namespace EBookLibrary.Application.Common.Models;

/// <summary>Functional result wrapper to avoid exceptions for expected failures</summary>
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public IEnumerable<string> Errors { get; }

    protected Result(bool isSuccess, T? value, string? error, IEnumerable<string>? errors = null)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
        Errors = errors ?? Enumerable.Empty<string>();
    }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string error) => new(false, default, error);
    public static Result<T> Failure(IEnumerable<string> errors) => new(false, default, null, errors);
}

public class Result : Result<AppUnit>
{
    protected Result(bool isSuccess, string? error) : base(isSuccess, AppUnit.Value, error) { }
    public static Result Success() => new(true, null);
    public new static Result Failure(string error) => new(false, error);
}

/// <summary>Placeholder unit type for void-like results (distinct from MediatR.Unit)</summary>
public record AppUnit
{
    public static readonly AppUnit Value = new();
}
```

### File: `Common/Models/PagedResult.cs`
```csharp
namespace EBookLibrary.Application.Common.Models;

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; init; } = Enumerable.Empty<T>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public static PagedResult<T> Create(IEnumerable<T> items, int totalCount, int pageNumber, int pageSize)
        => new() { Items = items, TotalCount = totalCount, PageNumber = pageNumber, PageSize = pageSize };
}
```

### File: `Common/Exceptions/NotFoundException.cs`
```csharp
namespace EBookLibrary.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string entityName, object key)
        : base($"{entityName} with key '{key}' was not found.") { }
}
```

### File: `Common/Exceptions/ValidationException.cs`
```csharp
namespace EBookLibrary.Application.Common.Exceptions;

public class ApplicationValidationException : Exception
{
    public IDictionary<string, string[]> Errors { get; }

    public ApplicationValidationException(IEnumerable<FluentValidation.Results.ValidationFailure> failures)
        : base("One or more validation failures occurred.")
    {
        Errors = failures
            .GroupBy(e => e.PropertyName, e => e.ErrorMessage)
            .ToDictionary(g => g.Key, g => g.ToArray());
    }
}
```

### File: `Common/Exceptions/ForbiddenAccessException.cs`
```csharp
namespace EBookLibrary.Application.Common.Exceptions;

public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException() : base("You do not have permission to perform this action.") { }
    public ForbiddenAccessException(string message) : base(message) { }
}
```

---

## Task 2 — Service Interfaces

### File: `Common/Interfaces/IJwtTokenService.cs`
```csharp
namespace EBookLibrary.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(Guid userId, string email, string role);
    bool ValidateToken(string token, out Guid userId);
}
```

### File: `Common/Interfaces/IPasswordHashService.cs`
```csharp
namespace EBookLibrary.Application.Common.Interfaces;

public interface IPasswordHashService
{
    string HashPassword(string plainText);
    bool VerifyPassword(string plainText, string hash);
}
```

### File: `Common/Interfaces/IFileStorageService.cs`
```csharp
namespace EBookLibrary.Application.Common.Interfaces;

public interface IFileStorageService
{
    /// <summary>Saves an ePub file stream and returns the relative path stored in the DB</summary>
    Task<string> SaveBookFileAsync(Stream fileStream, string originalFileName, string genreName, CancellationToken ct = default);

    /// <summary>Returns the absolute path for a book so the controller can stream it</summary>
    string GetAbsolutePath(string relativePath);

    bool FileExists(string relativePath);
    Task DeleteFileAsync(string relativePath, CancellationToken ct = default);
}
```

### File: `Common/Interfaces/ICurrentUserService.cs`
```csharp
namespace EBookLibrary.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
}
```

---

## Task 3 — MediatR Pipeline Behaviors

### File: `Common/Behaviors/ValidationBehavior.cs`
```csharp
namespace EBookLibrary.Application.Common.Behaviors;

public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count > 0)
            throw new ApplicationValidationException(failures);

        return await next();
    }
}
```

### File: `Common/Behaviors/LoggingBehavior.cs`
```csharp
namespace EBookLibrary.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);
        var response = await next();
        _logger.LogInformation("Handled {RequestName} successfully", requestName);
        return response;
    }
}
```

---

## Task 4 — Auth DTOs

### File: `Auth/DTOs/AuthResponseDto.cs`
```csharp
namespace EBookLibrary.Application.Auth.DTOs;

public record AuthResponseDto(
    Guid UserId,
    string Email,
    string? FirstName,
    string? LastName,
    string Role,
    string Token,
    DateTime ExpiresAt
);
```

### File: `Auth/DTOs/UserProfileDto.cs`
```csharp
namespace EBookLibrary.Application.Auth.DTOs;

public record UserProfileDto(
    Guid Id,
    string Email,
    string? FirstName,
    string? LastName,
    string Role,
    bool IsActive,
    DateTime CreatedAt
);
```

---

## Task 5 — Auth Commands & Queries

### File: `Auth/Commands/RegisterUser/RegisterUserCommand.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.RegisterUser;

public record RegisterUserCommand(
    string Email,
    string Password,
    string ConfirmPassword,
    string? FirstName,
    string? LastName
) : IRequest<AuthResponseDto>;
```

### File: `Auth/Commands/RegisterUser/RegisterUserCommandValidator.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.RegisterUser;

public class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.")
            .MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Passwords do not match.");

        RuleFor(x => x.FirstName).MaximumLength(100).When(x => x.FirstName is not null);
        RuleFor(x => x.LastName).MaximumLength(100).When(x => x.LastName is not null);
    }
}
```

### File: `Auth/Commands/RegisterUser/RegisterUserCommandHandler.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.RegisterUser;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, AuthResponseDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHashService _passwordHash;
    private readonly IJwtTokenService _jwtService;

    public RegisterUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHashService passwordHash, IJwtTokenService jwtService)
    {
        _unitOfWork = unitOfWork;
        _passwordHash = passwordHash;
        _jwtService = jwtService;
    }

    public async Task<AuthResponseDto> Handle(RegisterUserCommand request, CancellationToken ct)
    {
        if (await _unitOfWork.Users.EmailExistsAsync(request.Email, ct))
            throw new ApplicationValidationException(
                new[] { new FluentValidation.Results.ValidationFailure("Email", "Email is already registered.") });

        var passwordHash = _passwordHash.HashPassword(request.Password);
        var user = User.Create(request.Email, passwordHash);
        user.UpdateProfile(request.FirstName, request.LastName);

        await _unitOfWork.Users.AddAsync(user, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        var token = _jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString());
        return new AuthResponseDto(
            user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), token, DateTime.UtcNow.AddHours(1));
    }
}
```

### File: `Auth/Commands/LoginUser/LoginUserCommand.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.LoginUser;

public record LoginUserCommand(string Email, string Password) : IRequest<AuthResponseDto>;
```

### File: `Auth/Commands/LoginUser/LoginUserCommandValidator.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.LoginUser;

public class LoginUserCommandValidator : AbstractValidator<LoginUserCommand>
{
    public LoginUserCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
```

### File: `Auth/Commands/LoginUser/LoginUserCommandHandler.cs`
```csharp
namespace EBookLibrary.Application.Auth.Commands.LoginUser;

public class LoginUserCommandHandler : IRequestHandler<LoginUserCommand, AuthResponseDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHashService _passwordHash;
    private readonly IJwtTokenService _jwtService;

    public LoginUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHashService passwordHash, IJwtTokenService jwtService)
    {
        _unitOfWork = unitOfWork;
        _passwordHash = passwordHash;
        _jwtService = jwtService;
    }

    public async Task<AuthResponseDto> Handle(LoginUserCommand request, CancellationToken ct)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Email, ct)
            ?? throw new ApplicationValidationException(
                new[] { new FluentValidation.Results.ValidationFailure("Email", "Invalid credentials.") });

        if (!user.IsActive)
            throw new ForbiddenAccessException("Account is deactivated.");

        if (!_passwordHash.VerifyPassword(request.Password, user.PasswordHash))
            throw new ApplicationValidationException(
                new[] { new FluentValidation.Results.ValidationFailure("Password", "Invalid credentials.") });

        var token = _jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString());
        return new AuthResponseDto(
            user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), token, DateTime.UtcNow.AddHours(1));
    }
}
```

---

## Task 6 — Book DTOs

### File: `Books/DTOs/BookDto.cs`
```csharp
namespace EBookLibrary.Application.Books.DTOs;

public record BookDto(
    Guid Id,
    string Title,
    int Pages,
    int? PublicationYear,
    string? Isbn,
    string? Description,
    string? CoverImageUrl,
    string Language,
    string Status,
    bool HasFile,
    IEnumerable<string> Authors,
    IEnumerable<string> Genres
);

public record BookSummaryDto(
    Guid Id,
    string Title,
    int Pages,
    int? PublicationYear,
    string? CoverImageUrl,
    string Status,
    bool HasFile,
    string PrimaryAuthor,
    string PrimaryGenre
);
```

### File: `Books/DTOs/BookSearchFilterDto.cs`
```csharp
namespace EBookLibrary.Application.Books.DTOs;

public record BookSearchFilterDto(
    string? Title = null,
    string? AuthorName = null,
    string? GenreName = null,
    int? PublicationYear = null,
    int PageNumber = 1,
    int PageSize = 20
);
```

---

## Task 7 — Book Queries

### File: `Books/Queries/SearchBooks/SearchBooksQuery.cs`
```csharp
namespace EBookLibrary.Application.Books.Queries.SearchBooks;

public record SearchBooksQuery(BookSearchFilterDto Filter) : IRequest<PagedResult<BookSummaryDto>>;
```

### File: `Books/Queries/SearchBooks/SearchBooksQueryHandler.cs`
```csharp
namespace EBookLibrary.Application.Books.Queries.SearchBooks;

public class SearchBooksQueryHandler : IRequestHandler<SearchBooksQuery, PagedResult<BookSummaryDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public SearchBooksQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<PagedResult<BookSummaryDto>> Handle(SearchBooksQuery request, CancellationToken ct)
    {
        var f = request.Filter;
        var (items, total) = await _unitOfWork.Books.SearchAsync(
            f.Title, f.AuthorName, f.GenreName, f.PublicationYear,
            f.PageNumber, f.PageSize, ct);

        var dtos = _mapper.Map<IEnumerable<BookSummaryDto>>(items);
        return PagedResult<BookSummaryDto>.Create(dtos, total, f.PageNumber, f.PageSize);
    }
}
```

### File: `Books/Queries/GetBookById/GetBookByIdQuery.cs`
```csharp
namespace EBookLibrary.Application.Books.Queries.GetBookById;

public record GetBookByIdQuery(Guid BookId) : IRequest<BookDto>;
```

### File: `Books/Queries/GetBookById/GetBookByIdQueryHandler.cs`
```csharp
namespace EBookLibrary.Application.Books.Queries.GetBookById;

public class GetBookByIdQueryHandler : IRequestHandler<GetBookByIdQuery, BookDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetBookByIdQueryHandler(IUnitOfWork unitOfWork, IMapper mapper) 
        => (_unitOfWork, _mapper) = (unitOfWork, mapper);

    public async Task<BookDto> Handle(GetBookByIdQuery request, CancellationToken ct)
    {
        var book = await _unitOfWork.Books.GetWithDetailsAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);
        return _mapper.Map<BookDto>(book);
    }
}
```

---

## Task 8 — Book Commands

### File: `Books/Commands/CreateBook/CreateBookCommand.cs`
```csharp
namespace EBookLibrary.Application.Books.Commands.CreateBook;

public record CreateBookCommand(
    string Title,
    int Pages,
    int? PublicationYear,
    string? Isbn,
    string? Description,
    string Language,
    List<Guid> AuthorIds,
    List<Guid> GenreIds
) : IRequest<Guid>;
```

### File: `Books/Commands/CreateBook/CreateBookCommandValidator.cs`
```csharp
namespace EBookLibrary.Application.Books.Commands.CreateBook;

public class CreateBookCommandValidator : AbstractValidator<CreateBookCommand>
{
    public CreateBookCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Pages).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PublicationYear)
            .InclusiveBetween(1000, DateTime.UtcNow.Year + 1)
            .When(x => x.PublicationYear.HasValue);
        RuleFor(x => x.Isbn).MaximumLength(20).When(x => x.Isbn is not null);
        RuleFor(x => x.Language).NotEmpty()
            .Must(l => Enum.TryParse<BookLanguage>(l, true, out _))
            .WithMessage("Invalid language. Valid values: Spanish, English, Other.");
        RuleFor(x => x.AuthorIds).NotEmpty().WithMessage("At least one author is required.");
    }
}
```

### File: `Books/Commands/CreateBook/CreateBookCommandHandler.cs`
```csharp
namespace EBookLibrary.Application.Books.Commands.CreateBook;

public class CreateBookCommandHandler : IRequestHandler<CreateBookCommand, Guid>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateBookCommandHandler(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task<Guid> Handle(CreateBookCommand request, CancellationToken ct)
    {
        var language = Enum.Parse<BookLanguage>(request.Language, true);
        var book = Book.Create(request.Title, request.Pages, language);
        book.Update(request.Title, request.Pages, request.PublicationYear,
            request.Isbn, request.Description, language);

        foreach (var authorId in request.AuthorIds)
        {
            var author = await _unitOfWork.Authors.GetByIdAsync(authorId, ct)
                ?? throw new NotFoundException(nameof(Author), authorId);
            book.BookAuthors.Add(BookAuthor.Create(book.Id, authorId, request.AuthorIds.IndexOf(authorId) == 0));
        }

        foreach (var genreId in request.GenreIds)
        {
            await _unitOfWork.Genres.GetByIdAsync(genreId, ct)
                ?? throw new NotFoundException(nameof(Genre), genreId);
            book.BookGenres.Add(BookGenre.Create(book.Id, genreId));
        }

        await _unitOfWork.Books.AddAsync(book, ct);
        await _unitOfWork.SaveChangesAsync(ct);
        return book.Id;
    }
}
```

### File: `Books/Commands/UpdateBook/UpdateBookCommand.cs`

Generate similar to CreateBookCommand. Include BookId as the identifier.

### File: `Books/Commands/DeleteBook/DeleteBookCommand.cs`
```csharp
namespace EBookLibrary.Application.Books.Commands.DeleteBook;

public record DeleteBookCommand(Guid BookId) : IRequest;

public class DeleteBookCommandHandler : IRequestHandler<DeleteBookCommand>
{
    private readonly IUnitOfWork _unitOfWork;
    public DeleteBookCommandHandler(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task Handle(DeleteBookCommand request, CancellationToken ct)
    {
        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);
        book.SoftDelete();
        await _unitOfWork.Books.UpdateAsync(book, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
```

### File: `Books/Commands/DownloadBook/DownloadBookCommand.cs`
```csharp
namespace EBookLibrary.Application.Books.Commands.DownloadBook;

public record DownloadBookCommand(Guid BookId) : IRequest<DownloadBookResult>;

public record DownloadBookResult(string AbsoluteFilePath, string FileName);

public class DownloadBookCommandHandler : IRequestHandler<DownloadBookCommand, DownloadBookResult>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorageService _fileStorage;

    public DownloadBookCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IFileStorageService fileStorage)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _fileStorage = fileStorage;
    }

    public async Task<DownloadBookResult> Handle(DownloadBookCommand request, CancellationToken ct)
    {
        if (!_currentUser.IsAuthenticated)
            throw new ForbiddenAccessException("Authentication required to download books.");

        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);

        if (!book.HasFile)
            throw new NotFoundException("Book file", request.BookId);

        var download = BookDownload.Create(_currentUser.UserId!.Value, book.Id);
        await _unitOfWork.BookDownloads.AddAsync(download, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        var absolutePath = _fileStorage.GetAbsolutePath(book.FilePath!);
        var fileName = Path.GetFileName(absolutePath);
        return new DownloadBookResult(absolutePath, fileName);
    }
}
```

---

## Task 9 — Author & Genre Commands/Queries

Generate the following following the same patterns as Books:

**Authors:**
- `CreateAuthorCommand` / Handler / Validator — inputs: `Name`, `Biography`
- `UpdateAuthorCommand` / Handler / Validator — inputs: `AuthorId`, `Name`, `Biography`
- `DeleteAuthorCommand` / Handler — input: `AuthorId`
- `GetAuthorByIdQuery` / Handler — returns `AuthorDto`
- `GetAuthorsPagedQuery` / Handler — returns `PagedResult<AuthorDto>`

**Genres:**
- `CreateGenreCommand` / Handler / Validator
- `UpdateGenreCommand` / Handler / Validator
- `DeleteGenreCommand` / Handler
- `GetGenreByIdQuery` / Handler
- `GetAllGenresQuery` / Handler — returns `IEnumerable<GenreDto>` (no paging, genres are small)

**DTOs:**
```csharp
public record AuthorDto(Guid Id, string Name, string? Biography, int BookCount);
public record GenreDto(Guid Id, string Name, string? Description, int BookCount);
```

---

## Task 10 — User Admin Commands/Queries

### File: `Users/Commands/UpdateUserRole/UpdateUserRoleCommand.cs`
```csharp
public record UpdateUserRoleCommand(Guid UserId, string NewRole) : IRequest;
```

Handler: load user → validate role string → call `user.ChangeRole()` → save.

### File: `Users/Queries/GetUsersPaged/GetUsersPagedQuery.cs`
```csharp
public record GetUsersPagedQuery(int PageNumber = 1, int PageSize = 20) : IRequest<PagedResult<UserDto>>;
```

`UserDto`:
```csharp
public record UserDto(Guid Id, string Email, string? FirstName, string? LastName, string Role, bool IsActive, DateTime CreatedAt);
```

### File: `Users/Commands/ToggleUserStatus/ToggleUserStatusCommand.cs`
```csharp
public record ToggleUserStatusCommand(Guid UserId, Guid RequestingUserId) : IRequest;
```

Validator: `UserId != RequestingUserId` ("You cannot change the active status of your own account.")  
Handler: load user → if active call `user.Deactivate()` else call `user.Activate()` → `UpdateAsync` → `SaveChangesAsync`.

### File: `Users/Commands/UpdateUser/UpdateUserCommand.cs`
```csharp
public record UpdateUserCommand(
    Guid UserId, string? FirstName, string? LastName,
    string Email, string? NewPassword) : IRequest<UserDto>;
```

Handler:
1. Load user (404 if not found)
2. If email changed: check uniqueness → `user.UpdateEmail(email)`
3. `user.UpdateProfile(firstName, lastName)`
4. If `NewPassword` not null: `user.ResetPassword(passwordHashService.HashPassword(newPassword))`
5. `UpdateAsync` → `SaveChangesAsync` → return `UserDto`

### File: `Users/Commands/DeleteUser/DeleteUserCommand.cs`
```csharp
public record DeleteUserCommand(Guid UserId, Guid RequestingUserId) : IRequest;
```

Validator: `UserId != RequestingUserId` ("You cannot delete your own account.")  
Handler: load user → `DeleteAsync(user)` → `SaveChangesAsync`.

---

## Task 11 — AutoMapper Profile

### File: `Common/Mappings/MappingProfile.cs`

> **Note:** All destination types are positional C# records. AutoMapper 13 resolves constructor
> parameters exclusively via `ForCtorParam` — `ForMember` is silently ignored for positional records
> because they have no settable properties. Every custom mapping must therefore use `ForCtorParam`
> with the exact PascalCase parameter name as declared in the record constructor.

```csharp
namespace EBookLibrary.Application.Common.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Book → BookDto  (positional record — must use ForCtorParam throughout)
        CreateMap<Book, BookDto>()
            .ForCtorParam("CoverImageUrl", o => o.MapFrom(s => s.CoverImagePath))
            .ForCtorParam("Language",      o => o.MapFrom(s => s.Language.ToString()))
            .ForCtorParam("Status",        o => o.MapFrom(s => s.Status.ToString()))
            .ForCtorParam("Authors",       o => o.MapFrom(s => s.BookAuthors.Select(ba => ba.Author.Name)))
            .ForCtorParam("Genres",        o => o.MapFrom(s => s.BookGenres.Select(bg => bg.Genre.Name)));

        // Book → BookSummaryDto  (positional record — must use ForCtorParam throughout)
        CreateMap<Book, BookSummaryDto>()
            .ForCtorParam("CoverImageUrl",  o => o.MapFrom(s => s.CoverImagePath))
            .ForCtorParam("Status",         o => o.MapFrom(s => s.Status.ToString()))
            .ForCtorParam("PrimaryAuthor",  o => o.MapFrom(s =>
                s.BookAuthors.Where(ba => ba.IsPrimary).Select(ba => ba.Author.Name).FirstOrDefault() ?? "Unknown"))
            .ForCtorParam("PrimaryGenre",   o => o.MapFrom(s =>
                s.BookGenres.Select(bg => bg.Genre.Name).FirstOrDefault() ?? "Unknown"));

        // Author → AuthorDto  (positional record)
        CreateMap<Author, AuthorDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.BookAuthors.Count));

        // Genre → GenreDto  (positional record)
        CreateMap<Genre, GenreDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.BookGenres.Count));

        // User → UserDto / UserProfileDto  (positional records)
        CreateMap<User, UserDto>()
            .ForCtorParam("Role", o => o.MapFrom(s => s.Role.ToString()));
        CreateMap<User, UserProfileDto>()
            .ForCtorParam("Role", o => o.MapFrom(s => s.Role.ToString()));
    }
}
```

---

## Task 12 — Dependency Injection

### File: `DependencyInjection.cs`
```csharp
namespace EBookLibrary.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        services.AddAutoMapper(assembly);
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
```

---

## Deliverables Checklist

- [ ] `Common/Models/Result.cs` and `PagedResult.cs`
- [ ] `Common/Exceptions/` — 3 exception classes
- [ ] `Common/Interfaces/` — 4 service interfaces
- [ ] `Common/Behaviors/` — ValidationBehavior, LoggingBehavior
- [ ] `Common/Mappings/MappingProfile.cs`
- [ ] `DependencyInjection.cs` static extension method
- [ ] Auth: RegisterUser, LoginUser commands + GetCurrentUser query with validators & handlers
- [ ] Books: SearchBooks, GetBookById queries + CreateBook, UpdateBook, DeleteBook, DownloadBook commands
- [ ] Authors: CRUD commands + paged query
- [ ] Genres: CRUD commands + list query
- [ ] Users: UpdateUserRole command + paged query
- [ ] Users: ToggleUserStatus, UpdateUser, DeleteUser commands
- [ ] All DTOs defined
- [ ] `dotnet build` on Application project succeeds

---

*Component 03 of 10 — EBook Library Project*
