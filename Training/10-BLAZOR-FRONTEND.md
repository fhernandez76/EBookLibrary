# Chapter 10 — Blazor WebAssembly Frontend (Path B)

> *"Blazor lets you build browser apps in C# — the same language as your API."*

---

## Chapter Objectives

By the end of this chapter you will:
- Understand what Blazor WebAssembly is and how it differs from React
- Have the `CustomAuthStateProvider` implemented for JWT auth in Blazor
- Have all pages implemented matching the React frontend feature set
- Have bilingual support via .NET localization resources
- Know the key differences between Blazor and React patterns

---

## 10.1 Blazor WebAssembly vs. React — Comparison

Before diving in, understand the fundamental difference:

| Aspect | React | Blazor WebAssembly |
|---|---|---|
| Language | TypeScript/JavaScript | C# |
| Runtime | V8 (browser's JS engine) | WebAssembly (Mono runtime) |
| DOM Updates | Virtual DOM diffing | Blazor's render tree |
| State Management | Zustand + React Query | Cascading Parameters + Services |
| Routing | React Router v6 | Blazor Router (`@page` directive) |
| HTTP Client | Axios | `HttpClient` (same as .NET) |
| Auth | JWT + localStorage | `AuthenticationStateProvider` |
| Localization | i18next | .NET `IStringLocalizer<T>` |
| UI Framework | Tailwind CSS | Bootstrap 5 |
| Initial Load | Fast (small JS bundle) | Slower (downloads .NET runtime ~5MB) |
| Developer UX | JavaScript ecosystem | Full .NET ecosystem in browser |

**When to choose Blazor:**
- Your team is .NET-first and wants to avoid context-switching
- You want to share C# models/DTOs between server and browser
- You want C#'s strong typing end-to-end

**When to choose React:**
- Fastest possible initial load time
- Largest ecosystem of UI libraries
- More frontend developers available

---

## 10.2 Project Configuration

**File:** `src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj`

```xml
<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly"
                      Version="10.*" />
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer"
                      Version="10.*" PrivateAssets="all" />
    <PackageReference Include="Microsoft.AspNetCore.Components.Authorization"
                      Version="10.*" />
    <PackageReference Include="Microsoft.Extensions.Localization" Version="10.*" />
    <PackageReference Include="Blazored.LocalStorage" Version="4.*" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.*" />
  </ItemGroup>
</Project>
```

**File:** `src/EBookLibrary.Blazor/wwwroot/appsettings.json`

```json
{ "ApiBaseUrl": "http://localhost:5149/api" }
```

---

## 10.3 Models (Mirror of API DTOs)

Unlike React (TypeScript interfaces), Blazor uses C# records:

**File:** `src/EBookLibrary.Blazor/Models/AuthModels.cs`

```csharp
namespace EBookLibrary.Blazor.Models;

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string ConfirmPassword,
    string? FirstName, string? LastName);
public record AuthResponse(string UserId, string Email, string? FirstName, string? LastName,
    string Role, string Token, DateTime ExpiresAt);
```

**File:** `src/EBookLibrary.Blazor/Models/BookModels.cs`

```csharp
namespace EBookLibrary.Blazor.Models;

public record BookSummary(string Id, string Title, int Pages, int? PublicationYear,
    string? CoverImageUrl, string Status, bool HasFile, string PrimaryAuthor, string PrimaryGenre);

public record BookDetail(string Id, string Title, int Pages, int? PublicationYear,
    string? Isbn, string? Description, string Language, string Status, bool HasFile,
    List<string> Authors, List<string> Genres);

public record BookSearchFilter(string? Title = null, string? AuthorName = null,
    string? GenreName = null, int? PublicationYear = null, int PageNumber = 1, int PageSize = 20);

public record PagedResult<T>(IEnumerable<T> Items, int TotalCount, int PageNumber,
    int PageSize, int TotalPages, bool HasPreviousPage, bool HasNextPage);

public record ApiResponse<T>(bool Success, T? Data, string? Message, List<string>? Errors);
```

---

## 10.4 CustomAuthStateProvider — The Core Auth Component

In Blazor, authentication state is provided by `AuthenticationStateProvider`. This is the Blazor equivalent of the Zustand auth store in React.

**File:** `src/EBookLibrary.Blazor/Services/CustomAuthStateProvider.cs`

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;

namespace EBookLibrary.Blazor.Services;

public class CustomAuthStateProvider : AuthenticationStateProvider
{
    private readonly ILocalStorageService _localStorage;
    private AuthenticationState _anonymous = new(new ClaimsPrincipal(new ClaimsIdentity()));

    public CustomAuthStateProvider(ILocalStorageService localStorage)
        => _localStorage = localStorage;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var token = await _localStorage.GetItemAsStringAsync("auth_token");

        if (string.IsNullOrWhiteSpace(token))
            return _anonymous;

        // Parse claims from the JWT without calling the server
        var claims = ParseClaimsFromJwt(token);
        var identity = new ClaimsIdentity(claims, "jwt");
        var user = new ClaimsPrincipal(identity);

        return new AuthenticationState(user);
    }

    public async Task SetAuthStateAsync(string token)
    {
        await _localStorage.SetItemAsStringAsync("auth_token", token);

        var claims = ParseClaimsFromJwt(token);
        var identity = new ClaimsIdentity(claims, "jwt");
        var user = new ClaimsPrincipal(identity);

        // Notify Blazor that auth state has changed — triggers UI re-render
        NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(user)));
    }

    public async Task ClearAuthStateAsync()
    {
        await _localStorage.RemoveItemAsync("auth_token");
        await _localStorage.RemoveItemAsync("auth_user");
        NotifyAuthenticationStateChanged(Task.FromResult(_anonymous));
    }

    private static IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
    {
        var handler = new JwtSecurityTokenHandler();

        // Don't validate the token here (the server already validated it)
        // Just extract claims for the browser UI
        if (!handler.CanReadToken(jwt))
            return Enumerable.Empty<Claim>();

        var token = handler.ReadJwtToken(jwt);
        return token.Claims;
    }
}
```

### Why Parse JWT Client-Side?

Blazor needs to know the user's identity (name, role) to:
- Show/hide navigation items
- Enforce `[Authorize]` route guards
- Display the user's name in the header

Rather than calling the API on every page load, we parse the claims from the JWT token that's already stored in localStorage. The server will re-validate the token signature when actual API calls are made.

---

## 10.5 Program.cs Configuration

**File:** `src/EBookLibrary.Blazor/Program.cs`

```csharp
using Blazored.LocalStorage;
using EBookLibrary.Blazor.Services;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// API HTTP client
builder.Services.AddScoped(sp => new HttpClient
{
    BaseAddress = new Uri(builder.Configuration["ApiBaseUrl"]
        ?? builder.HostEnvironment.BaseAddress)
});

