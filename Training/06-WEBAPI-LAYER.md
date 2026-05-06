# Chapter 06 — Web API Layer

> *"The controller's only job is to translate HTTP into a command, and a result into HTTP."*

---

## Chapter Objectives

By the end of this chapter you will:
- Have a fully functional ASP.NET Core 10 Web API with all 6 controllers
- Understand the `ApiResponse<T>` envelope pattern
- Have global exception handling middleware converting exceptions to structured JSON
- Have JWT authentication and CORS configured in `Program.cs`
- Have Scalar (OpenAPI) documentation available at `/scalar`

---

## 6.1 The Controller's Role

Controllers in Clean Architecture should be **thin**. They:
1. Receive an HTTP request
2. Create a command or query object
3. Send it through MediatR
4. Convert the result to an HTTP response

```csharp
// A well-designed controller action: 5 lines, zero business logic
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterUserCommand command, CancellationToken ct)
{
    var result = await Mediator.Send(command, ct);
    return StatusCode(201, ApiResponse<AuthResponseDto>.Ok(result));
}
```

All business logic lives in the Application layer handlers — the controller knows nothing about email validation, password hashing, or JWT generation.

---

## 6.2 The API Response Envelope

Every endpoint returns a standardized wrapper so clients can always rely on the same shape:

**File:** `src/EBookLibrary.WebApi/Models/ApiResponse.cs`

```csharp
namespace EBookLibrary.WebApi.Models;

/// <summary>Standard response envelope for all API endpoints</summary>
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public IEnumerable<string>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string error)
        => new() { Success = false, Errors = new[] { error } };

    public static ApiResponse<T> Fail(IEnumerable<string> errors)
        => new() { Success = false, Errors = errors };
}
```

**Example responses:**

```json
// Success
{ "success": true, "data": { "id": "...", "title": "Don Quixote" }, "message": null, "errors": null }

// Failure
{ "success": false, "data": null, "message": null, "errors": ["Email already registered."] }
```

This consistency means frontend code only needs one error-handling pattern for all endpoints.

---

## 6.3 Base Controller

**File:** `src/EBookLibrary.WebApi/Controllers/ApiControllerBase.cs`

```csharp
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _mediator;

    // Lazy-loaded MediatR sender — avoids constructor injection in every controller
    protected ISender Mediator =>
        _mediator ??= HttpContext.RequestServices.GetRequiredService<ISender>();
}
```

> **Why lazy load MediatR?** Injecting `ISender` in every controller constructor adds boilerplate. The lazy property resolves it from the DI container on first use, keeping derived controllers clean.

---

## 6.4 Auth Controller

**File:** `src/EBookLibrary.WebApi/Controllers/AuthController.cs`

```csharp
using EBookLibrary.Application.Auth.Commands.LoginUser;
using EBookLibrary.Application.Auth.Commands.RegisterUser;
using EBookLibrary.Application.Auth.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Authentication — Register and Login</summary>
[AllowAnonymous]
public class AuthController : ApiControllerBase
{
    /// <summary>Register a new user account</summary>
    /// <response code="201">User registered. Returns JWT token.</response>
    /// <response code="400">Validation error or email already registered.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<AuthResponseDto>.Ok(result, "Account created successfully."));
    }

    /// <summary>Authenticate with email and password</summary>
    /// <response code="200">Login successful. Returns JWT token.</response>
    /// <response code="401">Invalid credentials or inactive account.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result));
    }
}
```

---

## 6.5 Books Controller

**File:** `src/EBookLibrary.WebApi/Controllers/BooksController.cs`

```csharp
using EBookLibrary.Application.Books.Commands.CreateBook;
using EBookLibrary.Application.Books.Commands.DeleteBook;
using EBookLibrary.Application.Books.Commands.DownloadBook;
using EBookLibrary.Application.Books.Commands.UpdateBook;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Books.Queries.GetBookById;
using EBookLibrary.Application.Books.Queries.SearchBooks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

[Authorize]
public class BooksController : ApiControllerBase
{
    /// <summary>Search books by title, author, genre, or publication year</summary>
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search([FromQuery] BookSearchFilterDto filter, CancellationToken ct)
    {
        var result = await Mediator.Send(new SearchBooksQuery(filter), ct);
        return Ok(ApiResponse<PagedResult<BookSummaryDto>>.Ok(result));
    }

    /// <summary>Get full details for a specific book</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new GetBookByIdQuery(id), ct);
        return Ok(ApiResponse<BookDetailDto>.Ok(result));
    }

    /// <summary>Download an ePub file (authenticated users only)</summary>
    [HttpPost("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var filePath = await Mediator.Send(new DownloadBookCommand(id), ct);
        var fileName = Path.GetFileName(filePath);
        return PhysicalFile(filePath, "application/epub+zip", fileName);
    }

    // Admin endpoints
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateBookCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(201, ApiResponse<BookDetailDto>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBookCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command with { BookId = id }, ct);
        return Ok(ApiResponse<BookDetailDto>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new DeleteBookCommand(id), ct);
        return NoContent();
    }
}
```

