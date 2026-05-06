using Blazored.LocalStorage;
using EBookLibrary.Blazor.Models;
using System.Net.Http.Json;

namespace EBookLibrary.Blazor.Services;

public class AuthService(HttpClient httpClient, ILocalStorageService localStorage,
    CustomAuthStateProvider authStateProvider)
{
    public async Task<(AuthResponse? Data, string? Error)> LoginAsync(LoginRequest request)
    {
        var response = await httpClient.PostAsJsonAsync("auth/login", request);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>();
        if (!response.IsSuccessStatusCode || result?.Data is null)
            return (null, result?.Message ?? result?.Errors?.FirstOrDefault() ?? "Login failed");

        await localStorage.SetItemAsStringAsync("auth_token", result.Data.Token);
        await localStorage.SetItemAsync("auth_user", result.Data);
        authStateProvider.MarkUserAsAuthenticated(result.Data);
        return (result.Data, null);
    }

    public async Task<(AuthResponse? Data, string? Error)> RegisterAsync(RegisterRequest request)
    {
        var response = await httpClient.PostAsJsonAsync("auth/register", request);
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponse>>();
        if (!response.IsSuccessStatusCode || result?.Data is null)
            return (null, result?.Message ?? result?.Errors?.FirstOrDefault() ?? "Registration failed");

        await localStorage.SetItemAsStringAsync("auth_token", result.Data.Token);
        await localStorage.SetItemAsync("auth_user", result.Data);
        authStateProvider.MarkUserAsAuthenticated(result.Data);
        return (result.Data, null);
    }

    public async Task LogoutAsync()
    {
        await localStorage.RemoveItemAsync("auth_token");
        await localStorage.RemoveItemAsync("auth_user");
        authStateProvider.MarkUserAsLoggedOut();
    }

    public async Task<AuthResponse?> GetCurrentUserAsync()
        => await localStorage.GetItemAsync<AuthResponse>("auth_user");
}
