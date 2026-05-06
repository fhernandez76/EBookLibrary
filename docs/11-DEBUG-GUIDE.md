# EBook Library — Debug & UI Testing Guide

Step-by-step instructions for starting a full debug session, running the API, and testing every feature through the Blazor or React SPA.

---

## Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| .NET SDK | 10.0 | `dotnet --version` |
| SQL Server | 2022 Developer Edition | LocalDB, Express, or full edition |
| Node.js | 20 LTS | Required for React SPA only |
| Visual Studio 2022 | 17.12+ | Or VS Code with C# Dev Kit (.NET 10 requires 17.12+) |
| VS Code | Latest | Optional — for React/Blazor debugging |

---

## Part 1 — Environment Setup (First Run)

### Step 1 — Clone / Open Solution

Open the solution file in Visual Studio:

```
c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\EBookLibrary.sln
```

Or from the terminal:

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
start EBookLibrary.sln
```

### Step 2 — Verify SQL Server is Running

The API connects to SQL Server using Windows Authentication and creates the database automatically on first run. Verify SQL Server is running:

```powershell
# Check SQL Server service status
Get-Service -Name 'MSSQLSERVER','MSSQL$*' | Select-Object Name, Status
```

If stopped, start it:

```powershell
Start-Service MSSQLSERVER
# or for LocalDB:
sqllocaldb start MSSQLLocalDB
```

The default connection string targets:

```
Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True
```

To use a named instance or LocalDB, edit `appsettings.Development.json` (create it if it does not exist):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

### Step 3 — Verify the Secret Key

Open `src\EBookLibrary.WebApi\appsettings.json` and confirm `JwtSettings.SecretKey` is at least 64 characters. In Development, replace the placeholder with any 64+ character string:

```json
{
  "JwtSettings": {
    "SecretKey": "dev-secret-key-replace-in-production-at-least-64-characters-long-ok",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpiryInMinutes": 60
  }
}
```

### Step 4 — Verify Book File Storage Path

The API stores uploaded `.epub` files at the path in `FileStorageSettings.BasePath`. Create the folder if it does not exist:

```powershell
New-Item -ItemType Directory -Force -Path "C:\EBookLibrary\Books"
```

You can change this path in `appsettings.json` to any writable folder.

---

## Part 2 — Starting the Web API

### Step 2.1 — From Visual Studio (Recommended for Debugging)

1. In **Solution Explorer**, right-click `EBookLibrary.WebApi` → **Set as Startup Project**.
2. In the toolbar, select the **https** or **http** launch profile (see below).
3. Press **F5** (with debugger) or **Ctrl+F5** (without debugger).

The API starts at:

| Profile | URL |
|---|---|
| http | `http://localhost:5000` |
| https | `https://localhost:7000` |

> **First-run behaviour:** On startup in Development mode, EF Core automatically runs all pending migrations and seeds the admin user account. This creates `EBookLibraryDb` in SQL Server automatically.

### Step 2.2 — From Terminal (Alternative)

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.WebApi"
dotnet run --launch-profile http
```

Or with hot-reload:

```powershell
dotnet watch --launch-profile http
```

### Step 2.3 — Verify API is Running

Open your browser and navigate to:

```
http://localhost:5000/scalar/v1
```

You should see the **EBook Library API v1** Scalar UI with all endpoints listed. This confirms:
- The API started successfully
- The database was created and migrated
- The admin user was seeded

---

## Part 3 — Creating a launchSettings.json Profile (Optional but Recommended)

If the project does not have a `launchSettings.json`, create one at `src\EBookLibrary.WebApi\Properties\launchSettings.json`:

```json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "scalar/v1",
      "applicationUrl": "http://localhost:5000",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    },
    "https": {
      "commandName": "Project",
      "launchBrowser": true,
      "launchUrl": "scalar/v1",
      "applicationUrl": "https://localhost:7000;http://localhost:5000",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

---

## Part 4 — Starting the Blazor SPA

### Step 4.1 — From Visual Studio

1. In **Solution Explorer**, right-click `EBookLibrary.Blazor` → **Set as Startup Project**.
2. Press **F5**.

Blazor starts at `https://localhost:7001` by default (or configure the profile as shown below).

### Step 4.2 — Create Blazor launchSettings.json

Create `src\EBookLibrary.Blazor\Properties\launchSettings.json`:

```json
{
  "$schema": "http://json.schemastore.org/launchsettings.json",
  "profiles": {
    "http": {
      "commandName": "Project",
      "launchBrowser": true,
      "applicationUrl": "http://localhost:5001",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

### Step 4.3 — API Connection (Blazor)

Blazor reads `wwwroot/appsettings.json` at runtime. The default configuration points to:

```json
{
  "ApiBaseUrl": "http://localhost:5000/api"
}
```

**This must match the URL your API is running on.** Confirm both values before testing.

### Step 4.4 — Run Both Projects Simultaneously

Visual Studio supports launching multiple startup projects:

1. Right-click the **Solution** → **Configure Startup Projects**.
2. Select **Multiple startup projects**.
3. Set `EBookLibrary.WebApi` → **Start**.
4. Set `EBookLibrary.Blazor` → **Start**.
5. Click **OK** and press **F5**.

Both projects will start in one debug session. You can set breakpoints in C# code in either project.

---

## Part 5 — Starting the React SPA

### Step 5.1 — Install Node Modules (First Run Only)

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
npm install
```

### Step 5.2 — Configure the API Base URL

The React app's API base URL is typically set via an environment variable or a constants file. Check `src\config.ts` or `src\lib\apiClient.ts` and ensure it points to:

```
http://localhost:5000/api
```

If there is no configuration file, you can set it with a `.env` file at the React project root:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 5.3 — Start the React Dev Server

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
npm run dev
```

React starts at `http://localhost:5173` by default.

> The API `AllowedOrigins` in `appsettings.json` already includes `http://localhost:5173` and `http://localhost:5174`, so CORS is pre-configured.

### Step 5.4 — Debug React in VS Code

1. Open the React folder in VS Code:
   ```powershell
   code "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary\src\EBookLibrary.React"
   ```
2. Install the **JavaScript Debugger** extension if not already installed.
3. Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Debug React (Chrome)",
         "url": "http://localhost:5173",
         "webRoot": "${workspaceFolder}/src",
         "preLaunchTask": "npm: dev"
       }
     ]
   }
   ```
4. Press **F5** in VS Code to launch both the dev server and the Chrome debugger.

---

## Part 6 — Seeded Data (Default Accounts)

On first API startup in Development mode, the database is seeded with:

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@ebooklibrary.com` | `Admin@12345` | Admin |

