# Chapter 7 — The Web API

> *"The controller's job is to translate HTTP into application
> commands and back. Anything more is misplaced."*

---

## What you will learn

- How to keep controllers thin by delegating every operation to a
  MediatR command or query.
- How a single response envelope (`ApiResponse<T>`) gives every
  endpoint the same shape and frees frontends from per-endpoint error
  handling.
- How exception-handling middleware translates Application exceptions
  into HTTP status codes in *one* place.
- How the ASP.NET Core middleware pipeline must be assembled — and the
  one ordering bug that silently breaks authorization.
- How CORS, JWT bearer authentication, and rate limiting fit into
  `Program.cs`.

---

## 7.1 The controller's job — and only its job

The Web API has two jobs and only two: receive HTTP, return HTTP.
Everything between those bookends is delegated.

A controller in this project does five things:

1. Maps a route + verb to a method.
2. Reads the request body, route values, and query string into a
   request object.
3. Sends that object to MediatR with `await Sender.Send(request)`.
4. Wraps the result in an `ApiResponse<T>` envelope.
5. Returns an HTTP status code.

That is the whole job. A controller method that is more than a dozen
lines long is doing something the controller should not be doing.

![Figure 7.1 — Sequence: a request flowing through the API pipeline.](figures/11-seq-api-pipeline.jpg)

---

## 7.2 The response envelope

Every endpoint in the API returns the same JSON shape: a top-level
object with `success`, `data`, and `errors`. The frontends rely on
that uniformity. They do not have to write per-endpoint shape
adapters.

**Listing 7.1 — `WebApi/Models/ApiResponse.cs`.**

```csharp
public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public T?   Data    { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = Array.Empty<string>();

    public static ApiResponse<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public static ApiResponse<T> Fail(params string[] errors) =>
        new() { Success = false, Errors = errors };
}
```

A successful search returns `200 OK` with
`{ success: true, data: { items: [...], totalCount: 42 } }`. A
validation failure returns `400 Bad Request` with
`{ success: false, errors: ["Title is required."] }`. The HTTP status
code is the *primary* signal; the `success` field is the *redundant*
one for code paths where status code is awkward to inspect.

> **In Practice:** Some teams reject envelopes on the grounds that
> "the HTTP status code should be enough". They are not wrong, but
> they assume every consumer is a careful HTTP client. In practice
> JavaScript fetch chains, mobile clients, and integration tests all
> benefit from being able to read `response.success` without checking
> the status code first. Pick a convention and stick with it.

---

## 7.3 A representative controller

`AuthController` is short enough to read in full.

**Listing 7.2 — `WebApi/Controllers/AuthController.cs`.**

```csharp
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly ISender _sender;
    public AuthController(ISender sender) => _sender = sender;

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<RegisterResponse>>> Register(
        RegisterUserCommand cmd, CancellationToken ct)
    {
        var result = await _sender.Send(cmd, ct);
        return result.IsSuccess
            ? StatusCode(201, ApiResponse<RegisterResponse>.Ok(result.Value!))
            : BadRequest(ApiResponse<RegisterResponse>.Fail(result.Errors.ToArray()));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        LoginUserCommand cmd, CancellationToken ct)
    {
        var result = await _sender.Send(cmd, ct);
        return result.IsSuccess
            ? Ok(ApiResponse<LoginResponse>.Ok(result.Value!))
            : Unauthorized(ApiResponse<LoginResponse>.Fail(result.Errors.ToArray()));
    }
}
```

Notice what is *not* in this file: no validation logic, no password
checks, no JWT generation, no database access. Every one of those lives
in the handler the controller dispatches to. The controller's
five-line method maps HTTP to a command and back.

---

## 7.4 The exception middleware

Some failures cannot be returned as `Result<T>` — a database connection
drop, a serialization bug, a `NullReferenceException` from a third
party. These bubble out as exceptions and are caught in *one* place.

**Listing 7.3 — `WebApi/Middleware/ExceptionHandlingMiddleware.cs` (abridged).**

