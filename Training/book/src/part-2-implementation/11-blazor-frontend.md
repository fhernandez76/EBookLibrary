# Chapter 11 — The Blazor Frontend

> *"One language, one mental model, one stack — when that's the
> simplification you need, Blazor is unbeatable."*

---

## What you will learn

- How Blazor Server, Blazor WebAssembly, and the modern *interactive
  render modes* fit together, and which one this project uses and
  why.
- How a Razor component composes markup, code-behind, and CSS in a
  single file (or three).
- How **MudBlazor** gives the project a complete Material Design
  component library with no per-control styling.
- How JWT authentication works in a Blazor SPA and why the storage
  trade-off is the same as React's.
- How the admin and reader views share an authenticated `HttpClient`
  configured once at startup.
- When the Blazor implementation is the right choice, and when React
  is.

---

## 11.1 Why a second frontend exists

The project ships *both* a React SPA (Chapter 10) and a Blazor SPA
(this chapter) against the same Web API. The reason is pedagogical:
having two frontends against one backend is the cleanest possible
demonstration that the backend is, in fact, frontend-agnostic. If the
two SPAs can both consume the same OpenAPI document and the same
JWT-protected endpoints, the layering of Chapters 4–7 was real.

The reason in production-flavored thinking is different: most teams
will never need two frontends, but most engineers will eventually
inherit a Blazor codebase and need to know the ropes. Chapter 11 is
the one-chapter Blazor primer that doubles as a deeper test of the
backend's neutrality.

---

## 11.2 Choosing a render mode

Blazor in .NET 10 supports four render modes; the choice is the first
real decision in any Blazor project.

**Table 11.1 — Blazor render modes.**

| Mode                        | Where C# runs            | Initial load | Interactivity start | Best for                                  |
|-----------------------------|--------------------------|--------------|---------------------|-------------------------------------------|
| Static SSR                  | Server (no interactivity)| Fast         | Never               | Marketing pages, SEO-heavy reads          |
| Interactive Server          | Server, over SignalR     | Fast         | Immediate           | Internal apps with reliable LAN           |
| Interactive WebAssembly     | Browser                  | Slow (Wasm)  | After Wasm download | Public SPAs that must work offline        |
| Interactive Auto            | Server first, Wasm later | Fast         | Immediate           | Public SPAs that want fast first paint    |

The project uses **Interactive WebAssembly**. The reasons:

- It mirrors the React deployment story: a folder of static files plus
  the Web API. No SignalR backplane. No sticky sessions.
- It demonstrates the *frontend-agnostic backend* point most
  forcefully — the Blazor app is, like React, "just an HTTP client".
- It is the mode most students have seen the least of.

> **In Practice:** Interactive Server has real strengths — instant
> startup, near-zero download, full server-side debugging. For
> internal LOB applications behind a corporate VPN, it is often the
> right choice. The cost is the SignalR connection: every interactive
> user holds an open WebSocket, which sets the scaling story.
> Interactive WebAssembly trades a slow first paint for a stateless
> server.

---

## 11.3 Project structure

The Blazor project lives in `src/EBookLibrary.Blazor/`. It mirrors
the React structure conceptually, but in .NET shape.

**Listing 11.1 — Folder layout.**

```text
EBookLibrary.Blazor/
├── Pages/                  ← @page-routed components: Home, Login, ...
├── Components/             ← Reusable: BookCard, AdminLayout, ...
│   └── Layout/             ← MainLayout, NavMenu
├── Services/               ← API client, auth state provider
├── Models/                 ← DTOs mirroring backend
├── wwwroot/                ← Static assets, appsettings.json
├── Program.cs              ← Startup
└── App.razor + Routes.razor← Router
```

There is one Razor file per route, one service per concern, and one
authentication state provider that all of them depend on.

---

## 11.4 The MudBlazor component library

MudBlazor is the project's chosen UI library. It provides ~70
Material-Design components — buttons, dialogs, data grids, snackbars,
date pickers — with consistent theming and no per-component CSS.

**Listing 11.2 — `Pages/Login.razor` (markup section).**

```razor
@page "/login"
@inject IAuthService Auth
@inject NavigationManager Nav

<MudContainer MaxWidth="MaxWidth.Small" Class="mt-12">
  <MudPaper Class="pa-8">
    <MudText Typo="Typo.h4" Align="Align.Center" Class="mb-6">Sign in</MudText>

    <EditForm Model="form" OnValidSubmit="SubmitAsync">
      <DataAnnotationsValidator />

      <MudTextField @bind-Value="form.Email"
                    Label="Email"
                    Variant="Variant.Outlined"
                    Required="true" RequiredError="Email is required" />

      <MudTextField @bind-Value="form.Password"
                    Label="Password"
                    Variant="Variant.Outlined"
                    InputType="InputType.Password"
                    Required="true" RequiredError="Password is required"
                    Class="mt-4" />

      <MudButton ButtonType="ButtonType.Submit"
                 Variant="Variant.Filled"
                 Color="Color.Primary" FullWidth="true" Class="mt-6">
        Sign in
      </MudButton>

      @if (!string.IsNullOrEmpty(error))
      {
        <MudAlert Severity="Severity.Error" Class="mt-4">@error</MudAlert>
      }
    </EditForm>
  </MudPaper>
</MudContainer>
```

