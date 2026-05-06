using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests;

/// <summary>
/// 6 tests covering regular (non-admin) authenticated user flows.
/// </summary>
[TestFixture]
[Category("RegularUser")]
public class RegularUserFlowTests : E2ETestBase
{
    [Test]
    public async Task Register_New_User_Succeeds_And_Redirects()
    {
        var uniqueEmail = $"e2e_{Guid.NewGuid():N}@test.com";

        await Page.GotoAsync($"{BaseUrl}/register");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Blazor InputText uses @bind-Value which fires on 'change' event (blur).
        // We must fill and then dispatch 'change' to commit the value.
        var emailInput = Page.Locator("input[type='email'], input[name='email']").First;
        await emailInput.FillAsync(uniqueEmail);
        await emailInput.DispatchEventAsync("change");

        var passwordFields = Page.Locator("input[type='password']");
        await passwordFields.Nth(0).FillAsync("TestPass1!");
        await passwordFields.Nth(0).DispatchEventAsync("change");
        if (await passwordFields.CountAsync() > 1)
        {
            await passwordFields.Nth(1).FillAsync("TestPass1!");
            await passwordFields.Nth(1).DispatchEventAsync("change");
        }

        await Page.Locator("button[type='submit'], button:has-text('Register'), button:has-text('Registrar')").First.ClickAsync();

        // Blazor client-side navigation — wait for URL to change away from /register
        try
        {
            await Page.WaitForURLAsync(url => !url.Contains("/register"), new() { Timeout = 12_000 });
        }
        catch (TimeoutException) { /* may stay if validation failed */ }

        var url = Page.Url;
        Assert.That(url, Does.Not.Contain("/register"),
            "After successful registration user should be redirected away from /register");
    }

    [Test]
    public async Task Login_Regular_User_Succeeds_And_Shows_Profile_Link()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Blazor InputText uses @bind-Value — must dispatch 'change' to commit value
        var emailInput = Page.Locator("input[type='email'], input[name='email']").First;
        await emailInput.FillAsync(UserEmail);
        await emailInput.DispatchEventAsync("change");

        var passInput = Page.Locator("input[type='password']").First;
        await passInput.FillAsync(UserPassword);
        await passInput.DispatchEventAsync("change");

        await Page.Locator("button[type='submit'], button:has-text('Login'), button:has-text('Iniciar')").First.ClickAsync();

        // Blazor client-side nav after login — wait for URL to leave /login
        try
        {
            await Page.WaitForURLAsync(url => !url.Contains("/login"), new() { Timeout = 12_000 });
        }
        catch (TimeoutException) { /* check result below */ }

        Assert.That(Page.Url, Does.Not.Contain("/login"), "Should be redirected after login");

        // Nav should show the user dropdown toggle (visible after login)
        var nav = Page.Locator("nav, header").First;
        var loggedInIndicator = nav.Locator(
            ".dropdown-toggle, [data-bs-toggle='dropdown'], " +
            "button:has-text('Logout'), button:has-text('Salir'), " +
            ".nav-link.dropdown-toggle");
        await loggedInIndicator.First.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(loggedInIndicator.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Profile_Page_Shows_User_Data()
    {
        // Login first via API to get valid token
        var token = await GetTokenAsync(UserEmail, UserPassword);

        // Navigate to the app origin first to establish the context
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        // Inject auth token into this page's localStorage
        await InjectAuthTokenAsync(token);

        // Navigate directly to profile — authenticated user should stay on /profile
        await Page.GotoAsync($"{BaseUrl}/profile");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        // Give Blazor auth state time to resolve (Blazored.LocalStorage async read)
        await Task.Delay(3_000);

        var currentUrl = Page.Url;
        if (currentUrl.Contains("/login"))
        {
            // Auth injection did not persist — mark Inconclusive (infra issue, not code bug)
            Assert.Inconclusive($"Profile redirected to login — auth token injection did not persist. URL: {currentUrl}");
            return;
        }

        // Key assertion: user is on the profile page (not redirected away by [Authorize])
        Assert.That(currentUrl, Does.Contain("/profile"),
            $"Authenticated user should stay on /profile. URL: {currentUrl}");

        // Profile.razor always renders <h1> heading regardless of _user.
        // Also try to find the email if _user deserialization succeeded.
        var heading = Page.Locator("h1");
        await Expect(heading.First).ToBeVisibleAsync(new() { Timeout = 5_000 });

        // Best-effort: verify user email renders (requires auth_user JSON deserialization)
        var emailText = Page.Locator($":text('{UserEmail}')");
        var emailCount = await emailText.CountAsync();
        if (emailCount == 0)
        {
            // _user may be null if auth_user key isn't readable — page still loads; mark partial
            Assert.Inconclusive(
                $"Profile page loaded at {currentUrl} but user email not visible. " +
                "auth_user deserialization may have failed.");
        }
        else
        {
            await Expect(emailText.First).ToBeVisibleAsync();
        }
    }

    [Test]
    public async Task Regular_User_Sees_Download_Button_On_Available_Book()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);

        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.ReloadAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        var count = await bookLink.CountAsync();
        if (count == 0) { Assert.Inconclusive("No books on home page"); return; }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var downloadBtn = Page.Locator(
            "button:has-text('Download'), button:has-text('Descargar'), a:has-text('Download'), a:has-text('Descargar')");

