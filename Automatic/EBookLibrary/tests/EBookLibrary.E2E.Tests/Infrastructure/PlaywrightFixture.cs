using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace EBookLibrary.E2E.Tests.Infrastructure;

/// <summary>
/// Base class for all E2E tests. Inherits from PageTest (Playwright NUnit).
/// Reads BASE_URL from env; defaults to Blazor on https://localhost:7278.
/// Set BASE_URL=http://localhost:5173 to target React instead.
/// </summary>
public abstract class E2ETestBase : PageTest
{
    protected static string BaseUrl =>
        Environment.GetEnvironmentVariable("BASE_URL") ?? "https://localhost:7278";

    protected static string ApiUrl =>
        Environment.GetEnvironmentVariable("API_URL") ?? "http://localhost:5149/api";

    // Credentials created by DataSeeder (admin@ebooklibrary.com) and EnsureUsersAsync (regular user)
    protected const string AdminEmail = "admin@ebooklibrary.com";
    protected const string AdminPassword = "Admin@12345";
    protected const string UserEmail = "user@ebook.com";
    protected const string UserPassword = "User1234!";

    private static readonly JsonSerializerOptions _jsonOpts =
        new(JsonSerializerDefaults.Web);  // case-insensitive

    /// <summary>Login via API and return the JWT token. Unwraps ApiResponse&lt;T&gt; envelope.</summary>
    protected static async Task<string> GetTokenAsync(string email, string password)
    {
        using var http = new HttpClient();
        var response = await http.PostAsJsonAsync(
            $"{ApiUrl}/auth/login",
            new { email, password });

        response.EnsureSuccessStatusCode();
        var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<TokenData>>(_jsonOpts);
        return envelope?.Data?.Token
            ?? throw new InvalidOperationException("Token missing from login response");
    }

    /// <summary>Inject a JWT into localStorage so the app treats the browser as logged-in.</summary>
    protected async Task InjectAuthTokenAsync(string token)
    {
        await Page.EvaluateAsync(@"(token) => {
            // Blazored.LocalStorage 4.x:
            //   SetItemAsStringAsync(key, val) → stores raw string (no JSON wrapper)
            //   GetItemAsStringAsync(key)       → reads raw string
            //   SetItemAsync<T>(key, obj)       → stores JSON.serialize(obj)
            //   GetItemAsync<T>(key)            → reads JSON.deserialize(storedValue)
            //
            // CustomAuthStateProvider uses GetItemAsStringAsync('auth_token')
            // → must store the token as a raw, unquoted string.
            localStorage.setItem('auth_token', token);

            // Build auth_user for Profile page: SetItemAsync<AuthResponse> serializes with System.Text.Json
            try {
                const parts = token.split('.');
                const payload = JSON.parse(atob(parts[1]));
                const roleKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
                // Blazored.LocalStorage default JsonSerializerOptions: PropertyNamingPolicy=null,
                // PropertyNameCaseInsensitive=false — so PascalCase keys must match the C# record.
                // AuthResponse record: UserId, Email, FirstName, LastName, Role, Token, ExpiresAt
                const authUser = {
                    UserId: payload.sub,
                    Email: payload.email || '',
                    FirstName: null,
                    LastName: null,
                    Role: payload[roleKey] || payload.role || '',
                    Token: token,
                    ExpiresAt: new Date(payload.exp * 1000).toISOString()
                };
                localStorage.setItem('auth_user', JSON.stringify(authUser));
            } catch(e) { console.warn('InjectAuthTokenAsync: JWT decode failed', e); }

            // React / Zustand (key: auth-store)
            const zustand = JSON.stringify({ state: { token, isAuthenticated: true }, version: 0 });
            localStorage.setItem('auth-store', zustand);
        }", token);
    }

    public override BrowserNewContextOptions ContextOptions()
    {
        // Ignore HTTPS cert errors for localhost self-signed certs (Blazor https profile).
        // Use a desktop-sized viewport so Bootstrap navbar doesn't collapse.
        return new BrowserNewContextOptions
        {
            IgnoreHTTPSErrors = true,
            ViewportSize = new ViewportSize { Width = 1280, Height = 800 },
        };
    }

    // API response envelope: { "success": true, "data": { ... } }
    private record ApiEnvelope<T>(bool Success, T? Data, string? Message);
    private record TokenData(string Token, string UserId, string Email, string Role);
}
