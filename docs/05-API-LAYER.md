# Component 05 — ASP.NET Core Web API Layer

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete ASP.NET Core 10 Web API layer for EBook Library.
> **Session goal:** Generate all controllers, middleware, Program.cs configuration, OpenAPI (Scalar UI) setup, CORS policy, and global error handling.
> **Project:** `src/EBookLibrary.WebApi/` (.NET 10, C# 14, controller-based — NOT minimal APIs)
> **Prerequisites:** Domain (02), Application (03), and Infrastructure (04) layers must exist.

---

## Context

The Web API layer:
- Uses ASP.NET Core 8 **controller-based** API (not minimal APIs)
- Sends all operations through MediatR (clean separation from business logic)
- Returns standardized API responses
- Includes built-in OpenAPI documentation (Scalar UI) with JWT bearer auth
- Handles all HTTP concerns: status codes, content negotiation, validation errors, CORS

---

## Task 1 — Base API Response

### File: `Controllers/ApiControllerBase.cs`

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
    protected ISender Mediator => _mediator ??=
        HttpContext.RequestServices.GetRequiredService<ISender>();
}
```

### File: `Models/ApiResponse.cs` (standardized response envelope)

```csharp
namespace EBookLibrary.WebApi.Models;

/// <summary>Standard API response envelope for all endpoints</summary>
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

---

## Task 2 — Auth Controller

### File: `Controllers/AuthController.cs`

```csharp
using EBookLibrary.Application.Auth.Commands.RegisterUser;
using EBookLibrary.Application.Auth.Commands.LoginUser;
using EBookLibrary.Application.Auth.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Authentication — Register and Login</summary>
[AllowAnonymous]
public class AuthController : ApiControllerBase
{
    /// <summary>Register a new user account</summary>
    /// <response code="201">User registered successfully. Returns JWT token.</response>
    /// <response code="400">Validation errors (invalid email, weak password, etc.)</response>
    /// <response code="409">Email is already registered</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<AuthResponseDto>.Ok(result, "User registered successfully."));
    }

    /// <summary>Authenticate with email and password</summary>
    /// <response code="200">Login successful. Returns JWT token.</response>
    /// <response code="400">Invalid credentials</response>
    /// <response code="403">Account is deactivated</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result));
    }
}
```

---

## Task 3 — Books Controller

### File: `Controllers/BooksController.cs`

```csharp
using EBookLibrary.Application.Books.Commands.CreateBook;
using EBookLibrary.Application.Books.Commands.DeleteBook;
using EBookLibrary.Application.Books.Commands.DownloadBook;
using EBookLibrary.Application.Books.Commands.UpdateBook;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Books.Queries.GetBookById;
using EBookLibrary.Application.Books.Queries.SearchBooks;
using EBookLibrary.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Books catalog — search, view details, and download eBooks</summary>
[Authorize]
public class BooksController : ApiControllerBase
{
    /// <summary>Search books by title, author, genre, or publication year</summary>
    [HttpGet("search")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BookSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] BookSearchFilterDto filter, CancellationToken ct)
    {
        var result = await Mediator.Send(new SearchBooksQuery(filter), ct);
        return Ok(ApiResponse<PagedResult<BookSummaryDto>>.Ok(result));
    }

    /// <summary>Get full details of a book by ID</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<BookDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new GetBookByIdQuery(id), ct);
        return Ok(ApiResponse<BookDto>.Ok(result));
    }

    /// <summary>Download an ePub file. Requires authentication.</summary>
    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new DownloadBookCommand(id), ct);
        var fileBytes = await System.IO.File.ReadAllBytesAsync(result.AbsoluteFilePath, ct);
        return File(fileBytes, "application/epub+zip", result.FileName);
    }

    /// <summary>Create a new book record. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreateBookCommand command, CancellationToken ct)
    {
        var id = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Guid>.Ok(id));
    }

    /// <summary>Update a book record. Admin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBookCommand command, CancellationToken ct)
    {
        await Mediator.Send(command with { BookId = id }, ct);
        return NoContent();
    }

    /// <summary>Soft-delete a book. Admin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new DeleteBookCommand(id), ct);
        return NoContent();
    }
}
```

---

## Task 4 — Authors Controller

### File: `Controllers/AuthorsController.cs`

Generate a full CRUD controller for Authors with these endpoints:
- `GET /api/authors?pageNumber=1&pageSize=20` — get paged list (public)
- `GET /api/authors/{id}` — get by ID (public)
- `POST /api/authors` — create (Admin only)
- `PUT /api/authors/{id}` — update (Admin only)
- `DELETE /api/authors/{id}` — soft delete (Admin only)

Follow the same pattern as BooksController: ApiControllerBase, MediatR, ApiResponse<T> wrapper, proper ProducesResponseType attributes.

---

## Task 5 — Genres Controller

### File: `Controllers/GenresController.cs`