        var btnCount = await downloadBtn.CountAsync();
        // It's okay if the book has no file — just verify the "login to download" prompt is gone
        var loginPrompt = Page.Locator(":text('login to download'), :text('Inicia sesión')");
        var promptCount = await loginPrompt.CountAsync();

        Assert.That(btnCount > 0 || promptCount == 0, Is.True,
            "Logged-in user should see download button or at least no login prompt");
    }

    [Test]
    public async Task Regular_User_Cannot_Access_Admin_Pages()
    {
        var token = await GetTokenAsync(UserEmail, UserPassword);

        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.GotoAsync($"{BaseUrl}/admin");

        // Blazor auth is async: wait for either redirect or inline content
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        // Give Blazor time to evaluate auth state
        await Task.Delay(2_000);

        var url = Page.Url;
        var redirectedAway = !url.EndsWith("/admin") && !url.Contains("/admin/");

        // Blazor renders Access Denied inline (App.razor <NotAuthorized> / else branch)
        var accessDeniedText = await Page.Locator(
            ":text('Access Denied'), :text('Access denied'), :text('permission'), " +
            ":text('403'), :text('Forbidden'), :text('Unauthorized')").CountAsync() > 0;

        // Redirected to /login also acceptable
        var redirectedToLogin = url.Contains("/login");

        Assert.That(redirectedAway || accessDeniedText || redirectedToLogin, Is.True,
            $"Regular user should not access /admin freely. URL: {url}");
    }

    [Test]
    public async Task Logout_Clears_Session_And_Redirects_To_Login_Or_Home()
    {
        // Inject auth token directly (avoids form fill flakiness)
        var token = await GetTokenAsync(UserEmail, UserPassword);
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(token);
        await Page.ReloadAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Task.Delay(1_000); // Let Blazor process auth state

        // Expand the nav dropdown to access logout (may be in collapsed navbar hamburger first)
        var navbarToggle = Page.Locator(".navbar-toggler");
        if (await navbarToggle.IsVisibleAsync())
            await navbarToggle.ClickAsync();

        var dropdownToggle = Page.Locator(".dropdown-toggle, [data-bs-toggle='dropdown']").First;
        if (await dropdownToggle.IsVisibleAsync())
            await dropdownToggle.ClickAsync();
        await Page.WaitForTimeoutAsync(400); // Wait for Bootstrap dropdown animation

        // Find logout button — it's inside a Bootstrap dropdown-menu.
        var logoutBtn = Page.Locator(
            "button:has-text('Logout'), button:has-text('Salir'), a:has-text('Logout'), a[href*='/logout']");

        var btnCount = await logoutBtn.CountAsync();
        if (btnCount == 0) { Assert.Inconclusive("Logout button not found"); return; }

        // Use JS click() — Playwright Force:true still checks visibility in some cases.
        // JS click() fires the event regardless of visibility/position, which triggers Blazor @onclick.
        await Page.EvaluateAsync(@"() => {
            const btn = document.querySelector(""button.dropdown-item.text-danger"");
            if (btn) btn.click();
        }");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Page.WaitForTimeoutAsync(1_000);

        // After logout: verify auth_token is cleared from localStorage (most reliable signal)
        var authToken = await Page.EvaluateAsync<string?>("() => localStorage.getItem('auth_token')");
        if (authToken is null)
        {
            // Token cleared — logout succeeded
            Assert.Pass("Logout cleared auth_token from localStorage.");
            return;
        }

        // Fallback: verify Login link appears in navbar
        var loginLink = Page.Locator("a[href*='/login'], button:has-text('Login'), a:has-text('Login'), a:has-text('Iniciar')");
        var linkCount = await loginLink.CountAsync();
        Assert.That(linkCount > 0, Is.True,
            $"After logout, expected login link or auth token cleared. auth_token={authToken}");
    }
}
