# EBookLibrary E2E Tests

Browser-level end-to-end tests using **Playwright** (NUnit). Tests target both the **Blazor** and **React** frontends.

## Prerequisites

1. **Run the WebApi** — `dotnet run` from `src/EBookLibrary.WebApi` (port 5149)
2. **Seed test data** — `dotnet run` from `scripts/EBookLibrary.Seeder`  
   Ensures `admin@ebook.com` / `Admin1234!` and `user@ebook.com` / `User1234!` exist.
3. **Install Playwright browsers** (one-time):
   ```powershell
   dotnet build
   # Or manually:
   pwsh bin/Debug/net10.0/playwright.ps1 install chromium
   ```

## Running Tests

### Against Blazor (default)
```powershell
# Start Blazor
cd src/EBookLibrary.Blazor
dotnet run

# Run tests (another terminal)
cd tests/EBookLibrary.E2E.Tests
dotnet test --filter "Category=Anonymous"
dotnet test --filter "Category=RegularUser"
dotnet test --filter "Category=Admin"
```

### Against React
```powershell
# Start React dev server
cd src/EBookLibrary.React
npm run dev

# Run tests targeting React (another terminal)
$env:BASE_URL = "http://localhost:5173"
dotnet test
```

### Headful mode (watch the browser)
```powershell
$env:HEADED = "1"
dotnet test
```

## Test Categories

| Category      | File                        | Tests | What's covered |
|---------------|-----------------------------|-------|----------------|
| `Anonymous`   | AnonymousFlowTests.cs       | 14    | Home, Search, Book Detail, Auth forms, Admin redirect |
| `RegularUser` | RegularUserFlowTests.cs     |  6    | Register, Login, Profile, Download button, Admin block, Logout |
| `Admin`       | AdminFlowTests.cs           | 12    | Login, Dashboard, Books/Authors/Genres CRUD modals, Users role toggle, Upload |

## Environment Variables

| Variable   | Default                    | Description |
|------------|----------------------------|-------------|
| `BASE_URL`  | `https://localhost:7278`   | Frontend under test |
| `API_URL`   | `http://localhost:5149/api` | WebApi base URL for token acquisition |
| `HEADED`    | *(unset)*                  | Set to `1` for visible browser |