> **Important:** Change this password before any non-local deployment. The seeder only creates the admin account if no Admin user exists yet.

You can create a regular (non-Admin) user account through the UI Register page or by calling `POST /api/auth/register`.

---

## Part 7 — UI Feature Testing Checklist

Use the following checklist to validate every implemented feature. Test with both the Blazor SPA (`http://localhost:5001`) and the React SPA (`http://localhost:5173`).

### Anonymous Features (No Login Required)

| # | Feature | URL | Steps | Expected Result |
|---|---|---|---|---|
| 1 | Home Page loads | `/` | Navigate to root | Book catalog grid shown, navbar visible |
| 2 | Browse book catalog | `/` | Scroll page | Books displayed as cards with title, author, genre |
| 3 | Search by title | `/search` | Enter a title in the search box | Filtered results shown |
| 4 | Search by author name | `/search` | Enter an author name | Books by that author shown |
| 5 | Search by genre | `/search` | Select a genre from dropdown | Books in that genre shown |
| 6 | Search by year | `/search` | Enter a publication year | Books from that year shown |
| 7 | Pagination | `/` or `/search` | Click next/previous page | Page changes, URL updates |
| 8 | Book detail page | `/books/{id}` | Click on any book card | Book metadata, authors, genres shown |
| 9 | Browse genres list | Via API or navbar | Navigate to genres | Full list shown |
| 10 | Browse authors list | Via API or navbar | Navigate to authors | Full list shown |

### Authentication Features

| # | Feature | URL | Steps | Expected Result |
|---|---|---|---|---|
| 11 | Register new user | `/register` | Fill form, submit | Redirected to home, logged in automatically |
| 12 | Register — validation | `/register` | Submit with weak password | Error messages shown inline |
| 13 | Register — duplicate email | `/register` | Re-register same email | Error: email already in use |
| 14 | Login | `/login` | Enter admin credentials | JWT stored, redirected to home |
| 15 | Login — wrong password | `/login` | Enter wrong password | Error message shown |
| 16 | Logout | Navbar | Click Logout | JWT cleared, redirected to home, Admin links hidden |
| 17 | Protected route redirect | `/profile` (unauthenticated) | Navigate directly | Redirected to `/login` |
| 18 | Token persistence | Any page | Refresh the browser | User remains logged in (token in localStorage) |

### Authenticated User Features

| # | Feature | URL | Steps | Expected Result |
|---|---|---|---|---|
| 19 | Download a book (with file) | `/books/{id}` | Click Download on a book that has an epub file | File downloads as `.epub` |
| 20 | Download blocked (no file) | `/books/{id}` | Click Download on a book without an epub | Appropriate error or button disabled |
| 21 | Download blocked (unauthenticated) | `/books/{id}` | Log out, try to download | Redirected to login or 401 error shown |
| 22 | View profile | `/profile` | Navigate while logged in | User email, name, role displayed |

### Admin Features (Login as `admin@ebooklibrary.com`)

