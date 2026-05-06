# React E2E Tests — Execution Guide

Browser-level end-to-end tests for the **React (Vite)** frontend using Playwright + NUnit.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| .NET SDK | 10.0+ | `dotnet --version` to verify |
| Node.js | 18+ | `node --version` to verify |
| npm | 9+ | Ships with Node.js |
| PowerShell | 5.1+ | Ships with Windows |
| SQL Server (LocalDB or Express) | Any | Must be running and migrated |
| Google Chrome | Latest | Playwright downloads it automatically |

---

## One-Time Setup

### 1 — Install Playwright browsers

Run this **once** after the first `dotnet build`:

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet build tests/EBookLibrary.E2E.Tests
pwsh tests/EBookLibrary.E2E.Tests/bin/Debug/net10.0/playwright.ps1 install chromium
```

### 2 — Install React dependencies (if not already done)

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
npm install
```

### 3 — Seed the database (admin account)

The seeder creates the admin account `admin@ebooklibrary.com`:

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet run --project scripts/EBookLibrary.Seeder
```

> The regular user `user@ebook.com` is created automatically by `GlobalTestSetup` when the tests start.

---

## Running the Tests

All commands assume the working directory:

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
```

> **The `FRONTEND=react` environment variable is required.** This tells `ServerManager` to  
> start the Vite dev server (port 5173) instead of Blazor.  
> Servers are managed automatically — WebApi and Vite start before the first test  
> and stop after the last, **only if they were not already running.**

---

### Run all React tests

```powershell
$env:FRONTEND = "react"
$env:BASE_URL  = "http://localhost:5173"
dotnet test tests/EBookLibrary.E2E.Tests --no-build
```

---

### Run one category at a time

```powershell
$env:FRONTEND = "react"
$env:BASE_URL  = "http://localhost:5173"

# Anonymous user flows (12 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=ReactAnonymous"

# Regular user flows (6 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=ReactRegularUser"

# Admin flows (11 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=ReactAdmin"
```

You can also run all React tests using the parent category:

```powershell
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=React"
```

---

### Watch tests in the browser (headful mode)

```powershell
$env:FRONTEND = "react"
$env:BASE_URL  = "http://localhost:5173"
$env:HEADED    = "1"
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=ReactAdmin"
```

Remove variables when done:

```powershell
Remove-Item Env:FRONTEND, Env:BASE_URL, Env:HEADED
```

---

## Test Credentials

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@ebooklibrary.com` | `Admin@12345` | Admin |
| Regular user | `user@ebook.com` | `User1234!` | Regular |

---

## Test Categories & Coverage

### `ReactAnonymous` — 12 tests

File: `Tests/React/ReactAnonymousFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `HomePage_Loads_With_Hero_And_SearchBar` | |
| 2 | `HomePage_Shows_Genre_Cards` | Inconclusive if DB has no genres |
| 3 | `HeroSearch_NavigatesTo_SearchPage` | |
| 4 | `SearchPage_Loads_And_Shows_Filters` | |
| 5 | `SearchPage_TitleFilter_RefreshesResults` | |
| 6 | `SearchPage_NoResults_ShowsMessage` | |
| 7 | `BookDetailPage_Shows_Metadata` | Inconclusive if DB has no books |
| 8 | `BookDetailPage_DownloadButton_PromptsLogin` | Inconclusive if DB has no books |
| 9 | `LoginPage_Shows_Form` | |
| 10 | `LoginPage_WrongPassword_ShowsError` | |
| 11 | `RegisterPage_Shows_Form` | |
| 12 | `AdminRoute_Redirects_AnonymousUser_To_Login` | |

---

### `ReactRegularUser` — 6 tests

