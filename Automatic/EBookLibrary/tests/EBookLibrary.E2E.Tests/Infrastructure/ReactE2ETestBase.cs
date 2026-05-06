using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace EBookLibrary.E2E.Tests.Infrastructure;

/// <summary>
/// Base class for React E2E tests. Targets Vite dev server on http://localhost:5173.
/// Auth injection writes Zustand 'auth-storage' + raw 'auth_token' to localStorage,
/// matching exactly how authStore.setAuth() stores state.
/// </summary>
public abstract class ReactE2ETestBase : PageTest
{
    protected static string BaseUrl =>
        Environment.GetEnvironmentVariable("BASE_URL") ?? "http://localhost:5173";

    protected static string ApiUrl =>
        Environment.GetEnvironmentVariable("API_URL") ?? "http://localhost:5149/api";

    protected const string AdminEmail = "admin@ebooklibrary.com";
    protected const string AdminPassword = "Admin@12345";
    protected const string UserEmail = "user@ebook.com";
    protected const string UserPassword = "User1234!";

    private static readonly JsonSerializerOptions _jsonOpts =
        new(JsonSerializerDefaults.Web);

    /// <summary>Login via API and return the JWT token.</summary>
    protected static async Task<string> GetTokenAsync(string email, string password)
    {
        using var http = new HttpClient();
        var response = await http.PostAsJsonAsync(
            $"{ApiUrl}/auth/login",
            new { email, password });

        response.EnsureSuccessStatusCode();
        var envelope = await response.Content
            .ReadFromJsonAsync<ApiEnvelope<TokenData>>(_jsonOpts);
        return envelope?.Data?.Token
            ?? throw new InvalidOperationException("Token missing from login response");
    }

    /// <summary>
    /// Inject a JWT into localStorage so React/Zustand treats the browser as logged-in.
    /// Writes:
    ///   auth_token       — raw JWT string (used by axios interceptor)
    ///   auth-storage     — Zustand persist state (used by useAuthStore)
    /// </summary>
    protected async Task InjectAuthTokenAsync(string token)
    {
        await Page.EvaluateAsync(@"(token) => {
            // Decode JWT payload to extract claims
            const parts = token.split('.');
            const payload = JSON.parse(atob(parts[1]));
            const roleUri = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
            const role = payload[roleUri] || payload.role || 'Regular';
            const userId = payload.sub || '';
            const email = payload.email || '';
            const exp = payload.exp || 0;
            const expiresAt = new Date(exp * 1000).toISOString();

            // 1. Raw token — read by axios interceptor in apiClient.ts
            localStorage.setItem('auth_token', token);

            // 2. Zustand persist key 'auth-storage' — structure must match authStore.ts exactly:
            //    { state: { user: AuthResponse, isAuthenticated, isAdmin }, version: 0 }
            //    AuthResponse fields are camelCase (userId, email, role, token, expiresAt)
            const authState = {
                state: {
                    user: {
                        userId,
                        email,
                        firstName: null,
                        lastName: null,
                        role,
                        token,
                        expiresAt,
                    },
                    isAuthenticated: true,
                    isAdmin: role === 'Admin',
                },
                version: 0,
            };
            localStorage.setItem('auth-storage', JSON.stringify(authState));
        }", token);
    }

    public override BrowserNewContextOptions ContextOptions() => new()
    {
        IgnoreHTTPSErrors = true,
        ViewportSize = new ViewportSize { Width = 1280, Height = 800 },
    };

    private record ApiEnvelope<T>(bool Success, T? Data, string? Message);
    private record TokenData(string Token, string UserId, string Email, string Role);
}