// Auth
builder.Services.AddBlazoredLocalStorage();
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, CustomAuthStateProvider>();
builder.Services.AddScoped<CustomAuthStateProvider>();

// Application services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BookService>();
builder.Services.AddScoped<CatalogService>();

// Localization
builder.Services.AddLocalization(opts => opts.ResourcesPath = "Resources");

await builder.Build().RunAsync();
```

---

## 10.6 AuthorizationMessageHandler

For API calls that require JWT, attach the token automatically:

**File:** `src/EBookLibrary.Blazor/Services/AuthorizationMessageHandler.cs`

```csharp
using Blazored.LocalStorage;

namespace EBookLibrary.Blazor.Services;

public class AuthorizationMessageHandler : DelegatingHandler
{
    private readonly ILocalStorageService _localStorage;

    public AuthorizationMessageHandler(ILocalStorageService localStorage)
        => _localStorage = localStorage;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await _localStorage.GetItemAsStringAsync("auth_token");
        if (!string.IsNullOrEmpty(token))
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        return await base.SendAsync(request, ct);
    }
}
```

---

## 10.7 App.razor — Root Component with Auth

**File:** `src/EBookLibrary.Blazor/App.razor`

```razor
<CascadingAuthenticationState>
    <Router AppAssembly="@typeof(App).Assembly">
        <Found Context="routeData">
            <AuthorizeRouteView RouteData="@routeData" DefaultLayout="@typeof(MainLayout)">
                <NotAuthorized>
                    @if (context.User.Identity?.IsAuthenticated != true)
                    {
                        <RedirectToLogin />
                    }
                    else
                    {
                        <p>You are not authorized to view this page.</p>
                    }
                </NotAuthorized>
            </AuthorizeRouteView>
            <FocusOnNavigate RouteData="@routeData" Selector="h1" />
        </Found>
        <NotFound>
            <PageTitle>Not found</PageTitle>
            <LayoutView Layout="@typeof(MainLayout)">
                <p>Sorry, there's nothing at this address.</p>
            </LayoutView>
        </NotFound>
    </Router>