The `EditForm` + `DataAnnotationsValidator` pair gives client-side
validation derived from the same data annotations the backend uses
(§ 5.4). The two layers of validation (client + server) catch
different categories of mistake, both are necessary.

---

## 11.5 The code-behind half

Razor allows two styles: an `@code { }` block at the bottom of the
`.razor` file, or a separate `.razor.cs` partial class. The project
uses the partial-class style for anything beyond a few lines.

**Listing 11.3 — `Pages/Login.razor.cs` (code-behind).**

```csharp
public partial class Login : ComponentBase
{
    [Inject] public IAuthService Auth { get; set; } = default!;
    [Inject] public NavigationManager Nav { get; set; } = default!;
    [Inject] public ISnackbar Snackbar { get; set; } = default!;

    private LoginForm form  = new();
    private string?   error;

    private async Task SubmitAsync()
    {
        var result = await Auth.LoginAsync(form.Email, form.Password);
        if (!result.IsSuccess)
        {
            error = "Invalid email or password.";    // generic — see § 5.5
            return;
        }
        Snackbar.Add("Welcome back!", Severity.Success);
        Nav.NavigateTo("/");
    }

    private sealed class LoginForm
    {
        [Required, EmailAddress] public string Email    { get; set; } = "";
        [Required]               public string Password { get; set; } = "";
    }
}
```

Code-behind keeps the Razor file readable. It also makes the page
unit-testable in isolation (Chapter 12 covers Blazor component tests
with bUnit).

---

## 11.6 Authentication state

Blazor provides an extensibility point — `AuthenticationStateProvider`
— for pages and components to ask "is the user logged in, and what
role?". The project subclasses it.

**Listing 11.4 — `Services/JwtAuthenticationStateProvider.cs`.**

```csharp
public sealed class JwtAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly ILocalStorageService _storage;
    public JwtAuthenticationStateProvider(ILocalStorageService storage)
        => _storage = storage;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var token = await _storage.GetItemAsync<string>("auth_token");
        if (string.IsNullOrWhiteSpace(token))
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));

        var identity = new ClaimsIdentity(ParseJwtClaims(token), "jwt");
        return new AuthenticationState(new ClaimsPrincipal(identity));
    }

    public void NotifySignIn(string token)
    {
        var identity = new ClaimsIdentity(ParseJwtClaims(token), "jwt");
        NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(new ClaimsPrincipal(identity))));
    }

    public void NotifySignOut() =>
        NotifyAuthenticationStateChanged(
            Task.FromResult(new AuthenticationState(
                new ClaimsPrincipal(new ClaimsIdentity()))));

    private static IEnumerable<Claim> ParseJwtClaims(string jwt) { /* … */ }
}
```

Pages declare the user with `<AuthorizeView>` and `<NotAuthorized>`
sub-tags; the framework reads from this provider. The provider reads
from `localStorage`, which means the same XSS exposure as React
applies (§ 8.6) and the same mitigations are recommended.

---

## 11.7 The authenticated `HttpClient`

`HttpClient` is registered with a *delegating handler* that attaches
the JWT to every request, identical in spirit to the React Axios
interceptor of Listing 10.2.

**Listing 11.5 — `Services/AuthorizationMessageHandler.cs`.**

```csharp
public sealed class AuthorizationMessageHandler : DelegatingHandler
{
    private readonly ILocalStorageService _storage;
    public AuthorizationMessageHandler(ILocalStorageService storage)
        => _storage = storage;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await _storage.GetItemAsync<string>("auth_token");
        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, ct);
    }
}
```

`Program.cs` chains the handler into the `HttpClient` pipeline:

**Listing 11.6 — `Program.cs` (HttpClient registration).**

```csharp
builder.Services
    .AddScoped<AuthorizationMessageHandler>()
    .AddHttpClient("EBookApi", c =>
        c.BaseAddress = new Uri(builder.Configuration["ApiBaseUrl"]!))
    .AddHttpMessageHandler<AuthorizationMessageHandler>();

builder.Services.AddScoped(sp =>
    sp.GetRequiredService<IHttpClientFactory>().CreateClient("EBookApi"));
```

Every API service the rest of the project consumes is constructed
with this preconfigured `HttpClient`. The token attachment is
invisible to callers.

---

## 11.8 The admin dashboard

The admin dashboard combines a `MudDataGrid`, a paging strip, and a
modal `MudDialog` for the create-and-edit form.

![Figure 11.1 — Admin dashboard rendered by the Blazor frontend.](figures/16-ui-admin-dashboard.jpg)
![Figure 11.2 — Sequence: admin creates a new book.](figures/10-seq-admin-create-book.jpg)

**Listing 11.7 — `Pages/Admin/Books.razor` (data grid sketch).**