```csharp
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _log;

    public ExceptionHandlingMiddleware(RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> log)
    { _next = next; _log = log; }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await _next(ctx); }
        catch (ApplicationValidationException vex)
        { await Write(ctx, 400, vex.Errors.Select(e => e.ErrorMessage).ToArray()); }
        catch (NotFoundException nf)
        { await Write(ctx, 404, nf.Message); }
        catch (UnauthorizedAccessException) 
        { await Write(ctx, 401, "Unauthorized."); }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled exception");
            await Write(ctx, 500, "An unexpected error occurred.");
        }
    }

    private static Task Write(HttpContext ctx, int code, params string[] errors)
    {
        ctx.Response.StatusCode = code;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsJsonAsync(
            ApiResponse<object>.Fail(errors));
    }
}
```

The unhandled-exception branch logs with structured logging (Serilog
in this project) and returns a generic 500. **Never** echo the
exception message back to the client; it leaks information about your
internals.

> **Pitfall:** A common pattern in early controllers is
> `try { ... } catch (Exception ex) { return BadRequest(ex.Message); }`.
> Two things wrong: the message often contains the SQL that failed,
> the stack trace, or other internals; and the controller has now
> reinvented exception middleware in fifteen places. Catch in one
> place, log there, return a sanitized message.

---

## 7.5 The middleware pipeline order

ASP.NET Core's middleware is a sequence — the order in which it is
registered is the order in which it runs. Get it wrong and seemingly
unrelated things break.

**Listing 7.4 — `WebApi/Program.cs` (middleware section).**

```csharp
var app = builder.Build();

app.UseSerilogRequestLogging();              // 1. observe everything that happens
app.UseMiddleware<ExceptionHandlingMiddleware>(); // 2. catch everything that throws
app.UseHttpsRedirection();                   // 3. enforce TLS
app.UseCors("DefaultPolicy");                // 4. CORS preflight
app.UseAuthentication();                     // 5. WHO is the caller?
app.UseAuthorization();                      // 6. is the caller ALLOWED?
app.UseRateLimiter();                        // 7. throttle abusers
app.MapControllers();                        // 8. route to a controller
app.MapScalarApiReference();                 // 9. /scalar UI
app.Run();
```

The order matters in three places.

- **CORS *before* Authentication.** The browser preflights a
  cross-origin request with an `OPTIONS` call. If the auth middleware
  runs first, it returns 401 to that preflight (it has no token yet),
  and the request never reaches CORS. The browser sees a CORS error
  and the bug looks like a missing CORS header.
- **Authentication *before* Authorization.** Authorization needs to
  know *who* the caller is to decide *what* they may do. Reversing the
  pair makes every `[Authorize]` silently allow anonymous traffic.
- **Exception middleware as early as possible.** It must wrap
  everything that can throw, including authentication.

> **Pitfall:** The `UseAuthorization` before `UseAuthentication`
> mistake is the *single* most common ASP.NET Core configuration bug.
> The build is green, the app runs, the controllers respond — and
> every protected endpoint is wide open. Treat this listing as canon.

---

## 7.6 JWT and CORS configuration

Two more `Program.cs` blocks deserve highlighting. Both go *before*
`builder.Build()`.

**Listing 7.5 — `WebApi/Program.cs` (JWT registration).**

```csharp
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer   = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Secret"]!)),
            ClockSkew = TimeSpan.FromSeconds(30),   // tighter than the default 5 minutes
        };
    });

builder.Services.AddAuthorization();
```

**Listing 7.6 — `WebApi/Program.cs` (CORS registration).**

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy => policy
        .WithOrigins(
            "http://localhost:5173",   // React dev server
            "https://localhost:7278")  // Blazor dev server
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());          // because of httpOnly cookies in v2
});
```

> **Pitfall:** `AllowAnyOrigin()` and `AllowCredentials()` are
> mutually exclusive in the HTTP CORS specification. Using both
> compiles, runs, and silently drops the credentials. The fix is to
> name origins explicitly with `WithOrigins(...)`.

---

## 7.7 Wiring it all together

The full `Program.cs` is shorter than it looks. Listing 7.7 shows the
top of the file, before the middleware pipeline in Listing 7.4.

**Listing 7.7 — `WebApi/Program.cs` (services section).**

```csharp
var builder = WebApplication.CreateBuilder(args);