| # | Feature | URL | Steps | Expected Result |
|---|---|---|---|---|
| 23 | Admin dashboard | `/admin` | Navigate while logged in as Admin | Stats cards and navigation shown |
| 24 | Admin route protected | `/admin` (as regular user) | Navigate with non-Admin account | Blocked — redirected or 403 shown |
| 25 | View all books (admin) | `/admin/books` | Navigate | Paginated books table with Edit/Delete columns |
| 26 | Create a book | `/admin/books` | Click "Add Book", fill form, submit | Book appears in list |
| 27 | Edit a book | `/admin/books` | Click Edit on a book, change title, save | Updated title shown in list |
| 28 | Delete a book | `/admin/books` | Click Delete on a book | Book removed from list (soft-deleted) |
| 29 | View all authors (admin) | `/admin/authors` | Navigate | Authors table shown |
| 30 | Create an author | `/admin/authors` | Click "Add Author", fill name, save | Author appears in list |
| 31 | Edit an author | `/admin/authors` | Click Edit, update biography, save | Changes saved |
| 32 | Delete an author | `/admin/authors` | Click Delete | Author removed from list |
| 33 | View all genres (admin) | `/admin/genres` | Navigate | Genres table shown |
| 34 | Create a genre | `/admin/genres` | Click "Add Genre", fill name, save | Genre appears in list |
| 35 | Edit a genre | `/admin/genres` | Click Edit, update description, save | Changes saved |
| 36 | Delete a genre | `/admin/genres` | Click Delete | Genre removed from list |
| 37 | View all users (admin) | `/admin/users` | Navigate | Users table with email, role, createdAt |
| 38 | Promote user to Admin | `/admin/users` | Click "Change Role" on a regular user | Role changes to Admin |
| 39 | Upload epub file | `/admin/upload` | Select a book, choose a `.epub` file, upload | Success message shown, `HasFile = true` |
| 40 | Upload invalid file | `/admin/upload` | Choose a `.pdf` or `.txt` file | Error: only .epub accepted |

---

## Part 8 — Setting Breakpoints for API Debugging

When the API is running under the Visual Studio debugger (F5), you can set breakpoints in any C# file.

**Recommended breakpoint locations:**

| File | Line | What it catches |
|---|---|---|
| `AuthController.cs` — `Register` | Line with `Mediator.Send` | All register requests |
| `AuthController.cs` — `Login` | Line with `Mediator.Send` | All login requests |
| `BooksController.cs` — `Search` | Line with `Mediator.Send` | All search requests |
| `BooksController.cs` — `Download` | Line with `Mediator.Send` | All download requests |
| `ExceptionHandlingMiddleware.cs` | `catch` block | Any unhandled exception |
| `ValidationBehavior.cs` | `throw` line | Any validation error |
| `RegisterUserCommandHandler.cs` | Inside `Handle` | User creation logic |
| `LoginUserCommandHandler.cs` | Inside `Handle` | Password verification |

**Inspect the JWT in the browser:**

1. Open Chrome DevTools → Application → Local Storage → select `http://localhost:5001`.
2. Copy the value of the `authToken` key.
3. Paste it at [jwt.io](https://jwt.io) to decode claims (sub, email, role, exp).

---

## Part 9 — Common Problems & Solutions

| Problem | Cause | Solution |
|---|---|---|
| API fails to start — SQL Server error | SQL Server not running | Start SQL Server service; verify connection string |
| API fails to start — migration error | Database permission | Run as Administrator, or grant the SQL Server login `db_owner` rights |
| Blazor shows CORS error in console | API not running on expected port | Verify API is on `http://localhost:5000` and `ApiBaseUrl` in Blazor `appsettings.json` matches |
| React shows network error | API not running or wrong base URL | Verify `VITE_API_BASE_URL` in `.env`; ensure API is running |
| 401 Unauthorized on download | JWT expired or not sent | Log out and log in again; check `AuthorizationMessageHandler` |
| 403 Forbidden on admin route | Logged in as regular user | Log in as `admin@ebooklibrary.com` |
| 429 Too Many Requests | Rate limiter triggered | Wait 1 minute; rate limit is 10 requests/minute on auth endpoints |
| `C:\EBookLibrary\Books` not found | Storage folder missing | `New-Item -ItemType Directory -Force -Path "C:\EBookLibrary\Books"` |
| JWT `SecretKey` too short | Default placeholder key | Replace `SecretKey` in `appsettings.json` with 64+ character string |

---

## Part 10 — Running Unit Tests

From Visual Studio:
- Open **Test Explorer** → **Run All Tests** (Ctrl+R, A).

From the terminal:

```powershell
cd "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
dotnet test --logger "console;verbosity=normal"
```

Expected output: **67 tests passed, 0 failed**.

Test projects:
- `EBookLibrary.Domain.Tests` — 30 tests (pure domain logic)
- `EBookLibrary.Application.Tests` — 26 tests (CQRS handlers, mocked repositories)
- `EBookLibrary.WebApi.Tests` — 11 tests (integration tests with in-memory DB)
