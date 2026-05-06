# Chapter 13 — AI-Assisted Development: Manual vs. GitHub Copilot

> *"Copilot is an extremely fast junior developer who needs a senior engineer to review everything."*

---

## Chapter Objectives

By the end of this chapter you will:
- Understand which parts of this project Copilot can generate reliably
- Know the critical corrections that any AI-generated .NET code will likely need
- Have a framework for deciding when to trust vs. verify AI output
- See realistic productivity metrics per development phase

---

## 13.1 The Mental Model

Think of GitHub Copilot as a **context-aware code autocomplete** — not a architect.

```
  AI is STRONG at:                AI is WEAK at:
  ─────────────────────────       ──────────────────────────
  Boilerplate code                Architecture decisions
  CRUD patterns                   Security-critical code
  Test skeletons                  Cross-cutting behavior
  Interface implementations       Business rule encoding
  Repetitive structures           Performance optimization
  Library API lookups             Integration edge cases
```

The key discipline: **AI generates, you verify**. The faster AI generates, the more critical your review becomes.

---

## 13.2 Per-Phase Analysis

### Phase 1: Domain Layer

| Concern | Copilot | Manual |
|---|---|---|
| BaseEntity with timestamps | ✅ Generated correctly | — |
| Enum definitions | ✅ Generated correctly | — |
| Entity constructors (private + factory) | ⚠️ Needs guidance — generates public ctors by default | Architect decision |
| Private setters pattern | ⚠️ Often generates public setters | Architect decision |
| Repository interfaces | ✅ Generated boilerplate | — |
| IUnitOfWork pattern | ✅ Generated correctly | — |
| ER relationships | ❌ Needs full specification | Domain design |

**Net result:** Domain layer is ~60% AI-assisted if you provide the entity specification. Architecture (private ctors, private setters, factory methods) requires manual guidance.

### Phase 2: Application Layer

| Concern | Copilot | Manual |
|---|---|---|
| CQRS Command/Query/Handler triplet | ✅ Excellent — regenerates the pattern fast | — |
| FluentValidation rules | ✅ Good for standard rules | Complex business rules |
| AutoMapper profiles | ✅ Good for flat mappings | Nested/conditional mappings |
| ValidationBehavior pipeline | ✅ Generated correctly | — |
| LoggingBehavior pipeline | ✅ Generated correctly | — |
| Result<T> pattern | ✅ Generated correctly | — |
| LoginUserCommand (same error for not found/wrong password) | ❌ AI generates different error messages per case | Security design decision |

**Net result:** Application layer is ~75% AI-assisted. The human contribution is primarily in security design (same-error response) and complex business rules.

### Phase 3: Infrastructure Layer

| Concern | Copilot | Manual |
|---|---|---|
| DbContext + DbSets | ✅ Generated correctly | — |
| Fluent API entity configurations | ✅ Good for basic configs | Complex relationships |
| Global query filters (soft delete) | ✅ Generated correctly with prompt | — |
| GenericRepository<T> | ✅ Generated correctly | — |
| JWT token generation | ⚠️ **CRITICAL BUG — see below** | ClaimTypes.Role fix |
| BCrypt hashing | ✅ Generated correctly | Work factor decision |
| FileStorageService path sanitization | ⚠️ Path traversal prevention missing | Security fix needed |

**⚠️ CRITICAL: `JwtTokenService` ClaimTypes.Role Bug**

Every AI model (not just Copilot) generates:
```csharp
// ❌ AI-generated — WRONG
new Claim("role", role)
```

This breaks `[Authorize(Roles = "Admin")]` completely. The claim value is there, but the `ClaimsPrincipal.IsInRole()` method cannot find it.

The fix:
```csharp
// ✅ Correct — uses the .NET constant
using System.Security.Claims;
new Claim(ClaimTypes.Role, role)
// ClaimTypes.Role = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
```

This is the single most impactful correction in the entire project.

### Phase 4: Web API Layer

| Concern | Copilot | Manual |
|---|---|---|
| Controller with [ApiController] | ✅ Generated correctly | — |
| [Authorize] / [Authorize(Roles)] | ✅ Generated correctly | — |
| ApiResponse<T> envelope | ✅ Generated correctly | — |
| ExceptionHandlingMiddleware | ✅ Generated correctly | — |
| Program.cs middleware order | ⚠️ Often wrong order | Auth before Authorization |
| CORS configuration | ⚠️ Uses AllowAnyOrigin (breaks credentials) | Fix: WithOrigins(...) |

**⚠️ CORS Bug**

AI-generated CORS often uses:
```csharp
// ❌ AI-generated — WRONG (AllowAnyOrigin + AllowCredentials are mutually exclusive)
policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().AllowCredentials();
```

The fix:
```csharp
// ✅ Correct
policy.WithOrigins("http://localhost:5173", "https://localhost:7278")
      .AllowAnyHeader()
      .AllowAnyMethod()
      .AllowCredentials();
```

### Phase 5: React Frontend

| Concern | Copilot | Manual |
|---|---|---|
| Zustand store structure | ✅ Generated correctly | — |
| React Query queryKey/queryFn | ✅ Generated correctly | — |
| Axios interceptors (request + response) | ✅ Generated correctly | — |
| Tailwind component classes | ⚠️ v4 syntax vs v3 | `npm install tailwindcss@3` |
| Zustand persist `partialize` | ⚠️ Often omitted | Serialization fix |
| `ProtectedRoute` with `Outlet` | ✅ Generated correctly | — |
| TypeScript discriminated unions | ✅ Generated correctly | — |

