# Blazor E2E Tests — Execution Guide

Browser-level end-to-end tests for the **Blazor WASM** frontend using Playwright + NUnit.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| .NET SDK | 10.0+ | `dotnet --version` to verify |
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

### 2 — Seed the database (admin account)

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

> **Servers are managed automatically.** `GlobalTestSetup` starts the WebApi (port 5149)  
> and Blazor (ports 7278 / 5014) before the first test runs, then shuts them down after  
> the last test completes — **only if they were not already running.**

---

### Run all Blazor tests

```powershell
dotnet test tests/EBookLibrary.E2E.Tests --no-build
```

---

### Run one category at a time

```powershell
# Anonymous user flows (14 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=Anonymous"

# Regular user flows (6 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=RegularUser"

# Admin flows (11 tests)
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=Admin"
```

---

### Watch tests in the browser (headful mode)

```powershell
$env:HEADED = "1"
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=Admin"
```

Remove the variable when done:

```powershell
Remove-Item Env:HEADED
```

---

## Test Credentials

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@ebooklibrary.com` | `Admin@12345` | Admin |
| Regular user | `user@ebook.com` | `User1234!` | Regular |

---

## Test Categories & Coverage

### `Anonymous` — 14 tests

File: `Tests/AnonymousFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `HomePage_Loads_And_Shows_HeroSection` | |
| 2 | `HomePage_Shows_GenreList` | |
| 3 | `HomePage_Shows_FeaturedBooks` | Inconclusive if DB has no books |
| 4 | `SearchPage_Loads_And_Accepts_TitleFilter` | |
| 5 | `SearchPage_ClearFilters_ResetsResults` | |
| 6 | `BookDetailPage_Shows_Metadata` | Inconclusive if DB has no books |
| 7 | `BookDetailPage_DownloadButton_PromptsLogin_ForAnonymous` | |
| 8 | `LoginPage_Shows_Form` | |
| 9 | `LoginPage_Shows_ValidationError_OnBadCredentials` | |
| 10 | `RegisterPage_Shows_Form` | |
| 11 | `RegisterPage_Shows_ValidationError_OnPasswordMismatch` | |
| 12 | `AdminPage_Redirects_Anonymous_To_Login` | |
| 13 | `Nav_Shows_Login_And_Register_Links_For_Anonymous` | |
| 14 | `Nav_Does_Not_Show_Admin_Link_For_Anonymous` | |

---

### `RegularUser` — 6 tests

File: `Tests/RegularUserFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `Register_New_User_Succeeds_And_Redirects` | |
| 2 | `Login_Regular_User_Succeeds_And_Shows_Profile_Link` | |
| 3 | `Profile_Page_Shows_User_Data` | |
| 4 | `Regular_User_Sees_Download_Button_On_Available_Book` | Skipped if DB has no books |
| 5 | `Regular_User_Cannot_Access_Admin_Pages` | |
| 6 | `Logout_Clears_Session_And_Redirects_To_Login_Or_Home` | |

---

### `Admin` — 11 tests

File: `Tests/AdminFlowTests.cs`

| # | Test Name | Notes |
|---|---|---|
| 1 | `Admin_Login_Succeeds_And_Shows_Admin_Link` | |
| 2 | `Admin_Dashboard_Shows_Stats_Cards` | |
| 3 | `AdminBooks_Page_Loads_And_Shows_Table` | |
| 4 | `AdminBooks_Add_Button_Opens_Modal` | |
| 5 | `AdminBooks_Create_Book_Succeeds` | Creates a test author via API first |
| 6 | `AdminBooks_Delete_Button_Shows_Confirmation` | Inconclusive if no books in DB |
| 7 | `AdminAuthors_Create_And_List_Author` | |
| 8 | `AdminGenres_Create_And_List_Genre` | |
| 9 | `AdminUsers_Page_Loads_And_Shows_RoleToggle` | |
| 10 | `AdminUpload_Page_Loads_And_Shows_Form` | |
| 11 | `AdminUpload_Shows_Error_On_Invalid_BookId` | |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FRONTEND` | `blazor` | Controls which frontend `ServerManager` starts. Must be `blazor` for these tests. |
| `BASE_URL` | `https://localhost:7278` | URL of the Blazor app under test |
| `API_URL` | `http://localhost:5149/api` | WebApi base URL |
| `HEADED` | *(unset)* | Set to `1` to run with a visible browser window |

---

## How Server Auto-Management Works

`GlobalTestSetup.cs` → `ServerManager.EnsureServersRunningAsync()`:

1. Checks if port 5149 (WebApi) is open. If not, builds and starts the WebApi.
2. Checks if port 5014 or 7278 (Blazor) is open. If not, builds and starts Blazor.
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

**Terminal 2 — Blazor:**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet run --project src/EBookLibrary.Blazor --launch-profile https
```

**Terminal 3 — Run tests (servers are already up, so ServerManager skips startup):**
```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet test tests/EBookLibrary.E2E.Tests --no-build --filter "Category=Admin"
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| All tests fail with `Connection refused` | WebApi not running | Let ServerManager handle it, or start manually on port 5149 |
| `403 Forbidden` on admin tests | JWT RoleClaimType mismatch | Ensure `Program.cs` has `RoleClaimType = ClaimTypes.Role` |
| `401 Unauthorized` after login | `auth_token` JSON-encoded | Ensure `AuthService.cs` uses `SetItemAsStringAsync` (not `SetItemAsync`) |
| Tests marked **Inconclusive** | No books in the database | Run the seeder to add sample data |
| Playwright browser not found | Browsers not installed | Run `playwright.ps1 install chromium` (see One-Time Setup) |
| `TimeoutException` on Blazor page | Cold start on first run | Increase timeout or wait for Blazor to finish loading (check port 5014) |
