# Component 09 — Blazor WebAssembly Frontend

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the Blazor WebAssembly frontend for EBook Library.
> **Session goal:** Generate a complete Blazor WASM application with authentication, book search, admin panel, and EN/ES localization — matching the same features as the React frontend.
> **Project:** `src/EBookLibrary.Blazor/` (.NET 10, Blazor WebAssembly)
> **UI framework:** Bootstrap 5 with custom CSS (or MudBlazor if preferred)
> **Prerequisites:** Backend API (Component 05) must be running.

---

## Context

The Blazor WebAssembly frontend is an **alternative** to the React frontend, targeting developers who prefer to stay in the .NET/C# ecosystem. It:
- Runs entirely in the browser via WebAssembly
- Communicates with the same REST API as the React frontend
- Uses `HttpClient` with JWT auth headers
- Uses Blazor's built-in `AuthenticationStateProvider` for auth
- Supports Spanish and English via .NET localization resources
- Uses component-based architecture (Razor components)

---

## Task 1 — Project Configuration

### File: `src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>EBookLibrary.Blazor</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="10.*" />
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="10.*" PrivateAssets="all" />
    <PackageReference Include="Microsoft.AspNetCore.Components.Authorization" Version="10.*" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="10.*" />
    <PackageReference Include="Microsoft.Extensions.Localization" Version="10.*" />
    <PackageReference Include="Blazored.LocalStorage" Version="4.*" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.*" />
  </ItemGroup>
</Project>
```

> **Note:** `Microsoft.AspNetCore.Components.Authorization` (for `AuthorizeRouteView`, `CascadingAuthenticationState`, `[Authorize]` routing) and `Microsoft.Extensions.Localization` (for `IStringLocalizer<T>`) are **both required** and must be listed explicitly — they are not transitively included by the WebAssembly SDK.

### File: `src/EBookLibrary.Blazor/wwwroot/appsettings.json`

```json
{
  "ApiBaseUrl": "http://localhost:5000/api"
}
```

---

## Task 2 — Models (Mirror of API DTOs)

### File: `Models/AuthModels.cs`

```csharp
namespace EBookLibrary.Blazor.Models;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(
    string Email, string Password, string ConfirmPassword,
    string? FirstName, string? LastName);

public record AuthResponse(
    string UserId, string Email, string? FirstName, string? LastName,
    string Role, string Token, DateTime ExpiresAt);

public record UserProfile(
    string Id, string Email, string? FirstName, string? LastName,
    string Role, bool IsActive, DateTime CreatedAt);
```

### File: `Models/BookModels.cs`

```csharp
namespace EBookLibrary.Blazor.Models;

public record BookSummary(
    string Id, string Title, int Pages, int? PublicationYear,
    string? CoverImageUrl, string Status, bool HasFile,
    string PrimaryAuthor, string PrimaryGenre);

public record BookDetail(
    string Id, string Title, int Pages, int? PublicationYear,
    string? Isbn, string? Description, string? CoverImageUrl,
    string Language, string Status, bool HasFile,
    List<string> Authors, List<string> Genres);

public record BookSearchFilter(
    string? Title = null, string? AuthorName = null, string? GenreName = null,
    int? PublicationYear = null, int PageNumber = 1, int PageSize = 20);

public record PagedResult<T>(
    IEnumerable<T> Items, int TotalCount, int PageNumber, int PageSize,
    int TotalPages, bool HasPreviousPage, bool HasNextPage);

public record ApiResponse<T>(bool Success, T? Data, string? Message, List<string>? Errors);
```

### File: `Models/CatalogModels.cs`

```csharp
namespace EBookLibrary.Blazor.Models;

public record AuthorModel(string Id, string Name, string? Biography, int BookCount);
public record GenreModel(string Id, string Name, string? Description, int BookCount);
public record UserModel(string Id, string Email, string? FirstName, string? LastName,
    string Role, bool IsActive, DateTime CreatedAt);
```

---

## Task 3 — HTTP Services

### File: `Services/AuthService.cs`

```csharp
using Blazored.LocalStorage;
using System.Net.Http.Json;

namespace EBookLibrary.Blazor.Services;

public class AuthService
{
    private readonly HttpClient _httpClient;
    private readonly ILocalStorageService _localStorage;
    private readonly CustomAuthStateProvider _authStateProvider;

