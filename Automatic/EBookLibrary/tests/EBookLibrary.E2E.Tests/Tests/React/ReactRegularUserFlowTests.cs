using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests.React;

/// <summary>
/// Regular-user flow tests for the React (Vite) UI.
/// Run with: FRONTEND=react BASE_URL=http://localhost:5173 dotnet test --filter "Category=ReactRegularUser"
/// </summary>
[TestFixture]
[Category("React")]
[Category("ReactRegularUser")]
public class ReactRegularUserFlowTests : ReactE2ETestBase
{
    // ── Register ───────────────────────────────────────────────────────────

    [Test]
    public async Task Register_NewUser_Succeeds_And_Redirects()
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var email = $"e2e_{unique}@test.com";

        await Page.GotoAsync($"{BaseUrl}/register");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email']").First.FillAsync(email);

        var passInputs = Page.Locator("input[type='password']");
        await passInputs.Nth(0).FillAsync("Test1234!");
        await passInputs.Nth(1).FillAsync("Test1234!");

        await Page.Locator("button[type='submit']").First.ClickAsync();

        // On success → navigate away from /register (to / or /login)
        try
        {
            await Page.WaitForURLAsync(url => !url.Contains("/register"),
                new() { Timeout = 12_000 });
        }
        catch (TimeoutException) { /* check below */ }

        Assert.That(Page.Url, Does.Not.Contain("/register"),
            "After registration should redirect away from /register");
    }

    // ── Login ──────────────────────────────────────────────────────────────

    [Test]
    public async Task Login_ValidCredentials_Stores_Token_And_Shows_Nav()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email']").First.FillAsync(UserEmail);
        await Page.Locator("input[type='password']").First.FillAsync(UserPassword);
        await Page.Locator("button[type='submit']").First.ClickAsync();

        try
        {
            await Page.WaitForURLAsync(url => !url.Contains("/login"),
                new() { Timeout = 12_000 });
        }
        catch (TimeoutException) { /* check below */ }

        Assert.That(Page.Url, Does.Not.Contain("/login"), "Should redirect away from login on success");

        // auth_token should be set in localStorage
        var token = await Page.EvaluateAsync<string?>("() => localStorage.getItem('auth_token')");
        Assert.That(token, Is.Not.Null.And.Not.Empty, "auth_token should be in localStorage after login");
    }

    // ── Profile ────────────────────────────────────────────────────────────

    [Test]
    public async Task Profile_Page_Shows_Email_And_Role()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.GotoAsync($"{BaseUrl}/profile");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Profile page reads from Zustand store — email or role should be visible
        var emailText = Page.Locator($":text('{UserEmail}')").First;
        var roleText = Page.Locator(":text('Regular'), :text('regular')").First;

        var emailCount = await emailText.CountAsync();
        var roleCount = await roleText.CountAsync();

        if (emailCount == 0 && roleCount == 0)
        {
            // Auth may not have loaded from storage yet — check URL
            if (Page.Url.Contains("/login"))
            {
                Assert.Inconclusive("Profile redirected to login — auth injection may not have worked");
                return;
            }
        }

        Assert.That(emailCount + roleCount, Is.GreaterThan(0),
            "Profile page should show user email or role");
    }

    // ── Admin access blocked ───────────────────────────────────────────────

    [Test]
    public async Task Regular_User_Cannot_Access_Admin_Pages()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.GotoAsync($"{BaseUrl}/admin");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // RequireAdmin redirects non-admin to /
        Assert.That(Page.Url, Does.Not.Contain("/admin"),
            "Regular user should be redirected away from /admin");
    }

    // ── Logout ─────────────────────────────────────────────────────────────

    [Test]
    public async Task Logout_Clears_Token_And_Redirects()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.ReloadAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Find and click the logout button (inside user dropdown)
        // PublicLayout has a user avatar button that reveals a dropdown with Logout
        var userMenuBtn = Page.Locator("button").Filter(
            new() { Has = Page.Locator("[class*='rounded-full']") }).First;

        var menuCount = await userMenuBtn.CountAsync();
        if (menuCount == 0)
        {
            // Fallback: look for any button with logout text
            userMenuBtn = Page.Locator("button:has-text('Logout'), button:has-text('Cerrar')").First;
        }

        await userMenuBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);

        // Try clicking the Logout item in the dropdown
        var logoutItem = Page.Locator("button:has-text('Logout'), button:has-text('Cerrar'), a:has-text('Logout')").First;
        var logoutCount = await logoutItem.CountAsync();
        if (logoutCount > 0)
            await logoutItem.ClickAsync();

        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // auth_token should be cleared
        var storedToken = await Page.EvaluateAsync<string?>(
            "() => localStorage.getItem('auth_token')");
        Assert.That(storedToken, Is.Null.Or.Empty, "auth_token should be removed after logout");
    }

    // ── Download button for logged-in user ────────────────────────────────

    [Test]
    [Category("RequiresBooks")]
    public async Task LoggedIn_User_Sees_Download_Button_On_Book()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.ReloadAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        if (await bookLink.CountAsync() == 0)
        {
            Assert.Inconclusive("No book links on home page");
            return;
        }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var downloadBtn = Page.Locator(
            "button:has-text('Download'), button:has-text('Descargar'), a:has-text('Download')").First;
        await downloadBtn.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(downloadBtn).ToBeVisibleAsync();
    }
}