Generate a full CRUD controller for Genres with these endpoints:
- `GET /api/genres` — get all genres, ordered by name (public, no paging — genres are small)
- `GET /api/genres/{id}` — get by ID (public)
- `POST /api/genres` — create (Admin only)
- `PUT /api/genres/{id}` — update (Admin only)
- `DELETE /api/genres/{id}` — soft delete (Admin only)

---

## Task 6 — Users Controller (Admin)

### File: `Controllers/UsersController.cs`

```csharp
namespace EBookLibrary.WebApi.Controllers;

/// <summary>User management — Admin only</summary>
[Authorize(Roles = "Admin")]
public class UsersController(ICurrentUserService currentUser) : ApiControllerBase
{
    /// <summary>Get paged list of all users</summary>
    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await Mediator.Send(new GetUsersPagedQuery(pageNumber, pageSize), ct);
        return Ok(ApiResponse<PagedResult<UserDto>>.Ok(result));
    }

    /// <summary>Change a user's role (Regular ↔ Admin)</summary>
    [HttpPatch("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequest request,
        CancellationToken ct = default)
    {
        await Mediator.Send(new UpdateUserRoleCommand(id, request.NewRole), ct);
        return NoContent();
    }

    /// <summary>Toggle a user's active status (active ↔ inactive)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ToggleStatus(Guid id, CancellationToken ct = default)
    {
        await Mediator.Send(new ToggleUserStatusCommand(id, currentUser.UserId ?? Guid.Empty), ct);
        return NoContent();
    }

    /// <summary>Update a user's profile (name, email, optional password reset)</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request,
        CancellationToken ct = default)
    {
        var result = await Mediator.Send(
            new UpdateUserCommand(id, request.FirstName, request.LastName, request.Email, request.NewPassword), ct);
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    /// <summary>Permanently delete a user</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct = default)
    {
        await Mediator.Send(new DeleteUserCommand(id, currentUser.UserId ?? Guid.Empty), ct);
        return NoContent();
    }
}

public record UpdateUserRoleRequest(string NewRole);
public record UpdateUserRequest(string? FirstName, string? LastName, string Email, string? NewPassword);
```

> **Self-protection:** `ToggleUserStatusCommand` and `DeleteUserCommand` each include `RequestingUserId`. Their validators reject the request with `400 Bad Request` if `UserId == RequestingUserId`, preventing an admin from locking themselves out.

---

## Task 7 — Files Controller (Admin — ePub upload)

### File: `Controllers/FilesController.cs`

```csharp
namespace EBookLibrary.WebApi.Controllers;

/// <summary>Admin — Upload ePub files for books</summary>
[Authorize(Roles = "Admin")]
public class FilesController : ApiControllerBase
{
    /// <summary>Upload an ePub file and associate it with a book</summary>
    [HttpPost("books/{bookId:guid}/upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB limit
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadBookFile(
        Guid bookId,
        IFormFile file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("No file was provided."));

        if (!file.FileName.EndsWith(".epub", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<string>.Fail("Only ePub files are accepted."));

        await using var stream = file.OpenReadStream();
        await Mediator.Send(new UploadBookFileCommand(bookId, stream, file.FileName), ct);
        return Ok(ApiResponse<string>.Ok("File uploaded and associated with book.", "File uploaded successfully."));
    }
}
```

**Also generate:** `Books/Commands/UploadBookFile/UploadBookFileCommand.cs` in the Application layer (if not already done):
```csharp
public record UploadBookFileCommand(Guid BookId, Stream FileStream, string FileName) : IRequest;
// Handler: load book → call fileStorage.SaveBookFileAsync → book.SetFilePath() → save → returns void
```

---

## Task 8 — Global Exception Handling Middleware

### File: `Middleware/ExceptionHandlingMiddleware.cs`

```csharp
using EBookLibrary.Application.Common.Exceptions;
using System.Net;
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
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, errors) = exception switch
        {
            NotFoundException notFound => (HttpStatusCode.NotFound, notFound.Message, (IEnumerable<string>?)null),
            ApplicationValidationException validation => (HttpStatusCode.BadRequest, "Validation failed.",
                validation.Errors.SelectMany(e => e.Value)),
            ForbiddenAccessException forbidden => (HttpStatusCode.Forbidden, forbidden.Message, null),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Authentication required.", null),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.", null)
        };

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            message,
            errors = errors ?? Array.Empty<string>()
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
```

---

## Task 9 — Program.cs

### File: `Program.cs`

