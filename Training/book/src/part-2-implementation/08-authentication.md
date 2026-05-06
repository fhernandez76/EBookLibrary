# Chapter 8 — Authentication and Authorization

> *"The login page is small and the way it can fail is endless."*

---

## What you will learn

- The structure of a JWT token (header, payload, signature) and what
  each part is for.
- The two flows the project implements — registration and login — and
  the small but consequential decisions inside each.
- Why BCrypt's *work factor* is not a configuration knob to leave at
  the default and how to choose it.
- Why the project uses `ClaimTypes.Role`, not `"role"`, and what
  silently breaks otherwise.
- How role-based authorization attributes layer on controllers and
  how `[AllowAnonymous]` opts a single endpoint out.
- The XSS exposure of `localStorage` JWT storage and the trade-off the
  project accepts.

---

## 8.1 What a JWT actually is

A JSON Web Token is three Base64-encoded segments joined by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← header
.
eyJzdWIiOiI4Yz...3RpIjoiMjQ4...        ← payload (claims)
.
F2sjqp_8OvK4...                        ← signature
```

The header names the signing algorithm. The payload carries claims —
named bits of information about the user (`sub`, `email`, `role`, plus
issuer, audience, expiry). The signature is `HMAC-SHA256(header.payload,
secret)`. The server signs at issue time; the server validates the
signature on every subsequent request. The token is *self-describing*:
no server-side session lookup is required.

> **Foundations:** Self-describing means you can decode a JWT in any
> language with no help from the issuer. Try this with a real token
> at <https://jwt.io>. The header and payload are *not encrypted* —
> they are just Base64 of JSON. Anything secret must not go in the
> payload. The signature only proves the issuer is who they claim;
> it does not hide the contents.

---

## 8.2 The two flows

The project supports exactly two authentication flows: registration
and login. Both go through MediatR; both return a JWT.

![Figure 8.1 — Sequence: user registration end-to-end.](figures/07-seq-user-registration.jpg)

The registration handler's job is to validate the email is not taken,
hash the password, persist the user, and return a freshly-issued JWT
so the client can sign in immediately. The login handler's job is to
look the user up, verify the password against the stored hash, check
the account is active, and return the same envelope.

Both handlers are short — § 5.4 showed login in full — and the
non-obvious decisions live in two places: the *response* shape (do not
leak existence of the account) and the *hashing* algorithm (BCrypt,
work factor 12).

---

## 8.3 BCrypt and the work factor

BCrypt is intentionally slow. A single hash takes ~250 ms on a modern
CPU at work factor 12. That cost is the difference between an attacker
who steals the password table and runs an offline dictionary attack at
millions of guesses per second, and one who runs it at four guesses
per second per CPU.

**Listing 8.1 — Choosing the work factor (from `PasswordHashService`).**

```csharp
private const int WorkFactor = 12;   // ~250 ms per hash on modern CPUs

public string Hash(string password)
    => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
```

The trade-offs:

- Work factor `≤ 9` — milliseconds per hash. Fast for offline attacks
  too. *Do not use.*
- Work factor `10` — BCrypt's library default. Adequate ten years
  ago, marginal today.
- Work factor `12` — the project's choice. About 250 ms per hash.
  Login still feels instant.
- Work factor `13` — about 500 ms per hash. Login feels slightly
  sluggish on a tablet.
- Work factor `≥ 14` — login becomes a UX problem.

Re-evaluate every couple of years. Hardware speeds up; the right work
factor drifts upward.

> **Architect's Note:** If you are starting a new project today and
> have the luxury, prefer **Argon2id** over BCrypt. It is the OWASP
> recommended algorithm and resists GPU-accelerated attacks better.
> The project uses BCrypt because it is mature, has excellent
> .NET support, and is correct enough at work factor 12 for the
> threat model. The argument for switching is "memory-hardness", not
> "BCrypt is broken".

---

## 8.4 The single most important string in the project

Listing 8.2 reproduces the line from Chapter 6 that most often hides
a security bug. It is worth seeing again, in context.

**Listing 8.2 — JWT claim emission, the right way and the wrong way.**

```csharp
// CORRECT — ASP.NET Core's [Authorize(Roles=...)] reads ClaimTypes.Role.
new Claim(ClaimTypes.Role, user.Role.ToString()),