// Logging — Serilog is configured from appsettings.json.
builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

// Cross-cutting infrastructure (Chapter 6).
builder.Services.AddInfrastructure(builder.Configuration);

// Application layer (Chapter 5).
builder.Services.AddApplication();

// MVC + JSON.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy =
        JsonNamingPolicy.CamelCase);

// JWT, CORS, rate limiting (Listings 7.5, 7.6, and similarly).
ConfigureJwt(builder);
ConfigureCors(builder);
ConfigureRateLimiting(builder);

// OpenAPI 3.1 + Scalar UI.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
```

`AddApplication()` and `AddInfrastructure()` are the two extension
methods from Chapters 5 and 6. They make the project's layered
structure visible in `Program.cs`: the API does not register Domain
types directly, only the bundles offered by the layers below it.

---

## 7.8 The OpenAPI surface

The project uses **Scalar** as its OpenAPI UI rather than Swagger UI.
The choice is mostly aesthetic — Scalar's UI is more modern — but it
also handles OpenAPI 3.1 natively, which Swagger UI does not yet do.

In development, opening `https://localhost:5149/scalar/v1` shows every
endpoint, its parameters, and a request playground. The OpenAPI JSON
is generated from controller attributes plus the
`Microsoft.AspNetCore.OpenApi` source generators; it is not
hand-maintained.

> **Architect's Note:** OpenAPI is a contract. Once a frontend depends
> on the shape your API publishes, breaking changes to that shape are
> production incidents in slow motion. Treat the OpenAPI document the
> way you treat a public NuGet package: backwards-compatible by
> default, semver bump for breaking changes, and a release note when
> something changes.

---

## 7.9 Checkpoint

You are ready for Chapter 8 when:

- [ ] `dotnet run --project src/EBookLibrary.WebApi/` starts and
      `/scalar/v1` loads.
- [ ] `GET /api/books/search` returns
      `{ "success": true, "data": { "items": [], ... } }` (the catalog
      is empty until Chapter 9 seeds it).
- [ ] You can recite the eight middleware in Listing 7.4 in order
      without consulting the chapter.
- [ ] You can name the CORS bug that follows from
      `AllowAnyOrigin().AllowCredentials()`.
- [ ] You can name the authorization bug that follows from
      registering `UseAuthorization()` before `UseAuthentication()`.

---

## Key takeaways

- Controllers are dispatchers. Every method dispatches a MediatR
  command or query, wraps the result in `ApiResponse<T>`, and returns.
- `ApiResponse<T>` gives every endpoint the same shape and frees
  frontends from per-endpoint error handling.
- Exception middleware catches in one place, logs there, and returns a
  *sanitized* message to the client. Never echo internals.
- Middleware ordering matters in three places: CORS before
  Authentication, Authentication before Authorization, exception
  handling early.
- Scalar replaces Swagger UI; OpenAPI is a contract worth versioning
  with the same care as a public NuGet package.

---

## Exercises

**Easy.** Add a `HealthController` with `GET /api/health` returning
`200 OK` with `{ "status": "ok", "version": "1.0.0" }`. This endpoint
needs no auth and no MediatR; it is the one acceptable controller in
the project that does not delegate.

**Medium.** The exception middleware currently maps four exception
types to status codes. Add a fifth — `ConcurrencyException` — that
maps to `409 Conflict`. Decide where in Application or Infrastructure
that exception would be thrown.

**Hard.** Replace the response envelope with the Internet
Engineering Task Force's standard *Problem Details* format
(RFC 7807). Discuss what is gained (interoperability) and what is lost
(consistency between success and failure responses). The exercise is a
microcosm of the build-versus-adopt-standard tension that recurs in
API design.

---

## Further reading

- Microsoft, *ASP.NET Core middleware*.
  <https://docs.microsoft.com/aspnet/core/fundamentals/middleware/>
- IETF, *RFC 7807: Problem Details for HTTP APIs.*
- Andrew Lock, *"Versioning APIs in ASP.NET Core"*.
- Scalar OpenAPI UI documentation.
  <https://scalar.com/>
