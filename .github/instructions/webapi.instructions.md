---
applyTo: "**/EBookLibrary.WebApi/**"
---

# WebApi layer

Composition root + HTTP surface. References Application and Infrastructure.

## Controllers

- Inherit from `ControllerBase`, decorated `[ApiController]`, `[Route("api/[controller]")]`.
- Constructor injects `ISender` (MediatR) — and nothing else by default.
- Method bodies should be 1–5 lines: build the command/query, send it, wrap
  the result in `ApiResponse<T>`.

```csharp
[HttpGet("{id:guid}")]
public async Task<ActionResult<ApiResponse<BookDto>>> GetById(Guid id, CancellationToken ct)
{
    var result = await _sender.Send(new GetBookByIdQuery(id), ct);
    return result.ToActionResult();   // extension that maps Result<T> → ActionResult
}
```

## Response envelope

- Success: `ApiResponse<T>.Ok(data)`.
- Failure: `ApiResponse.Fail(errors)` with appropriate status code (400, 404, 409, 401, 403).
- Never return a raw entity or DTO without the envelope.

## Authorization

- Default: `[Authorize]` on the controller, `[AllowAnonymous]` on specific
  endpoints (login, register, public catalogue).
- Roles: `[Authorize(Roles = "Admin")]` — strings match `ClaimTypes.Role`
  values issued by `JwtService`.
- Read current user via `ICurrentUserService` injected into Application
  handlers, **not** via `HttpContext` in handlers.

## Middleware order (Program.cs)

1. `UseSerilogRequestLogging()` (or built-in)
2. `UseExceptionHandling()` — custom middleware mapping
   `ApplicationValidationException`, `NotFoundException`, etc., to
   `ApiResponse.Fail` JSON.
3. `UseCors(...)` — origins from `AllowedOrigins` config.
4. `UseAuthentication()`
5. `UseAuthorization()`
6. `MapControllers()`
7. Scalar OpenAPI UI mapped at `/scalar/v1`.

## Configuration

- `appsettings.json` ships with safe placeholders.
- Real secrets via user-secrets in dev, env vars (`JwtSettings__SecretKey`) in
  prod. **Never** commit a real key.

## OpenAPI / Scalar

- XML doc comments are emitted (`<GenerateDocumentationFile>true`).
- Add `<summary>` and `<response>` tags on every endpoint.