File: `Tests/React/ReactRegularUserFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `Register_NewUser_Succeeds_And_Redirects` | Registers a unique user each run |
| 2 | `Login_ValidCredentials_Stores_Token_And_Shows_Nav` | Verifies `auth_token` in localStorage |
| 3 | `Profile_Page_Shows_Email_And_Role` | |
| 4 | `Regular_User_Cannot_Access_Admin_Pages` | |
| 5 | `Logout_Clears_Token_And_Redirects` | Verifies localStorage is cleared |
| 6 | `LoggedIn_User_Sees_Download_Button_On_Book` | Inconclusive if DB has no books |

---

### `ReactAdmin` — 11 tests

File: `Tests/React/ReactAdminFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `Admin_Login_Succeeds_And_Shows_Admin_Link` | |
| 2 | `Admin_Dashboard_Shows_Stats_Cards` | |
| 3 | `AdminBooks_Page_Loads_With_Table` | |
| 4 | `AdminBooks_Add_Button_Opens_Modal` | |
| 5 | `AdminBooks_Create_Book_Succeeds` | Creates a test author via API first; Inconclusive if that fails |
| 6 | `AdminBooks_Delete_Button_Shows_Confirmation` | Inconclusive if no books in DB |
| 7 | `AdminAuthors_Create_And_List_Author` | |
| 8 | `AdminGenres_Create_And_List_Genre` | |
| 9 | `AdminUsers_Page_Loads_And_Shows_Table` | Inconclusive if users table is empty |
| 10 | `AdminUpload_Page_Loads` | |
| 11 | `AdminUpload_Shows_Error_On_Empty_BookId` | |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FRONTEND` | **Yes** | `blazor` | Must be set to `react` to activate React server management |
| `BASE_URL` | Recommended | `http://localhost:5173` | URL of the Vite dev server |
| `API_URL` | No | `http://localhost:5149/api` | WebApi base URL |
| `HEADED` | No | *(unset)* | Set to `1` to run with a visible browser window |

---

## How Auth Injection Works

React tests that need an authenticated browser session (RegularUser and Admin categories)  
use `InjectAuthTokenAsync(token)` defined in `Infrastructure/ReactE2ETestBase.cs`.

This method writes **two** localStorage keys to match the exact shape React expects:

| Key | Value | Used by |
|---|---|---|
| `auth_token` | Raw JWT string | `apiClient.ts` Axios interceptor (Authorization header) |
| `auth-storage` | Zustand persist JSON: `{ state: { user, isAuthenticated, isAdmin }, version: 0 }` | `useAuthStore` (controls nav, protected routes) |

The `user` object fields are **camelCase** (`userId`, `email`, `role`, `token`, `expiresAt`) to  
match the `AuthResponse` TypeScript interface in the React app.

---

## How Server Auto-Management Works

`GlobalTestSetup.cs` → `ServerManager.EnsureServersRunningAsync()`:

1. Reads the `FRONTEND` environment variable (defaults to `blazor`).
2. When `FRONTEND=react`:  
   a. Builds the WebApi project (`dotnet build`).  
   b. Checks if port 5149 (WebApi) is open — starts it if not.  
   c. Checks if port 5173 (Vite) is open — runs `cmd /c npm run dev` in `src/EBookLibrary.React/` if not.  
   d. Waits up to **90 seconds** for Vite to bind on port 5173.  
3. Calls `EnsureTestUsersAsync()` which registers `user@ebook.com` via the API (idempotent).
4. After all tests finish, `StopServers()` kills only the processes that *this run* started.

> If you start the servers manually before running tests, they will not be killed at teardown.

---

## Running Servers Manually (Optional)

If you prefer to control the servers yourself:

**Terminal 1 — WebApi:**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet run --project src/EBookLibrary.WebApi --launch-profile http
```

**Terminal 2 — React (Vite dev server):**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
npm run dev
# Vite will print: VITE v6.x ready on http://localhost:5173
```

**Terminal 3 — Run tests (servers are already up, so ServerManager skips startup):**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
$env:FRONTEND = "react"
$env:BASE_URL  = "http://localhost:5173"
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=ReactAdmin"
```

---

## Running Blazor Tests While React Is the Active Frontend

The `FRONTEND` variable only affects which server `ServerManager` starts. The **test filter**  
controls which tests actually run. If you want to run Blazor tests after having set  
`FRONTEND=react`, reset the variable first:

```powershell
Remove-Item Env:FRONTEND
Remove-Item Env:BASE_URL
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=Admin"
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| All tests fail with `Connection refused :5173` | Vite not running or `npm install` not done | Run `npm install` in `src/EBookLibrary.React`, then set `FRONTEND=react` |
| `FRONTEND` not set → Blazor starts instead of Vite | Missing env variable | `$env:FRONTEND = "react"` before running |
| Tests fail with `401 Unauthorized` from API | Admin account missing | Run the seeder: `dotnet run --project scripts/EBookLibrary.Seeder` |
| Tests fail with `403 Forbidden` | JWT role claim mismatch | Ensure `Program.cs` (WebApi) has `RoleClaimType = ClaimTypes.Role` |
| Tests marked **Inconclusive** | No books/genres in the database | Run the seeder to add sample data |
| Playwright browser not found | Browsers not installed | Run `playwright.ps1 install chromium` (see One-Time Setup) |
| `TimeoutException` waiting for Vite | Cold npm install or slow machine | Vite times out after 90 s; ensure `npm install` was already run |
| `auth-storage` not recognized by app | Zustand key changed | Check `authStore.ts` for the `persist` key name; update `ReactE2ETestBase.InjectAuthTokenAsync` |