---

## 6.5b Users Controller — Admin Management

The `UsersController` provides full admin user management. It injects `ICurrentUserService` to enforce self-protection rules.

**File:** `src/EBookLibrary.WebApi/Controllers/UsersController.cs`

```csharp
[Authorize(Roles = "Admin")]
public class UsersController(ICurrentUserService currentUser) : ApiControllerBase
{
    [HttpGet]                          // GET  /api/users?pageNumber=1&pageSize=20
    [HttpPatch("{id:guid}/role")]      // PATCH /api/users/{id}/role
    [HttpPatch("{id:guid}/status")]    // PATCH /api/users/{id}/status  → 400 if self
    [HttpPut("{id:guid}")]             // PUT   /api/users/{id}          → 200 + UserDto
    [HttpDelete("{id:guid}")]          // DELETE /api/users/{id}         → 400 if self
}
```

| Endpoint | Body | Response | Notes |
|---|---|---|---|
| `GET /api/users` | — | `PagedResult<UserDto>` | Paged list |
| `PATCH .../role` | `{ "newRole": "Admin" }` | 204 | Toggle role |
| `PATCH .../status` | — | 204 | Toggle active; 400 if self |
| `PUT .../{id}` | `{ firstName, lastName, email, newPassword? }` | 200 + UserDto | Full profile update |
| `DELETE .../{id}` | — | 204 | Hard delete; 400 if self |

> **Self-protection:** The validator on `ToggleUserStatusCommand` and `DeleteUserCommand` rejects the request with `400 Bad Request` when `UserId == RequestingUserId`. The React and Blazor UIs additionally disable those buttons for the current user's row.

---

## 6.6 Exception Handling Middleware

Without this middleware, unhandled exceptions would return a raw 500 with a stack trace — exposing internal details to clients.

**File:** `src/EBookLibrary.WebApi/Middleware/ExceptionHandlingMiddleware.cs`

```csharp
using EBookLibrary.Application.Common.Exceptions;
using System.Text.Json;

namespace EBookLibrary.WebApi.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, errors) = exception switch
        {
            ApplicationValidationException ve =>
                (StatusCodes.Status400BadRequest, "Validation failed",
                 ve.Errors.SelectMany(e => e.Value)),

            NotFoundException nfe =>
                (StatusCodes.Status404NotFound, nfe.Message, Enumerable.Empty<string>()),

            UnauthorizedAccessException uae =>
                (StatusCodes.Status401Unauthorized, uae.Message, Enumerable.Empty<string>()),

            ForbiddenAccessException =>
                (StatusCodes.Status403Forbidden, "Access denied.", Enumerable.Empty<string>()),

            InvalidOperationException ioe =>
                (StatusCodes.Status400BadRequest, ioe.Message, Enumerable.Empty<string>()),

            _ =>
                (StatusCodes.Status500InternalServerError, "An unexpected error occurred.",
                 Enumerable.Empty<string>())
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var response = new
        {
            success = false,
            message,
            errors = errors.Any() ? errors : null
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
    }
}
```

---

## 6.7 Program.cs — The Composition Root

`Program.cs` is the **composition root** — the single place where the entire application is assembled. Every service registration, middleware, and configuration happens here.

**File:** `src/EBookLibrary.WebApi/Program.cs`

```csharp
using EBookLibrary.Application;
using EBookLibrary.Infrastructure;
using EBookLibrary.WebApi.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ──────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ── Application Layers ───────────────────────────────────────────────────────
builder.Services.AddApplication();       // MediatR, FluentValidation, AutoMapper
builder.Services.AddInfrastructure(builder.Configuration);  // EF Core, repos, services

// ── Authentication ───────────────────────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSettings["Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontends", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",   // React (Vite dev server)
                "https://localhost:7278")  // Blazor dev server
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Controllers & OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Middleware Pipeline ───────────────────────────────────────────────────────
// Order matters! Exception handling must be first (outermost)
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opts =>
    {
        opts.Title = "EBook Library API";
        opts.Theme = ScalarTheme.DeepSpace;
        opts.DefaultHttpClient = new(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontends");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Make Program accessible for WebApplicationFactory in integration tests
public partial class Program { }
```

---

## 6.8 appsettings.json Configuration

**File:** `src/EBookLibrary.WebApi/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
  },
  "JwtSettings": {
    "SecretKey": "REPLACE_WITH_A_64_CHARACTER_MINIMUM_RANDOM_SECRET_KEY_FOR_DEVELOPMENT",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpiryInMinutes": 60
  },
  "FileStorage": {
    "BasePath": "C:\\EBookFiles",
    "AllowedExtensions": [".epub"],
    "MaxFileSizeBytes": 52428800
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning"
      }
    }
  },
  "AllowedHosts": "*"
}
```

