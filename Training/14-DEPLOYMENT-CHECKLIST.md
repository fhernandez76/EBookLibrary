# Chapter 14 — Deployment & Troubleshooting Checklist

> *"Most deployment failures are environment failures, not code failures."*

---

## Chapter Objectives

By the end of this chapter you will:
- Have all three servers running simultaneously (API + React + Blazor)
- Know all configuration values required for each environment
- Have a reference table for every common runtime error

---

## 14.1 Prerequisites

| Prerequisite | Version | Verify |
|---|---|---|
| .NET SDK | 10.0+ | `dotnet --version` |
| SQL Server | 2022 | `sqlcmd -Q "SELECT @@VERSION"` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| EF Core CLI tools | Latest | `dotnet ef --version` |

---

## 14.2 First-Time Setup

```powershell
# 1. Clone / navigate to solution root
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"

# 2. Restore all NuGet packages
dotnet restore

# 3. Install React dependencies
cd src/EBookLibrary.React
npm install
cd ../..

# 4. Trust the dev HTTPS certificate (needed for Blazor)
dotnet dev-certs https --trust

# 5. Run database migrations
dotnet ef database update --project src/EBookLibrary.Infrastructure --startup-project src/EBookLibrary.WebApi

# 6. Seed the database (51,599 books from docs/ HTML files)
dotnet run --project scripts/EBookLibrary.Seeder

# 7. Build to verify everything compiles
dotnet build
```

---

## 14.3 Running All Servers

Open **3 separate terminal windows**:

**Terminal 1 — Web API:**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet run --project src/EBookLibrary.WebApi
# Listens on http://localhost:5149
# API docs at http://localhost:5149/scalar
```

**Terminal 2 — React:**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
npm run dev
# Listens on http://localhost:5173
```

**Terminal 3 — Blazor:**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet run --project src/EBookLibrary.Blazor
# Listens on https://localhost:7278
```

---

## 14.4 Port Reference

| Server | URL | Protocol |
|---|---|---|
| Web API | `http://localhost:5149` | HTTP |
| Web API docs (Scalar) | `http://localhost:5149/scalar` | HTTP |
| React SPA | `http://localhost:5173` | HTTP |
| Blazor WASM | `https://localhost:7278` | HTTPS |

---

## 14.5 Configuration Reference

### `appsettings.json` — Required Values

**File:** `src/EBookLibrary.WebApi/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-minimum-32-characters-long",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpirationMinutes": 60
  },
  "FileStorage": {
    "BooksPath": "C:\\EBookStorage\\Books",
    "AllowedExtensions": [".epub", ".pdf", ".mobi"]
  }
}
```

**Important:** The `SecretKey` must be at least 32 characters (256 bits) for HS256. A shorter key causes a silent JWT validation failure.

### React Environment Variables

**File:** `src/EBookLibrary.React/.env.development`
```
VITE_API_URL=http://localhost:5149/api
```

**File:** `src/EBookLibrary.React/.env.production`
```
VITE_API_URL=https://your-production-api.com/api
```

### Blazor Configuration

**File:** `src/EBookLibrary.Blazor/wwwroot/appsettings.json`
```json
{ "ApiBaseUrl": "http://localhost:5149/api" }
```

---

## 14.6 Common Errors Reference

### Database Errors

| Error | Cause | Fix |
|---|---|---|
| `Cannot open database "EBookLibraryDb"` | DB doesn't exist yet | Run `dotnet ef database update` |
| `Login failed for user 'SA'` | Wrong credentials in connection string | Use `Trusted_Connection=True` for Windows Auth |
| `The migration '...' has already been applied` | Trying to run old migration | Run `dotnet ef database update` (idempotent) |
| `Pending model changes` | New entity added but no migration | Run `dotnet ef migrations add <Name>` |
| `Sequence contains no elements` on seed | DB has no data | Run the seeder: `dotnet run --project scripts/EBookLibrary.Seeder` |

### Authentication Errors