```razor
@page "/admin/books"
@attribute [Authorize(Roles = "Admin")]

<MudDataGrid T="BookListItem" ServerData="LoadServerData" Sortable="true">
  <Columns>
    <PropertyColumn Property="x => x.Title" Title="Title" />
    <PropertyColumn Property="x => x.AuthorNames" Title="Authors" />
    <PropertyColumn Property="x => x.Status" Title="Status" />
    <TemplateColumn Title="Actions">
      <CellTemplate>
        <MudIconButton Icon="@Icons.Material.Filled.Edit"
                       OnClick="() => OpenEdit(context.Item)" />
        <MudIconButton Icon="@Icons.Material.Filled.Delete"
                       OnClick="() => Delete(context.Item)" />
      </CellTemplate>
    </TemplateColumn>
  </Columns>
  <PagerContent>
    <MudDataGridPager T="BookListItem" />
  </PagerContent>
</MudDataGrid>
```

`@attribute [Authorize(Roles = "Admin")]` is the Blazor analogue of
the controller attribute — and, like the React route guard, is a UX
feature, not a security feature. The backend is the authoritative
gate.

> **Architect's Note:** `MudDataGrid`'s `ServerData` callback supports
> server-side paging and sorting natively; the grid hands the
> callback a `GridState<T>` describing the page index, page size, and
> sort definitions, and the callback returns a `GridData<T>` of the
> matching slice. Mapping that to the backend's `SearchAsync` is one
> small adapter method. Resist the temptation to use the grid's
> client-side mode against a 51K-row catalog — the browser's memory
> will not thank you.

---

## 11.9 React versus Blazor — a fair comparison

The project's two SPAs make a side-by-side comparison practical.

**Table 11.2 — React vs. Blazor for this project.**

| Dimension                       | React (Vite + TS)            | Blazor WebAssembly (.NET 10)  |
|---------------------------------|------------------------------|--------------------------------|
| Languages a contributor needs   | TypeScript + JSX             | C# + Razor                     |
| Initial download size           | ~150–250 KB (gzipped)        | ~1.5–2 MB (Wasm runtime)       |
| Time-to-interactive             | Fast                         | Slower (Wasm warm-up)          |
| Component library used here     | TanStack Table (mostly bare) | MudBlazor (~70 components)     |
| State management ceremony       | Zustand + TanStack Query     | Built-in DI + custom services  |
| Server-shared types             | Hand-maintained TS types     | C# DTOs *can* be shared as a NuGet |
| SEO / SSR story                 | Excellent (Next.js)          | Fair (server prerendering)     |
| Hot reload feel                 | Vite — instant               | Good in Server, slower in Wasm |
| Talent pool                     | Vast                         | Significant in .NET shops      |

The honest summary: **for a public consumer SPA, React wins on
initial load and SEO; for an internal LOB application in a .NET shop,
Blazor wins on language unification.** Both are correct here.

---

## 11.10 Checkpoint

You are ready for Chapter 12 (and the start of Part III) when:

- [ ] `dotnet run --project src/EBookLibrary.Blazor/` serves the SPA
      at `https://localhost:7278`.
- [ ] Login with the seeded admin succeeds and refreshing the page
      keeps you logged in.
- [ ] `/admin/books` shows the data grid with paged results from the
      seeded catalog.
- [ ] An admin-only `/admin/books` request still returns from a fresh
      browser logged in with a regular user — the *page* renders the
      "Not authorized" view because the backend rejects the API
      calls.
- [ ] You can articulate the reason this project ships *both* a React
      and a Blazor frontend (hint: it is about the backend, not the
      frontends).

---

## Key takeaways

- Blazor WebAssembly deploys like a SPA — static files behind the
  same API as React. Server mode is a different story (SignalR,
  sticky sessions).
- MudBlazor erases the styling tax — every screen looks coherent
  without per-component CSS.
- The auth pattern mirrors React: a state provider over
  `localStorage`, a delegating handler attaching the JWT, the same
  XSS exposure and the same mitigations.
- Page `[Authorize]` attributes are UX. The backend is security.
- Two frontends against one backend is the cleanest demonstration
  that the backend is frontend-agnostic — and a useful exercise in
  evaluating when each technology earns its keep.

---

## Exercises

**Easy.** Add a snackbar notification on every successful API
mutation (create, update, delete) using `ISnackbar`. The pattern is
already in `Login.razor.cs`; generalize it.

**Medium.** Convert one page from `@code` block style to partial-class
code-behind style and write one bUnit test against it. Discuss what
became easier and what became more verbose.

**Hard.** Render the admin dashboard with **Interactive Auto** mode
instead of WebAssembly, accepting the trade-off of needing a SignalR
connection on first paint. Measure the time-to-interactive in
DevTools and compare with the WebAssembly build. Decide which mode
the page deserves and why.

---

## Further reading

- Microsoft, *Blazor render modes* in the .NET 10 docs.
  <https://docs.microsoft.com/aspnet/core/blazor/components/render-modes>
- MudBlazor docs.
  <https://mudblazor.com/>
- Steve Sanderson, *original Blazor talk* (the *why* of the
  technology).
- Egil Hansen, *bUnit* documentation.
  <https://bunit.dev/>