</CascadingAuthenticationState>
```

---

## 10.8 Page Component Examples

### Search Page

```razor
@page "/search"
@using EBookLibrary.Blazor.Models
@inject BookService BookService
@inject IStringLocalizer<SharedResources> L

<PageTitle>@L["Search.Title"]</PageTitle>

<div class="container py-4">
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <input class="form-control" placeholder="@L["Search.TitleFilter"]"
                   @bind="filter.Title" @bind:event="oninput"
                   @onchange="OnFilterChanged" />
        </div>
        <div class="col-md-4">
            <input class="form-control" placeholder="@L["Search.AuthorFilter"]"
                   @bind="filter.AuthorName" @bind:event="oninput"
                   @onchange="OnFilterChanged" />
        </div>
        <div class="col-md-4">
            <input class="form-control" placeholder="@L["Search.GenreFilter"]"
                   @bind="filter.GenreName" @bind:event="oninput"
                   @onchange="OnFilterChanged" />
        </div>
    </div>

    @if (isLoading)
    {
        <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
        </div>
    }
    else if (books?.Items.Any() == true)
    {
        <p class="text-muted">@L["Search.Results", books.TotalCount]</p>
        <div class="row row-cols-2 row-cols-md-4 g-4">
            @foreach (var book in books.Items)
            {
                <div class="col">
                    <BookCard Book="book" />
                </div>
            }
        </div>
        <Pagination CurrentPage="currentPage" TotalPages="books.TotalPages"
                    OnPageChange="ChangePage" />
    }
    else
    {
        <p class="text-center text-muted py-5">@L["Search.NoResults"]</p>
    }
</div>

@code {
    private BookSearchFilter filter = new();
    private PagedResult<BookSummary>? books;
    private int currentPage = 1;
    private bool isLoading = false;

    protected override async Task OnInitializedAsync()
        => await LoadBooksAsync();

    private async Task OnFilterChanged()
    {
        currentPage = 1;
        await LoadBooksAsync();
    }

    private async Task LoadBooksAsync()
    {
        isLoading = true;
        books = await BookService.SearchAsync(filter with { PageNumber = currentPage });
        isLoading = false;
    }

    private async Task ChangePage(int page)
    {
        currentPage = page;
        await LoadBooksAsync();
    }
}
```

### Login Page

```razor
@page "/login"
@inject AuthService AuthService
@inject NavigationManager Nav
@inject IStringLocalizer<SharedResources> L

<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-md-5">
            <div class="card shadow-sm">
                <div class="card-body p-4">
                    <h2 class="card-title text-center mb-4">@L["Login.Title"]</h2>

                    <EditForm Model="loginRequest" OnValidSubmit="HandleLogin">
                        <DataAnnotationsValidator />

                        <div class="mb-3">
                            <label class="form-label">@L["Login.Email"]</label>
                            <InputText class="form-control" @bind-Value="loginRequest.Email" />
                            <ValidationMessage For="@(() => loginRequest.Email)" />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">@L["Login.Password"]</label>
                            <InputText type="password" class="form-control"
                                       @bind-Value="loginRequest.Password" />
                        </div>

                        @if (!string.IsNullOrEmpty(errorMessage))
                        {
                            <div class="alert alert-danger">@errorMessage</div>
                        }

                        <button type="submit" class="btn btn-primary w-100"
                                disabled="@isLoading">
                            @if (isLoading) { <span class="spinner-border spinner-border-sm me-2"></span> }
                            @L["Login.Submit"]
                        </button>
                    </EditForm>
                </div>
            </div>
        </div>
    </div>
</div>

@code {
    private LoginRequest loginRequest = new("", "");
    private string? errorMessage;
    private bool isLoading;

    private async Task HandleLogin()
    {
        isLoading = true;
        errorMessage = null;
        try
        {
            await AuthService.LoginAsync(loginRequest);
            Nav.NavigateTo("/", forceLoad: false);
        }
        catch (Exception ex)
        {
            errorMessage = ex.Message;
        }
        finally { isLoading = false; }
    }
}
```

---

## 10.9 Localization Resources

**File:** `src/EBookLibrary.Blazor/Resources/SharedResources.es.resx`

```xml
<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Nav.Home">            <value>Inicio</value></data>
  <data name="Nav.Search">          <value>Buscar</value></data>
  <data name="Login.Title">         <value>Iniciar sesión</value></data>
  <data name="Login.Email">         <value>Correo electrónico</value></data>
  <data name="Login.Password">      <value>Contraseña</value></data>
  <data name="Login.Submit">        <value>Ingresar</value></data>
  <data name="Search.TitleFilter">  <value>Buscar por título...</value></data>
  <data name="Search.AuthorFilter"> <value>Buscar por autor...</value></data>
  <data name="Search.Results">      <value>{0} resultados encontrados</value></data>
  <data name="Search.NoResults">    <value>No se encontraron libros</value></data>
  <data name="Book.Download">       <value>Descargar ePub</value></data>
