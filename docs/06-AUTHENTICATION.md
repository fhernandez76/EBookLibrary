# Component 06 — JWT Authentication & Authorization

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to implement and verify the complete JWT authentication and authorization system.
> **Session goal:** Ensure the auth flow is fully implemented end-to-end, including token generation, validation, role-based authorization, and security hardening.
> **Prerequisites:** Components 02–05 must exist. This component adds any missing pieces and demonstrates the complete flow.

---

## Context

The authentication system uses:
- **JWT Bearer Tokens** — stateless, stored client-side (Authorization header or localStorage)
- **BCrypt** password hashing with work factor 12
- **Role-based authorization** — two roles: `Regular` (default) and `Admin`
- **Token lifetime** — 60 minutes (configurable in `appsettings.json`)
- No refresh tokens in v1 (stateless design; add in v2 if needed)

---

## Task 1 — Security Configuration

### Verify `appsettings.json` has correct JWT section

```json
{
  "JwtSettings": {
    "SecretKey": "REPLACE_WITH_A_64_CHARACTER_MINIMUM_RANDOM_SECRET_KEY_FOR_PROD",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpiryInMinutes": 60
  }
}
```

**IMPORTANT SECURITY NOTES to include as code comments:**
1. The `SecretKey` must be at least 32 characters (256-bit). Recommend 64+ for HS256.
2. In production, inject this from an environment variable or Azure Key Vault — NEVER commit real secrets to source control.
3. Use `dotnet user-secrets set "JwtSettings:SecretKey" "your-secret"` for local development.

### File: `Extensions/UserSecretsExtension.md` (documentation note)

```markdown
## Development Secret Management

Use .NET User Secrets for local development to avoid committing secrets:

```bash
cd src/EBookLibrary.WebApi
dotnet user-secrets init
dotnet user-secrets set "JwtSettings:SecretKey" "your-local-64-char-secret-key-here-123456789012345"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=EBookLibraryDb;..."
```

In production: Use environment variables or Azure Key Vault.
```

---

## Task 2 — Auth Flow End-to-End

### 2.1 Registration Flow

```
POST /api/auth/register
Body: { email, password, confirmPassword, firstName?, lastName? }

1. FluentValidation validates the command
2. Check email uniqueness in DB
3. BCrypt.HashPassword(password, workFactor: 12)
4. User.Create(email, passwordHash) → UserRole.Regular
5. SaveChangesAsync()
6. JwtTokenService.GenerateToken(userId, email, "Regular")
7. Return 201 with AuthResponseDto { token, userId, email, role, expiresAt }
```

### 2.2 Login Flow

```
POST /api/auth/login
Body: { email, password }

1. FluentValidation validates the command
2. Fetch user by email (case-insensitive)
3. Check user.IsActive == true
4. BCrypt.Verify(password, user.PasswordHash)
5. JwtTokenService.GenerateToken(userId, email, role)
6. Return 200 with AuthResponseDto
```

### 2.3 Protected Endpoint Flow

```
GET /api/books/{id}/download
Header: Authorization: Bearer <token>

1. JwtBearerMiddleware validates token signature, expiry, issuer, audience
2. Populates HttpContext.User with claims
3. CurrentUserService reads UserId and Role from claims
4. Controller [Authorize] attribute enforces authenticated access
5. [Authorize(Roles = "Admin")] enforces role
```

---

## Task 3 — JWT Token Structure

### Token Claims

The JWT token must include these claims:

| Claim | Value | Example |
|---|---|---|
| `sub` | User GUID | `"3fa85f64-5717-4562-b3fc-2c963f66afa6"` |
| `email` | User email | `"user@example.com"` |
| `role` (ClaimTypes.Role) | Role name | `"Regular"` or `"Admin"` |
| `jti` | Unique token ID | `"a1b2c3d4-..."` (for future revocation) |
| `iat` | Issued at (Unix epoch) | `1709000000` |
| `exp` | Expiry (Unix epoch) | `1709003600` |
| `iss` | Issuer | `"EBookLibrary"` |
| `aud` | Audience | `"EBookLibraryUsers"` |

### JWT Token Generation (verify JwtTokenService is correct)

```csharp
// In JwtTokenService.GenerateToken — ensure ClaimTypes.Role is used for role-based auth
var claims = new[]
{
    new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
    new Claim(JwtRegisteredClaimNames.Email, email),
    new Claim(ClaimTypes.Role, role),          // ← CRITICAL: use ClaimTypes.Role for [Authorize(Roles)]
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
    new Claim(JwtRegisteredClaimNames.Iat,
        DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
};
```

---

## Task 4 — Role-Based Authorization Attributes

### Policy vs. Roles approach

For simplicity, use `[Authorize(Roles = "Admin")]` in controllers. If more granular permissions are needed in the future, add policies.

### Verify controller annotations are correct

```csharp
// Public endpoint — no auth required
[AllowAnonymous]
[HttpGet("search")]

// Any authenticated user
[Authorize]
[HttpGet("{id:guid}/download")]

// Admin only
[Authorize(Roles = "Admin")]
[HttpPost]

// Controller-level default — all endpoints require auth unless overridden
[Authorize]
public class BooksController : ApiControllerBase { ... }
```

---

## Task 5 — CurrentUserService Integration

### Verify `CurrentUserService` reads claims correctly