```csharp
using EBookLibrary.Application;
using EBookLibrary.Infrastructure;
using EBookLibrary.WebApi.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ────────────────────────────────────────────────────────────────

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontends", policy =>
        policy.WithOrigins(
                builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// JWT Bearer Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
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

// OpenAPI document generation (replaces Swashbuckle)
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, context, ct) =>
    {
        doc.Info = new()
        {
            Title = "EBook Library API",
            Version = "v1",
            Description = "REST API for the EBook Library application. Supports Spanish and English content.",
            Contact = new() { Name = "EBook Library Team" }
        };
        return Task.CompletedTask;
    });

    // Add JWT Bearer security scheme via BearerSecuritySchemeTransformer
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

// ─── Pipeline ────────────────────────────────────────────────────────────────

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                          // serves /openapi/v1.json
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("EBook Library API");
        options.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });                                        // serves /scalar/v1
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontends");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-run migrations on startup (Development only)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await context.Database.MigrateAsync();
}

app.Run();

// Make Program accessible for integration tests
public partial class Program { }
```

---

## Task 10 — WebApi Project File Updates

### Update `EBookLibrary.WebApi.csproj`

Add XML documentation generation:

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

---

## Task 10b — BearerSecuritySchemeTransformer

### File: `OpenApi/BearerSecuritySchemeTransformer.cs`

This class wires JWT Bearer security into the built-in ASP.NET Core OpenAPI document. It replaces the `AddSecurityDefinition` / `AddSecurityRequirement` calls from Swashbuckle.

```csharp
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi.Models;

namespace EBookLibrary.WebApi.OpenApi;

/// <summary>
/// Adds JWT Bearer security scheme and requirement to the generated OpenAPI document.
/// Replaces the Swashbuckle AddSecurityDefinition / AddSecurityRequirement configuration.
/// </summary>
internal sealed class BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider schemeProvider)
    : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken ct)
    {
        var authenticationSchemes = await schemeProvider.GetAllSchemesAsync();
        if (!authenticationSchemes.Any(s => s.Name == "Bearer"))
            return;

        var securityScheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Enter your JWT token. Example: eyJhbGciOi..."
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, OpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = securityScheme;

        var requirement = new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                []
            }
        };

        foreach (var operation in document.Paths.Values.SelectMany(p => p.Operations.Values))
        {
            operation.Security ??= [];
            operation.Security.Add(requirement);
        }
    }
}
```

---

## Task 11 — API Endpoint Reference

| Method | Route | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | /api/auth/register | No | — | Register new user |
| POST | /api/auth/login | No | — | Login, receive JWT |
| GET | /api/books/search | No | — | Search books |
| GET | /api/books/{id} | No | — | Get book details |
| GET | /api/books/{id}/download | Yes | Regular/Admin | Download ePub |
| POST | /api/books | Yes | Admin | Create book |
| PUT | /api/books/{id} | Yes | Admin | Update book |
| DELETE | /api/books/{id} | Yes | Admin | Delete book |
| GET | /api/authors | No | — | List authors, paged |
| GET | /api/authors/{id} | No | — | Get author details |
| POST | /api/authors | Yes | Admin | Create author |
| PUT | /api/authors/{id} | Yes | Admin | Update author |
| DELETE | /api/authors/{id} | Yes | Admin | Delete author |
| GET | /api/genres | No | — | All genres |
| GET | /api/genres/{id} | No | — | Get genre |
| POST | /api/genres | Yes | Admin | Create genre |
| PUT | /api/genres/{id} | Yes | Admin | Update genre |
| DELETE | /api/genres/{id} | Yes | Admin | Delete genre |
| GET | /api/users | Yes | Admin | List users |
| PATCH | /api/users/{id}/role | Yes | Admin | Change user role |
| PATCH | /api/users/{id}/status | Yes | Admin | Toggle active/inactive (self blocked) |
| PUT | /api/users/{id} | Yes | Admin | Update profile (name, email, password) |
| DELETE | /api/users/{id} | Yes | Admin | Permanently delete user (self blocked) |
| POST | /api/files/books/{id}/upload | Yes | Admin | Upload ePub |

---

## Deliverables Checklist

- [ ] `Controllers/ApiControllerBase.cs`
- [ ] `Models/ApiResponse.cs`
- [ ] `Controllers/AuthController.cs`
- [ ] `Controllers/BooksController.cs`
- [ ] `Controllers/AuthorsController.cs`
- [ ] `Controllers/GenresController.cs`
- [ ] `Controllers/UsersController.cs` with GET, PATCH role, PATCH status, PUT, DELETE
- [ ] `Controllers/FilesController.cs`
- [ ] `Middleware/ExceptionHandlingMiddleware.cs`
- [ ] `Program.cs` with full configuration
- [ ] `OpenApi/BearerSecuritySchemeTransformer.cs`
- [ ] CORS, JWT, OpenAPI (Scalar) configured correctly
- [ ] Auto-migration on Dev startup
- [ ] XML docs enabled in project file
- [ ] `dotnet build` succeeds, `dotnet run` starts API on https://localhost:7xxx
- [ ] Scalar UI accessible at `/scalar/v1`

---

*Component 05 of 10 — EBook Library Project*