</root>
```

**File:** `src/EBookLibrary.Blazor/Resources/SharedResources.en.resx`

```xml
<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Nav.Home">            <value>Home</value></data>
  <data name="Nav.Search">          <value>Search</value></data>
  <data name="Login.Title">         <value>Sign In</value></data>
  <data name="Login.Email">         <value>Email address</value></data>
  <data name="Login.Password">      <value>Password</value></data>
  <data name="Login.Submit">        <value>Sign In</value></data>
  <data name="Search.TitleFilter">  <value>Search by title...</value></data>
  <data name="Search.AuthorFilter"> <value>Search by author...</value></data>
  <data name="Search.Results">      <value>{0} results found</value></data>
  <data name="Search.NoResults">    <value>No books found</value></data>
  <data name="Book.Download">       <value>Download ePub</value></data>
</root>
```

---

## 10.10 Key Differences: Blazor vs. React Patterns

| Task | React Pattern | Blazor Pattern |
|---|---|---|
| Component lifecycle | `useEffect(() => {}, [])` | `OnInitializedAsync()` |
| State update | `useState`, `set*` | `StateHasChanged()` (usually auto) |
| Form binding | `onChange` + controlled inputs | `@bind-Value` two-way binding |
| Event handling | `onClick={handler}` | `@onclick="handler"` |
| Conditional rendering | `{condition && <Component />}` | `@if (condition) { <Component /> }` |
| List rendering | `.map((item) => <Card key={item.id}>)` | `@foreach (var item in list) { <Card> }` |
| Route params | `useParams()` | `[Parameter]` attribute |
| Auth check | `useAuthStore().isAuthenticated` | `<AuthorizeView>` component |
| CSS classes | `className="..."` | `class="..."` (standard HTML) |

---

## 10.11 Running Blazor

```bash
# Development server
dotnet run --project src/EBookLibrary.Blazor
# Opens https://localhost:7278
```

The Blazor WASM app downloads the .NET runtime (~5MB) on first load and then runs in the browser. Subsequent loads are cached.

---

## 10.12 Checkpoint ✅

The Blazor frontend is complete when:

- [ ] `dotnet run` starts at `https://localhost:7278` without errors
- [ ] Home page renders the book catalog
- [ ] Search page calls the API and shows results
- [ ] `CustomAuthStateProvider` correctly populates user claims from JWT
- [ ] Login/Register work and update the nav bar
- [ ] `[Authorize]` on Profile page redirects to login when not authenticated
- [ ] `[Authorize(Roles = "Admin")]` on admin pages redirects Regular users
- [ ] Language can be toggled between Spanish and English
- [ ] Admin CRUD pages work for books, authors, genres, users
- [ ] Admin Users page: role toggle, status toggle (power icon ⏻), edit modal, delete modal all work
- [ ] Status toggle, role toggle, and delete actions are disabled for the current logged-in admin

---

## 10.13 🤖 AI-Assisted Development — Blazor

**What Copilot generated well:**
- `CustomAuthStateProvider` structure
- `EditForm` with `InputText` and `ValidationMessage`
- `.resx` localization file format

**What required correction:**
- Initial `CustomAuthStateProvider` called the API to validate the token on every page load (expensive and unnecessary). Fixed to parse claims locally from the JWT.
- `.resx` resource files: Copilot's localization key names didn't match what was used in the `.razor` files. Required manual alignment.
- `IStringLocalizer<T>` injection: initial generation used `IStringLocalizer<Login>` per-page instead of a shared resource class — less maintainable.

---

## Further Reading

- [docs/09-BLAZOR-FRONTEND.md](../docs/09-BLAZOR-FRONTEND.md) — Original Blazor frontend prompt document
- Blazor WebAssembly documentation: https://docs.microsoft.com/aspnet/core/blazor
- Blazored.LocalStorage: https://github.com/Blazored/LocalStorage
- ASP.NET Core Blazor authentication: https://docs.microsoft.com/aspnet/core/blazor/security

---

**← Previous:** [08 — Database & Migrations](08-DATABASE-MIGRATIONS.md)  
**Next →** [11 — Unit Tests](11-UNIT-TESTS.md)