    public AuthService(HttpClient httpClient, ILocalStorageService localStorage,
        CustomAuthStateProvider authStateProvider)
    {
        _httpClient = httpClient;
        _localStorage = localStorage;
        _authStateProvider = authStateProvider;
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var response = await _httpClient.PostAsJsonAsync("auth/login", request);
        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>();
        if (result?.Data is null) return null;

        await _localStorage.SetItemAsync("auth_token", result.Data.Token);
        await _localStorage.SetItemAsync("auth_user", result.Data);
        _authStateProvider.MarkUserAsAuthenticated(result.Data);
        return result.Data;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var response = await _httpClient.PostAsJsonAsync("auth/register", request);
        if (!response.IsSuccessStatusCode) return null;

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>();
        if (result?.Data is null) return null;

        await _localStorage.SetItemAsync("auth_token", result.Data.Token);
        await _localStorage.SetItemAsync("auth_user", result.Data);
        _authStateProvider.MarkUserAsAuthenticated(result.Data);
        return result.Data;
    }

    public async Task LogoutAsync()
    {
        await _localStorage.RemoveItemAsync("auth_token");
        await _localStorage.RemoveItemAsync("auth_user");
        _authStateProvider.MarkUserAsLoggedOut();
    }
}
```

### File: `Services/CustomAuthStateProvider.cs`

```csharp
using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EBookLibrary.Blazor.Services;

public class CustomAuthStateProvider : AuthenticationStateProvider
{
    private readonly ILocalStorageService _localStorage;

    public CustomAuthStateProvider(ILocalStorageService localStorage)
        => _localStorage = localStorage;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var token = await _localStorage.GetItemAsStringAsync("auth_token");
        if (string.IsNullOrWhiteSpace(token))
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            if (jwt.ValidTo < DateTime.UtcNow)
            {
                await _localStorage.RemoveItemAsync("auth_token");
                return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));
            }

            var claims = jwt.Claims.ToList();
            var identity = new ClaimsIdentity(claims, "jwt");
            var principal = new ClaimsPrincipal(identity);
            return new AuthenticationState(principal);
        }
        catch
        {
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));
        }
    }

    public void MarkUserAsAuthenticated(AuthResponse auth)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, auth.UserId),
            new Claim(ClaimTypes.Email, auth.Email),
            new Claim(ClaimTypes.Role, auth.Role),
        }, "jwt");
        var principal = new ClaimsPrincipal(identity);
        NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(principal)));
    }

    public void MarkUserAsLoggedOut()
        => NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()))));
}
```

### File: `Services/BookService.cs`

```csharp
using System.Net.Http.Json;

namespace EBookLibrary.Blazor.Services;

public class BookService
{
    private readonly HttpClient _httpClient;
    private readonly IJSRuntime _jsRuntime;

    public BookService(HttpClient httpClient, IJSRuntime jsRuntime)
    {
        _httpClient = httpClient;
        _jsRuntime = jsRuntime;
    }

    public async Task<PagedResult<BookSummary>?> SearchAsync(BookSearchFilter filter)
    {
        var query = $"books/search?pageNumber={filter.PageNumber}&pageSize={filter.PageSize}";
        if (!string.IsNullOrWhiteSpace(filter.Title)) query += $"&title={Uri.EscapeDataString(filter.Title)}";
        if (!string.IsNullOrWhiteSpace(filter.AuthorName)) query += $"&authorName={Uri.EscapeDataString(filter.AuthorName)}";
        if (!string.IsNullOrWhiteSpace(filter.GenreName)) query += $"&genreName={Uri.EscapeDataString(filter.GenreName)}";
        if (filter.PublicationYear.HasValue) query += $"&publicationYear={filter.PublicationYear}";

        var response = await _httpClient.GetFromJsonAsync<ApiResponse<PagedResult<BookSummary>>>(query);
        return response?.Data;
    }

    public async Task<BookDetail?> GetByIdAsync(string id)
    {
        var response = await _httpClient.GetFromJsonAsync<ApiResponse<BookDetail>>($"books/{id}");
        return response?.Data;
    }

    public async Task DownloadAsync(string bookId, string fileName)
    {
        var response = await _httpClient.GetAsync($"books/{bookId}/download");
        if (!response.IsSuccessStatusCode) return;

        var bytes = await response.Content.ReadAsByteArrayAsync();
        // Trigger browser download via JS interop
        await _jsRuntime.InvokeVoidAsync("downloadFileFromBytes", fileName, "application/epub+zip", bytes);
    }
}
```

---

## Task 4 — Program.cs

### File: `Program.cs`

```csharp
using Blazored.LocalStorage;
using EBookLibrary.Blazor;
using EBookLibrary.Blazor.Services;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "http://localhost:5000/api/";
if (!apiBaseUrl.EndsWith('/')) apiBaseUrl += '/';