// WRONG — compiles, runs, generates a plausible token, breaks every
// [Authorize(Roles="Admin")] attribute silently.
new Claim("role", user.Role.ToString()),
```

`ClaimTypes.Role` evaluates to the URL
`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. That
URL is what `[Authorize(Roles=...)]` looks for. The project tests in
Chapter 12 include an explicit assertion that admin endpoints reject a
regular-user token; that test is the single best protection against
this bug regressing.

> **Pitfall:** This bug is hard to find because the symptom is "every
> admin call returns 403, even with what looks like a valid token".
> Engineers spend hours decoding the JWT in `jwt.io`, seeing the role
> claim there, and assuming the framework is broken. It isn't — the
> claim *type* is wrong. Always use the constant.

---

## 8.5 Authorization attributes

The project uses controller-level `[Authorize]` with method-level
overrides for endpoints that need to be public.

**Listing 8.3 — `WebApi/Controllers/BooksController.cs` (auth attributes).**

```csharp
[ApiController]
[Route("api/books")]
[Authorize]                           // default: any authenticated user
public sealed class BooksController : ControllerBase
{
    [HttpGet("search"), AllowAnonymous]                      // public
    public Task<...> Search(...) { ... }

    [HttpGet("{id:guid}"), AllowAnonymous]                   // public
    public Task<...> GetById(...) { ... }

    [HttpGet("{id:guid}/download")]                          // logged in
    public Task<...> Download(...) { ... }

    [HttpPost, Authorize(Roles = "Admin")]                   // admin only
    public Task<...> Create(...) { ... }

    [HttpPut("{id:guid}"), Authorize(Roles = "Admin")]
    public Task<...> Update(...) { ... }

    [HttpDelete("{id:guid}"), Authorize(Roles = "Admin")]
    public Task<...> Delete(...) { ... }
}
```

Class-level `[Authorize]` is the *secure default* — every action
requires authentication unless explicitly opted out. This is the
opposite of the alternative (every action public unless explicitly
secured) and the opposite is the wrong default.

> **In Practice:** "Default secure" applies to more than just
> controllers. Database tables should require explicit grants, not
> default-grant-then-revoke. Configuration should default to the
> safer behavior (TLS on, debug off). Every layer where a wrong
> default is a security incident is a place to apply this discipline.

---

## 8.6 The XSS exposure of `localStorage`

The React frontend (Chapter 10) stores the JWT in browser
`localStorage`. So does the Blazor frontend (Chapter 11). This is
common and convenient and the source of one specific vulnerability:
**any cross-site scripting bug becomes a token theft.**

A tiny JavaScript injection — through an unescaped user comment, a
malicious npm dependency, a copy-pasted browser extension — can read
`localStorage.getItem('auth_token')` and POST it to an attacker. The
attacker now has a valid JWT for the user's account until it expires.

The defense in depth has three layers:

1. **Aggressive XSS prevention.** Escape every user-supplied string
   that touches the DOM. React does this by default with `{}`-style
   interpolation, but the moment you reach for `dangerouslySetInnerHTML`
   the protection is gone.
2. **Short token lifetimes.** Sixty minutes in this project. A stolen
   token expires soon; a refresh-token system would expire it sooner
   on a logout signal.
3. **A Content Security Policy (CSP)** that limits which origins can
   execute JavaScript. The project ships a baseline CSP in production
   configuration.

The full defense, however, is to **stop using `localStorage`** and
move the token into an `httpOnly` cookie. The cookie is not readable
from JavaScript at all; XSS cannot steal it. The cost is CSRF
protection (cookies are sent automatically; tokens in headers are not)
and slightly more complex CORS configuration.

> **Pitfall:** The project chooses `localStorage` because it is a
> learning project and the simplification is worth it for the lesson.
> Do not adopt the same choice in a production application without
> first weighing the XSS surface of your codebase. The default for
> production should be httpOnly cookies plus CSRF protection.

---

## 8.7 Security hardening checklist