> **Security reminder:** The `SecretKey` must be at minimum 32 characters (256-bit). For production, inject it via environment variable or Azure Key Vault — never commit real secrets to source control.

### Development Secrets (recommended)

```bash
cd src/EBookLibrary.WebApi
dotnet user-secrets init
dotnet user-secrets set "JwtSettings:SecretKey" "your-local-64-char-dev-secret-here-do-not-use-in-prod"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=EBookLibraryDb;..."
```

---

## 6.9 Files Controller (Admin — File Upload)

**File:** `src/EBookLibrary.WebApi/Controllers/FilesController.cs`

```csharp
using EBookLibrary.Application.Books.Commands.UploadBookFile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

[Authorize(Roles = "Admin")]
public class FilesController : ApiControllerBase
{
    private const long MaxFileSize = 50 * 1024 * 1024; // 50 MB

    /// <summary>Upload an ePub file for a book (Admin only)</summary>
    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> Upload(
        [FromForm] Guid bookId,
        [FromForm] string genreName,
        IFormFile file,
        CancellationToken ct)
    {
        if (file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("File is empty."));

        if (!file.FileName.EndsWith(".epub", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only ePub files are allowed."));

        await using var stream = file.OpenReadStream();
        var command = new UploadBookFileCommand(bookId, stream, file.FileName, genreName);
        var filePath = await Mediator.Send(command, ct);

        return Ok(ApiResponse<string>.Ok(filePath, "File uploaded successfully."));
    }
}
```

---

## 6.10 Middleware Pipeline Order

The order of middleware in `Program.cs` is critical. Here's the correct order and why:

```
Request comes in
      ↓
ExceptionHandlingMiddleware    ← FIRST: catches all errors from any layer below
      ↓
UseHttpsRedirection            ← Redirect HTTP → HTTPS
      ↓
UseCors                        ← Handle preflight OPTIONS requests before auth
      ↓
UseAuthentication              ← Parse JWT, populate HttpContext.User
      ↓
UseAuthorization               ← Check [Authorize] attributes
      ↓
MapControllers                 ← Route to controller actions
      ↓
Your controller action runs
```

**Common mistake:** Placing `UseAuthentication` after `UseAuthorization` — authorization will always fail because the user identity is never set.

---

## 6.11 Checkpoint ✅

The Web API layer is complete when:

- [ ] `ApiControllerBase` exists with lazy MediatR property
- [ ] `ApiResponse<T>` exists with `Ok()` and `Fail()` static methods
- [ ] `AuthController` handles `POST /api/auth/register` and `POST /api/auth/login`
- [ ] `BooksController` handles search, GetById, download, and admin CRUD
- [ ] `UsersController` handles GET list, PATCH role, PATCH status, PUT update, DELETE — with self-protection on status/delete
- [ ] `FilesController` handles ePub upload (Admin only)
- [ ] `ExceptionHandlingMiddleware` maps exception types to HTTP status codes
- [ ] `Program.cs` registers Application + Infrastructure services and configures auth
- [ ] `appsettings.json` has all required configuration sections
- [ ] `dotnet run --project src/EBookLibrary.WebApi` starts without errors
- [ ] `https://localhost:7xxx/scalar` shows the API documentation

---

## 6.12 🤖 AI-Assisted Development — Web API Layer

**What Copilot generated well:**
- Controller action methods — clean, thin, correct MediatR dispatch
- `ExceptionHandlingMiddleware` exception type mapping
- `Program.cs` service registration calls

**What required correction:**
- Initial `Program.cs` had middleware in the wrong order — `UseAuthorization` before `UseAuthentication`
- CORS policy initially used `AllowAnyOrigin()` with `AllowCredentials()` — these are mutually exclusive; must use `WithOrigins()` when credentials are needed
- `FilesController` initially lacked `[RequestSizeLimit]`, which would have used the default 28MB limit and failed on large ePub uploads

> **Tip:** Always test the middleware order manually by making authenticated requests. The order bugs don't show up as compilation errors.

---

## Further Reading

- [docs/05-API-LAYER.md](../docs/05-API-LAYER.md) — Original API layer prompt
- [docs/12-API-TESTING-GUIDE.md](../docs/12-API-TESTING-GUIDE.md) — Complete endpoint reference
- ASP.NET Core middleware documentation: https://docs.microsoft.com/aspnet/core/fundamentals/middleware
- Scalar documentation: https://github.com/scalar/scalar

---

**← Previous:** [05 — Infrastructure Layer](05-INFRASTRUCTURE-LAYER.md)  
**Next →** [07 — Authentication](07-AUTHENTICATION.md)