// HTTP client with JWT interceptor
builder.Services.AddScoped(sp =>
{
    var localStorage = sp.GetRequiredService<ILocalStorageService>();
    var handler = new AuthorizationMessageHandler(localStorage);
    return new HttpClient(handler) { BaseAddress = new Uri(apiBaseUrl) };
});

// Auth
builder.Services.AddBlazoredLocalStorage();
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, CustomAuthStateProvider>();
builder.Services.AddScoped(sp => (CustomAuthStateProvider)sp.GetRequiredService<AuthenticationStateProvider>());

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BookService>();
// Add GenreService, AuthorService, UserService following same pattern

// Localization
builder.Services.AddLocalization(opt => opt.ResourcesPath = "Resources");

await builder.Build().RunAsync();
```

> **Note:** `using EBookLibrary.Blazor;` is required so that `App` (defined in `App.razor` as class `EBookLibrary.Blazor.App`) is resolvable from `Program.cs`. Without it, the compiler cannot find `App` even though it is in the same project.

### File: `Services/AuthorizationMessageHandler.cs`

```csharp
using Blazored.LocalStorage;

namespace EBookLibrary.Blazor.Services;

public class AuthorizationMessageHandler : DelegatingHandler
{
    private readonly ILocalStorageService _localStorage;

    public AuthorizationMessageHandler(ILocalStorageService localStorage)
    {
        _localStorage = localStorage;
        InnerHandler = new HttpClientHandler();
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await _localStorage.GetItemAsStringAsync("auth_token");
        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, ct);
    }
}
```

---

## Task 4.5 — Update App.razor for Authorized Routing

### File: `App.razor`

Replace the default `<RouteView>` with `<AuthorizeRouteView>` wrapped in `<CascadingAuthenticationState>`:

```razor
<CascadingAuthenticationState>
    <Router AppAssembly="@typeof(App).Assembly">
        <Found Context="routeData">
            <AuthorizeRouteView RouteData="@routeData" DefaultLayout="@typeof(MainLayout)">
                <NotAuthorized>
                    @if (!context.User.Identity!.IsAuthenticated)
                    {
                        <RedirectToLogin />
                    }
                    else
                    {
                        <LayoutView Layout="@typeof(MainLayout)">
                            <h2>Access Denied</h2>
                            <p>You do not have permission to view this page.</p>
                        </LayoutView>
                    }
                </NotAuthorized>
            </AuthorizeRouteView>
            <FocusOnNavigate RouteData="@routeData" Selector="h1" />
        </Found>
        <NotFound>
            <PageTitle>Not found</PageTitle>
            <LayoutView Layout="@typeof(MainLayout)">
                <p role="alert">Sorry, there's nothing at this address.</p>
            </LayoutView>
        </NotFound>
    </Router>
</CascadingAuthenticationState>
```

### File: `Shared/RedirectToLogin.razor`

```razor
@inject NavigationManager Navigation

@code {
    protected override void OnInitialized()
    {
        var returnUrl = Uri.EscapeDataString(Navigation.ToBaseRelativePath(Navigation.Uri));
        Navigation.NavigateTo($"/login?returnUrl={returnUrl}");
    }
}
```

### File: `_Imports.razor`

Ensure the following `@using` directives are present. Note that `Microsoft.AspNetCore.Authorization` (for `[Authorize]` attribute) is **separate** from `Microsoft.AspNetCore.Components.Authorization` (for `AuthorizeView`, etc.):

```razor
@using System.Net.Http
@using System.Net.Http.Json
@using Microsoft.AspNetCore.Components.Forms
@using Microsoft.AspNetCore.Components.Routing
@using Microsoft.AspNetCore.Components.Web
@using Microsoft.AspNetCore.Components.Web.Virtualization
@using Microsoft.AspNetCore.Components.WebAssembly.Http
@using Microsoft.AspNetCore.Components.Authorization
@using Microsoft.AspNetCore.Authorization
@using Microsoft.JSInterop
@using Microsoft.Extensions.Localization
@using EBookLibrary.Blazor
@using EBookLibrary.Blazor.Layout
@using EBookLibrary.Blazor.Models
@using EBookLibrary.Blazor.Services
@using EBookLibrary.Blazor.Shared
```

---

## Task 5 — Layout Components

### File: `Layout/MainLayout.razor`

```razor
@inherits LayoutComponentBase

