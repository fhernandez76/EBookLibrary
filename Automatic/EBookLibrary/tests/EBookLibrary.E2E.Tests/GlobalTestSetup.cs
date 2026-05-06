using EBookLibrary.E2E.Tests.Infrastructure;
using System.Net.Http.Json;
using System.Text.Json;

namespace EBookLibrary.E2E.Tests;

/// <summary>
/// NUnit assembly-level setup: starts WebApi and Blazor before any test runs,
/// stops the ones it started after all tests complete.
/// </summary>
[SetUpFixture]
public class GlobalTestSetup
{
    private static readonly string ApiUrl =
        Environment.GetEnvironmentVariable("API_URL") ?? "http://localhost:5149/api";

    [OneTimeSetUp]
    public async Task StartServers()
    {
        await ServerManager.EnsureServersRunningAsync();
        await EnsureTestUsersAsync();
    }

    [OneTimeTearDown]
    public void StopServers()
    {
        ServerManager.StopServers();
    }

    /// <summary>
    /// Ensures user@ebook.com exists (admin is created by DataSeeder on startup).
    /// Ignores conflicts (user may already exist from a prior run).
    /// </summary>
    private static async Task EnsureTestUsersAsync()
    {
        using var http = new HttpClient();
        var jsonOpts = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        // Register regular user — ignore 400 (already exists or validation)
        try
        {
            await http.PostAsJsonAsync($"{ApiUrl}/auth/register", new
            {
                email = "user@ebook.com",
                password = "User1234!",
                confirmPassword = "User1234!",
                firstName = "Test",
                lastName = "User"
            });
        }
        catch { /* silently ignore network errors */ }
    }
}