```csharp
// The JWT token stores userId in "sub" claim
// ASP.NET Core maps "sub" to ClaimTypes.NameIdentifier automatically
public Guid? UserId
{
    get
    {
        // Try both claim types for compatibility
        var sub = _httpContextAccessor.HttpContext?.User
            .FindFirstValue(ClaimTypes.NameIdentifier)
            ?? _httpContextAccessor.HttpContext?.User
            .FindFirstValue(JwtRegisteredClaimNames.Sub);

        return sub is not null && Guid.TryParse(sub, out var id) ? id : null;
    }
}
```

**Note:** `JwtSecurityTokenHandler` by default maps the JWT `sub` claim to `ClaimTypes.NameIdentifier`. The `CurrentUserService` already handles this transparently by checking both `ClaimTypes.NameIdentifier` and `"sub"` with a null-coalescing fallback — so calling `JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear()` is **not required** and was intentionally omitted to avoid breaking `[Authorize(Roles)]`, which relies on the default claim type mapping for `ClaimTypes.Role`.

---

## Task 6 — Password Security

### BCrypt Configuration

```csharp
// Work factor 12 means 2^12 = 4096 iterations — a good balance of security/performance
// At this work factor, hashing takes ~250ms on typical hardware
// This prevents brute-force attacks
public string HashPassword(string plainText)
    => BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: 12);

public bool VerifyPassword(string plainText, string hash)
    => BCrypt.Net.BCrypt.Verify(plainText, hash);
```

### Password Policy (enforced in FluentValidation)

```csharp
RuleFor(x => x.Password)
    .MinimumLength(8)
    .Matches("[A-Z]").WithMessage("Must contain at least one uppercase letter.")
    .Matches("[a-z]").WithMessage("Must contain at least one lowercase letter.")
    .Matches("[0-9]").WithMessage("Must contain at least one digit.")
    .Matches("[^a-zA-Z0-9]").WithMessage("Must contain at least one special character.");
```

---

## Task 7 — OWASP Security Checklist

Ensure the following security measures are implemented (add **code comments** in the relevant files):

### API Security Headers (add to Program.cs)

```csharp
// Add security headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});
```

### Rate Limiting for Auth Endpoints (add to Program.cs — .NET 10 built-in)

```csharp
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", config =>
    {
        config.PermitLimit = 10;
        config.Window = TimeSpan.FromMinutes(1);
        config.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        config.QueueLimit = 0;
    });
});

// Apply to auth controller:
// [EnableRateLimiting("auth")]
// on AuthController class or individual endpoints
```

### SQL Injection Prevention
Addressed by EF Core parameterization — always use LINQ, never raw SQL with user input.

### Input Validation
All inputs validated via FluentValidation before reaching handlers.

### Error Information Exposure
The `ExceptionHandlingMiddleware` must NOT expose stack traces or internal error details in production:
```csharp
// Only show detailed errors in Development
_ => app.Environment.IsDevelopment()
    ? (HttpStatusCode.InternalServerError, ex.Message, null)
    : (HttpStatusCode.InternalServerError, "An unexpected error occurred.", null)
```

---

## Task 8 — Admin Seeding

### File: `Infrastructure/Persistence/DataSeeder.cs`

Generate a `DataSeeder` class that creates an initial admin user if none exists:

```csharp
namespace EBookLibrary.Infrastructure.Persistence;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHashService passwordHash)
    {
        // Seed admin user — use IgnoreQueryFilters() so soft-deleted admins are also found
        if (!await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Role == UserRole.Admin))
        {
            var adminEmail = "admin@ebooklibrary.com";
            var adminPassword = "Admin@12345"; // Change in production!
            var hash = passwordHash.HashPassword(adminPassword);
            var admin = User.Create(adminEmail, hash);
            admin.ChangeRole(UserRole.Admin);
            admin.UpdateProfile("System", "Administrator");
            context.Users.Add(admin);
        }

        await context.SaveChangesAsync();
    }
}
```

### Call DataSeeder in Program.cs (Development only)

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHash = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
    await context.Database.MigrateAsync();
    await DataSeeder.SeedAsync(context, passwordHash);
}
```

---

## Task 9 — Test the Auth Flow

### Manual test sequence using Scalar UI or curl

```bash
# 1. Register a user
curl -X POST https://localhost:7xxx/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test@1234","confirmPassword":"Test@1234"}'

# Expected: 201 with token

# 2. Login
curl -X POST https://localhost:7xxx/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test@1234"}'

# Expected: 200 with token

# 3. Access protected endpoint
curl -X GET https://localhost:7xxx/api/books/search?title=test \
  -H "Authorization: Bearer <token_from_step_2>"

# Expected: 200 with search results

# 4. Try admin endpoint without Admin role
curl -X POST https://localhost:7xxx/api/books \
  -H "Authorization: Bearer <regular_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","pages":100,"language":"Spanish","authorIds":[],"genreIds":[]}'

# Expected: 403 Forbidden
```

---

## Deliverables Checklist

- [ ] `JwtSettings.cs` options class in Infrastructure
- [ ] `JwtTokenService.cs` generates tokens with correct claims (sub, email, role, jti, iat)
- [ ] `PasswordHashService.cs` uses BCrypt with work factor 12
- [ ] `CurrentUserService.cs` reads claims from HttpContext correctly
- [ ] Auth controllers return proper HTTP status codes (201, 200, 400, 403)
- [ ] `[Authorize]` and `[Authorize(Roles = "Admin")]` protect correct endpoints
- [ ] `[AllowAnonymous]` on public endpoints
- [ ] `JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear()` if needed
- [ ] Security headers middleware added
- [ ] Rate limiting on auth endpoints
- [ ] `DataSeeder.cs` creates admin user on Dev startup
- [ ] End-to-end manual test passes: register → login → use token → role enforcement

---

*Component 06 of 10 — EBook Library Project*