<div class="min-vh-100 d-flex flex-column">
    <NavMenu />
    <main class="flex-grow-1">
        <div class="container-xl py-4">
            @Body
        </div>
    </main>
    <footer class="bg-dark text-white py-3 mt-auto">
        <div class="container-xl text-center">
            <small>© 2026 EBook Library — @Localizer["nav.home"]</small>
        </div>
    </footer>
</div>
```

### File: `Layout/NavMenu.razor`

Generate a responsive Bootstrap 5 navbar with:
- Brand: "EBook Library" linking to "/"
- Nav items: Home, Search Books
- Auth section: "Login / Register" if not authenticated, or user dropdown with "Profile, Logout"
- Admin link if user is Admin
- Language switcher (EN/ES buttons)
- Uses `<AuthorizeView>` component for conditional rendering

### File: `Layout/AdminLayout.razor`

Generate an admin layout with:
- Left sidebar (Bootstrap offcanvas on mobile)
- Sidebar items: Dashboard, Books, Authors, Genres, Users, Upload ePub
- Top bar with page title and user info

---

## Task 6 — Pages

### File: `Pages/Home.razor`

Generate a home page with:
- `@page "/"`
- Hero section with gradient background, headline, search input
- Genre cards grid (fetched from API)
- Featured/recent books section

### File: `Pages/Search.razor`

Generate: `@page "/search"` with:
- Filter panel: Title, Author, Genre (select), Year
- Results as Bootstrap card grid (3 columns on desktop, 1 on mobile)
- Pagination using Bootstrap pagination component
- Loading spinner while fetching
- Uses `BookService.SearchAsync()`

> **CS0542 — method name matches class name:** The generated class for `Search.razor` is named `Search`. A method named `Search()` inside it will trigger CS0542. Name the method `RunSearch()` instead.

### File: `Pages/BookDetail.razor`

Generate: `@page "/books/{BookId}"` with:
- Book details layout
- Download button with `[Authorize]` guard
- Uses `BookService.GetByIdAsync()`

> **Naming conflict:** The Razor page `BookDetail.razor` generates a class named `BookDetail` in `EBookLibrary.Blazor.Pages`. Because a model record `EBookLibrary.Blazor.Models.BookDetail` has the same name, the `_book` field **must** use the fully-qualified type name to avoid CS0029:
> ```csharp
> private EBookLibrary.Blazor.Models.BookDetail? _book;
> ```
> `NavigateTo` does not accept an `int` argument for back-navigation — use `Nav.NavigateTo("/search")` or `Nav.NavigateTo("/")` instead.

### File: `Pages/Auth/Login.razor`

Generate: `@page "/login"` with:
- EditForm with DataAnnotations validation
- LoginRequest model with `[Required]`, `[EmailAddress]` annotations
- Submit → `AuthService.LoginAsync()` → navigate to home or return URL
- Error message display

### File: `Pages/Auth/Register.razor`

Generate: `@page "/register"` with:
- RegisterRequest model with validation attributes
- Password confirm validation (IValidatableObject or custom validator)
- Uses `AuthService.RegisterAsync()`

### File: `Pages/Admin/AdminDashboard.razor`

Generate: `@page "/admin"` with:
- `@attribute [Authorize(Roles = "Admin")]`
- Stats cards: Total Books, Available Books, Total Users, Total Authors
- Quick links to admin sections

### File: `Pages/Admin/AdminBooks.razor`

Generate: `@page "/admin/books"` with:
- `@attribute [Authorize(Roles = "Admin")]`
- Bootstrap table with book list (paginated)
- Add/Edit modal using `BookFormComponent`
- Delete confirmation modal

### File: `Pages/Admin/AdminUsers.razor`

Generate: `@page "/admin/users"` with:
- `@attribute [Authorize(Roles = "Admin")]`
- Bootstrap table showing all users (email, name, role, active status, created date)
- **Role toggle button** — calls `PATCH /api/users/{id}/role`
- **Status toggle button** (power icon ⏻) — calls `PATCH /api/users/{id}/status`; disabled for current user
- **Edit button** (pencil ✏) — opens Bootstrap modal to edit firstName, lastName, email, optional password reset; calls `PUT /api/users/{id}`
- **Delete button** (trash 🗑) — opens Bootstrap confirmation modal; calls `DELETE /api/users/{id}`; disabled for current user
- Self-protection: role toggle, status toggle, and delete buttons are disabled when the row matches the logged-in admin's user ID

---

## Task 7 — Shared Components

### File: `Shared/BookCard.razor`

```razor
@using EBookLibrary.Blazor.Models

