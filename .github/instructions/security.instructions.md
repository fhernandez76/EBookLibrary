---
description: Ambient security guidance applied to all changes in this repository.
---

# Security guidance (ambient)

These rules apply to **every** change. They are derived from Chapter 15 of the
training book ("Production Readiness") and the OWASP Top 10.

## Secrets

- **Never** commit a real connection string, JWT key, API key, or password.
- The shipped JWT placeholder is
  `REPLACE_WITH_64_CHARACTER_MINIMUM_SECRET_KEY_IN_PRODUCTION`. If you see
  anything else in source control, that is a leak — flag it.
- For local dev: `dotnet user-secrets`. For prod: env vars
  (`JwtSettings__SecretKey`, `ConnectionStrings__DefaultConnection`).
- React env files: `.env.local` and `.env.*.local` are git-ignored. Anything
  in `.env.development` / `.env.production` is **public** at build time —
  treat as such.

## Authentication & authorization

- JWT: HS256, **64-char minimum** key, `ExpiryInMinutes` ≤ 60 in production.
- Roles via `ClaimTypes.Role`. Always prefer `[Authorize(Roles = "...")]` over
  manual claim inspection in controllers.
- Anonymous endpoints must be explicit (`[AllowAnonymous]`) — never rely on a
  missing `[Authorize]`.
- Refresh tokens are not yet implemented; if added, store hashed, rotate on
  use, support revocation.

## Passwords

- BCrypt, work factor **12** via `IPasswordHashService`. Do not lower it.
- Validators enforce min length 8, upper, lower, digit, special.
- Never log a password — not even at Trace level.

## Input validation

- Every command/query that accepts user input has a FluentValidation `Validator`.
- Validate at the boundary (Application layer). Don't re-validate inside
  domain methods unless the invariant must hold even for trusted callers.

## SQL injection

- EF Core LINQ everywhere — no raw `FromSqlRaw` with concatenated user input.
  If raw SQL is unavoidable, use parameterised `FromSqlInterpolated` /
  `ExecuteSqlInterpolated`.

## Path traversal (file storage)

- `IFileStorageService` must validate that the resolved path stays under the
  configured base path:

  ```csharp
  var fullPath = Path.GetFullPath(Path.Combine(basePath, relative));
  if (!fullPath.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
      throw new SecurityException("Path traversal attempt");
  ```

- Whitelist file extensions (currently `.epub` only).

## CORS

- `AllowedOrigins` in `appsettings.json` is an **explicit list**.
- Never use `AllowAnyOrigin()` with `AllowCredentials()`.
- Production deployments must override `AllowedOrigins` to the real frontend
  URL(s).

## Error responses

- The exception middleware maps to `ApiResponse.Fail(...)` — do **not** leak
  stack traces in production. `IsDevelopment()` gates verbose details.

## Logging

- Don't log: passwords, JWTs, full request bodies of auth endpoints.
- Do log: correlation id, user id (claim), endpoint, status, duration.

## Dependencies

- Run `dotnet list package --vulnerable --include-transitive` and
  `npm audit --production` before each release.
- Don't introduce a new package without a clear use case and license check.

## When you spot something

If you see a hard-coded credential, an unparameterised query, an open CORS
config, or any other red-flag pattern — **stop the change** and surface it
with the user. Do not "just fix it quietly" while doing other work; security
fixes deserve their own commit.