**⚠️ Tailwind Version Bug**

AI generates `tailwind.config.js` using v3 syntax but `npm install tailwindcss` installs v4, which has incompatible configuration. Always specify:
```bash
npm install -D tailwindcss@3 postcss autoprefixer
```

---

## 13.3 Security — Non-Negotiable Human Review

AI assistants have been trained on publicly available code, which includes many insecure patterns. For any security-critical code, **assume the AI is wrong until proven correct**:

| Category | AI Tendency | Required Fix |
|---|---|---|
| JWT claims | Uses string `"role"` | Use `ClaimTypes.Role` constant |
| Password errors | Different messages for not-found vs wrong-password | Same message (anti-enumeration) |
| File paths | No path traversal prevention | Sanitize with `Path.GetFileName()` |
| CORS | `AllowAnyOrigin` + credentials | Use `WithOrigins()` |
| SQL queries | Sometimes generates raw SQL | Use parameterized EF Core queries |
| Secrets in code | May include hardcoded test secrets | Always use `appsettings.json` / env vars |

---

## 13.4 Productivity Metrics (Realistic Estimates)

Based on implementing this project:

| Phase | Manual Estimate | With Copilot | Savings | Notes |
|---|---|---|---|---|
| Solution setup | 2h | 30min | 75% | Copilot knows CLI commands |
| Domain layer | 8h | 3h | 62% | Entities need guidance |
| Application layer | 12h | 4h | 67% | Handlers are repetitive |
| Infrastructure | 10h | 4h | 60% | JWT bug costs 1-2h to debug |
| Web API | 6h | 2h | 67% | CORS bug costs 30-60min |
| React frontend | 16h | 6h | 62% | Tailwind version issue |
| Blazor frontend | 12h | 5h | 58% | Less Blazor training data |
| Unit tests | 8h | 3h | 62% | Test skeletons are great |
| E2E tests | 10h | 5h | 50% | localStorage injection novel |
| **Total** | **84h** | **32h** | **62%** | — |

**The catch:** Each AI bug (ClaimTypes.Role, CORS, Tailwind version) cost 1-3 hours of debugging. If you haven't encountered these bugs before, you could lose all productivity gains.

**The lesson:** Study the common bugs (this chapter) *before* using AI assistance, not after.

---

## 13.5 Effective Prompting Patterns

### What Works

```
"Implement a MediatR command handler for RegisterUser in C# that:
- Uses IUnitOfWork pattern (not direct DbContext)
- Returns a custom Result<AuthResponseDto> type
- Uses BCrypt.Net-Next for password hashing
- Uses ClaimTypes.Role (not 'role' string) for JWT claims
- Returns the SAME error message for duplicate email and validation failures (anti-enumeration)
Follow Clean Architecture — no infrastructure concerns in the handler."
```

**Constraint listing is the key**: Tell Copilot specifically what *not* to do.

### What Doesn't Work

```
"Create a login handler"
```

This produces a handler with direct DbContext, public entity setters, different error messages per case, and `new Claim("role", role)`.

### Verification Checklist (after every AI-generated file)

- [ ] No public setters on domain entities
- [ ] No `new Claim("role", ...)` — must be `ClaimTypes.Role`
- [ ] No `AllowAnyOrigin().AllowCredentials()`
- [ ] No `UseAuthorization()` before `UseAuthentication()`
- [ ] No hardcoded secrets
- [ ] No raw file path concatenation without sanitization
- [ ] No different error messages for user-not-found vs wrong-password

---

## 13.6 Architecture Decisions AI Cannot Make

These decisions define the quality of the entire codebase. AI will generate whatever pattern it has seen most often — which may not be appropriate for your project:

1. **CQRS vs. Service Layer**: Both are valid. Copilot will generate whichever you ask for. The decision is yours.
2. **Repository vs. Direct DbContext**: Copilot defaults to direct `DbContext`. The Repository + Unit of Work pattern requires explicit guidance.
3. **JWT in localStorage vs. httpOnly cookies**: Copilot defaults to localStorage. httpOnly cookies are more secure — this is a deliberate v1 trade-off.
4. **Soft delete vs. hard delete**: Copilot defaults to hard delete. Soft delete with global query filters requires explicit design.
5. **Same-error login response**: Copilot always generates different error messages. Security requires the same message.
6. **Private constructors for entities**: Copilot defaults to public constructors. Private ctors with factory methods is a deliberate DDD pattern.

---

## 13.7 Recommended Workflow

```
1. Design first (architecture, data model, contracts)
   ↓
2. Generate boilerplate with AI (folder structure, project files, interfaces)
   ↓
3. Review AI output against security checklist above
   ↓
4. Implement business logic manually (rules, security decisions)
   ↓
5. Use AI for repetitive implementations (handlers, validators, tests)
   ↓
6. Review AI-generated tests for meaningful assertions vs. just coverage
   ↓
7. Run the full test suite — only passing tests indicate correctness
```

---

## Further Reading

- GitHub Copilot documentation: https://docs.github.com/copilot
- OWASP Top 10 (what to check in AI-generated code): https://owasp.org/Top10/
- "Rethinking code security with AI" — GitHub blog

---

**← Previous:** [12 — End-to-End Tests](12-E2E-TESTS.md)  
**Next →** [14 — Deployment Checklist](14-DEPLOYMENT-CHECKLIST.md)