<div class="card h-100 shadow-sm book-card" style="cursor:pointer"
     @onclick="() => NavigationManager.NavigateTo($"/books/{Book.Id}")">
    <div class="card-img-top bg-gradient d-flex align-items-center justify-content-center"
         style="height:200px; background: linear-gradient(135deg, #1a3c7c 0%, #b0133a 100%);">
        @if (!string.IsNullOrWhiteSpace(Book.CoverImageUrl))
        {
            <img src="@Book.CoverImageUrl" alt="@Book.Title" class="img-fluid h-100 object-fit-cover" />
        }
        else
        {
            <i class="bi bi-book text-white" style="font-size: 4rem;"></i>
        }
    </div>
    <div class="card-body d-flex flex-column">
        <h6 class="card-title fw-bold text-truncate-2lines">@Book.Title</h6>
        <p class="card-text text-muted small">@Book.PrimaryAuthor</p>
        <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="badge" style="background-color: #b0133a;">@Book.PrimaryGenre</span>
            @if (Book.HasFile)
            {
                <span class="badge bg-success">ePub</span>
            }
        </div>
    </div>
</div>

@code {
    [Parameter] public BookSummary Book { get; set; } = null!;
    [Inject] private NavigationManager NavigationManager { get; set; } = null!;
}
```

### File: `Shared/PaginationComponent.razor`

Generate a Bootstrap 5 pagination component with:
- Parameters: `TotalPages`, `CurrentPage`, `OnPageChange` EventCallback<int>
- Shows previous/next buttons
- Shows up to 7 page numbers

> **Razor directive conflict:** Inside HTML markup, `@page` is always parsed as a Razor `@page` directive regardless of context. Use `@(page)` (with parentheses) when rendering the page number variable inside button content.

> **Razor string interpolation in event attributes:** When a string-interpolated URL needs to be passed to `NavigationManager.NavigateTo()` inside an `@onclick` attribute, using escaped quotes (`\"`) inside a double-quoted attribute causes `CS1056`. Use either:
> - A local variable: `var url = $"/.../{value}"; <button @onclick="() => Nav.NavigateTo(url)">`
> - Single-quoted attribute: `<button @onclick='() => Nav.NavigateTo("/path")'>`

### File: `Shared/LoadingSpinner.razor`

```razor
@if (IsLoading)
{
    <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">@Localizer["common.loading"]</span>
        </div>
    </div>
}
@code {
    [Parameter] public bool IsLoading { get; set; }
    [Inject] private IStringLocalizer<App> Localizer { get; set; } = null!;
}
```

---

## Task 8 — JS Interop for File Download

### File: `wwwroot/index.html` — Add JS function

```html
<script>
    window.downloadFileFromBytes = (fileName, contentType, bytes) => {
        const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };
</script>
```

---

## Task 9 — Localization Resources

### File: `Resources/App.en.resx`

Create a .resx file with all string resources for English:
- Keys: `nav.home`, `nav.search`, `nav.login`, `nav.logout`, `nav.admin`, etc.
- Values: English translations

### File: `Resources/App.es.resx`

Create a .resx file with Spanish translations for all the same keys.

**Note:** Use `IStringLocalizer<App>` injection throughout components.

---

## Task 10 — Build and Run

```bash
cd src/EBookLibrary.Blazor

# Run in development
dotnet run

# Open: https://localhost:7001

# Build for production
dotnet publish -c Release -o publish/
```

---

## Deliverables Checklist

- [ ] Project compiles with `dotnet build`
- [ ] `CustomAuthStateProvider.cs` reads JWT from localStorage
- [ ] `AuthorizationMessageHandler.cs` attaches Bearer token to all requests
- [ ] `AuthService.cs` — Login, Register, Logout
- [ ] `BookService.cs` — Search, GetById, Download
- [ ] `Program.cs` fully configured
- [ ] `MainLayout.razor` and `AdminLayout.razor`
- [ ] `NavMenu.razor` with AuthorizeView
- [ ] `Home.razor` — hero + genre cards + featured books
- [ ] `Search.razor` — filters + results + pagination
- [ ] `BookDetail.razor` — details + download
- [ ] `Login.razor` and `Register.razor` with validation
- [ ] `AdminDashboard.razor` — stats overview
- [ ] `AdminBooks.razor` — CRUD table
- [ ] `AdminUsers.razor` — role toggle, status toggle, edit modal, delete modal, self-protection
- [ ] `BookCard.razor` shared component
- [ ] `PaginationComponent.razor`
- [ ] English + Spanish resource files loaded
- [ ] `downloadFileFromBytes` JS interop function in index.html
- [ ] App runs at https://localhost:7001 and connects to API

---

*Component 09 of 10 — EBook Library Project*