Before sending an authentication system into production, verify each
of the following.

**Table 8.1 — Pre-production authentication checklist.**

| #  | Item                                                 | Status in this project |
|----|------------------------------------------------------|------------------------|
| 1  | JWT signing secret is at least 256 bits, random      | ✓ (configured per env) |
| 2  | Secret stored outside source control                 | ✓ (user-secrets / env vars) |
| 3  | Token expiry set explicitly, ≤ 60 min for SPAs      | ✓                      |
| 4  | Issuer and audience validated                        | ✓                      |
| 5  | Same error message for "user not found" and "wrong password" | ✓ (§ 5.5)        |
| 6  | BCrypt work factor ≥ 11 (12 here)                    | ✓                      |
| 7  | `ClaimTypes.Role` (not `"role"`)                     | ✓ (§ 8.4)              |
| 8  | Protected endpoints tested with regular-user token   | ✓ (Chapter 12)         |
| 9  | Rate limiting on `/login` and `/register`            | ✓ (RateLimiter)        |
| 10 | `localStorage` exposure documented or replaced       | △ documented (§ 8.6)   |
| 11 | Refresh-token strategy designed (even if deferred)   | △ deferred to v2       |
| 12 | Logout invalidates client state (token cleared)      | ✓                      |
| 13 | Account lockout after N failed logins                | ✗ (exercise 8.H)       |
| 14 | Password reset flow with email verification          | ✗ (exercise 8.H)       |

The checklist is the most useful single artifact in this chapter.
Print it, commit it, review it before every release.

---

## 8.8 Checkpoint

You are ready for Chapter 9 when:

- [ ] `POST /api/auth/register` returns `201` and a JWT.
- [ ] `POST /api/auth/login` returns `200` and a JWT.
- [ ] `POST /api/auth/login` with a wrong password returns `401` with
      the *same* error message as a missing email.
- [ ] `POST /api/books` (admin-only) returns `403` when called with a
      regular-user token.
- [ ] You can pull the JWT out of `Authorization: Bearer ...` and
      decode its claims at <https://jwt.io>, including a `role` claim
      whose claim *type* is the long Microsoft URL, not `"role"`.

---

## Key takeaways

- A JWT is self-describing: header + claims + signature. Never put
  secrets in the claims.
- BCrypt at work factor 12 is the project's deliberate slowness;
  re-evaluate every couple of years.
- `ClaimTypes.Role` is the correct constant for role claims. The
  literal `"role"` compiles, runs, and silently breaks
  `[Authorize(Roles=...)]`.
- The same login error message for "no such user" and "wrong
  password" prevents user enumeration and costs nothing.
- `localStorage` JWT storage is the project's accepted XSS exposure;
  for production, prefer httpOnly cookies plus CSRF protection.

---

## Exercises

**Easy.** Decode a JWT issued by the running API at
<https://jwt.io>. Verify by hand that `alg` is `HS256`, that `exp` is
60 minutes from `iat`, and that the role claim type is the long URL.

**Medium.** Implement account lockout: after five failed login
attempts in fifteen minutes, the user's next login attempt returns a
`429 Too Many Requests` regardless of password correctness. Decide
where the counter lives (in-memory? database? cache?) and what
invalidates it. (Hint: row-level lockout in the database survives a
process restart, but does not handle a distributed deployment.)

**Hard.** Add refresh tokens. The login response now returns
`{ accessToken, refreshToken }`; access tokens expire in 15 minutes;
refresh tokens expire in 7 days, are stored hashed in a
`UserRefreshToken` table, and are *rotated* on every use (each refresh
issues a new access token AND a new refresh token, invalidating the
old refresh). Discuss what happens if the same refresh token is
presented twice (token theft detection).

---

## Further reading

- IETF, *RFC 7519: JSON Web Token (JWT).* The original specification.
- Auth0, *"JWT Best Current Practices"*.
- OWASP, *Authentication Cheat Sheet.*
  <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
- OWASP, *Cross-Site Scripting (XSS) Prevention Cheat Sheet.*
- Steve Gibson, *"Password Haystacks"* — the back-of-envelope math
  for why hash slowness matters.