| Error | Cause | Fix |
|---|---|---|
| `[Authorize(Roles="Admin")]` always returns 403 | Using `"role"` claim instead of `ClaimTypes.Role` | Change to `new Claim(ClaimTypes.Role, role)` in `JwtTokenService` |
| `401 Unauthorized` on every request | JWT secret mismatch between appsettings environments | Ensure same `SecretKey` in all `appsettings` files |
| Token validates but role is wrong | JWT expiry passed | Re-login to get a fresh token |
| `IDX10703: Unable to decode the header` | Token is malformed | Check Axios interceptor isn't double-encoding |
| Login returns `Invalid email or password` for correct password | BCrypt hash mismatch | Rehash the password (use `PasswordHashService.HashPassword()` in a test) |

### CORS Errors

| Error | Cause | Fix |
|---|---|---|
| `Access-Control-Allow-Origin` missing | CORS policy misconfigured | Verify `WithOrigins("http://localhost:5173")` |
| Preflight OPTIONS request fails | `AllowAnyMethod()` missing | Add `.AllowAnyMethod()` to CORS policy |
| Credentials blocked | Using `AllowAnyOrigin()` + `AllowCredentials()` | Replace `AllowAnyOrigin()` with `WithOrigins(...)` |

### React / Tailwind Errors

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'tailwindcss/plugin'` | Wrong Tailwind version (v4 installed) | `npm install -D tailwindcss@3` |
| `@apply` directive unknown | Tailwind v4 incompatibility | Downgrade to v3 |
| Zustand store returns empty state on refresh | `partialize` missing from persist | Add `partialize` to `persist()` options |
| Auth state lost on browser refresh | Only `auth_token` set, not `auth-storage` | Ensure `setAuth()` sets both keys |

### Blazor Errors

| Error | Cause | Fix |
|---|---|---|
| `Unable to connect to the remote server` | API not running | Start WebApi first |
| `Certificate not trusted` | Dev cert not trusted | `dotnet dev-certs https --trust` |
| Auth state not restored on reload | `ILocalStorageService` async not awaited | Ensure `GetItemAsStringAsync` is awaited in `GetAuthenticationStateAsync` |
| `[Authorize]` routes show "Not Authorized" even when logged in | `AuthenticationStateProvider` not registered | Check `Program.cs` DI registration |

### Middleware Order Error (Silent Failures)

If you see 401 on all protected endpoints even with a valid token, check the middleware order in `Program.cs`:

```csharp
// ❌ Wrong order — UseAuthorization before UseAuthentication
app.UseAuthorization();
app.UseAuthentication();  // <-- this must come FIRST

// ✅ Correct order
app.UseAuthentication();  // Always before Authorization
app.UseAuthorization();
```

---

## 14.7 SQL Server Setup (Windows)

```powershell
# Check if SQL Server service is running
Get-Service -Name "MSSQLSERVER" | Select-Object Status, Name

# Start the service if stopped
Start-Service -Name "MSSQLSERVER"

# Verify connectivity
sqlcmd -S localhost -Q "SELECT @@VERSION"

# Create the database manually (migration will do this too)
sqlcmd -S localhost -Q "CREATE DATABASE EBookLibraryDb"
```

---

## 14.8 Validation Checklist — Healthy Application

Run through this list to confirm the application is fully operational:

**API:**
- [ ] `http://localhost:5149/scalar` — opens Scalar API docs
- [ ] `GET http://localhost:5149/api/books/search?title=quijote` — returns books
- [ ] `POST http://localhost:5149/api/auth/register` — returns 201 with token
- [ ] `GET http://localhost:5149/api/books/search` (no token, no params) — returns 200

**React:**
- [ ] `http://localhost:5173` — home page renders with navy theme
- [ ] Search for "gabriel" — returns results from the API
- [ ] Login with admin credentials — nav shows admin link
- [ ] Admin page `/admin/authors` — shows author list

**Blazor:**
- [ ] `https://localhost:7278` — home page renders
- [ ] Login form submits and updates nav
- [ ] `/admin` redirects to login when not authenticated

---

## Further Reading

- [docs/11-DEBUG-GUIDE.md](../docs/11-DEBUG-GUIDE.md) — Original debug guide with additional troubleshooting steps
- [docs/12-API-TESTING-GUIDE.md](../docs/12-API-TESTING-GUIDE.md) — API endpoints and test flows

---

**← Previous:** [13 — Copilot Comparison](13-COPILOT-COMPARISON.md)  
**Next →** [Appendix A — API Reference](APPENDIX-A-API-REFERENCE.md)
