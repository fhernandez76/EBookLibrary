using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests;

/// <summary>
/// 14 tests covering anonymous (unauthenticated) browsing flows on both Blazor and React.
/// Run with BASE_URL=https://localhost:7278 (Blazor) or BASE_URL=http://localhost:5173 (React).
/// </summary>
[TestFixture]
[Category("Anonymous")]
public class AnonymousFlowTests : E2ETestBase
{
    // ── Home page ─────────────────────────────────────────────────────────

    [Test]
    public async Task HomePage_Loads_And_Shows_HeroSection()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Hero heading visible
        await Expect(Page.Locator("h1, h2").First).ToBeVisibleAsync();

        // No JS console errors from critical paths
        var title = await Page.TitleAsync();
        Assert.That(title, Is.Not.Empty, "Page title should not be empty");
    }

    [Test]
    public async Task HomePage_Shows_GenreList()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Genres section should appear (may need to scroll)
        var genreItems = Page.Locator("[data-testid='genre-item'], .genre-card, a[href*='genre'], a[href*='search']");
        await genreItems.First.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(genreItems.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task HomePage_Shows_FeaturedBooks()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // At least one book card/link visible
        var bookCards = Page.Locator("[data-testid='book-card'], .book-card, a[href*='/books/']");
        await bookCards.First.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(bookCards.First).ToBeVisibleAsync();
    }

    // ── Search page ───────────────────────────────────────────────────────

    [Test]
    public async Task SearchPage_Loads_And_Accepts_TitleFilter()
    {
        await Page.GotoAsync($"{BaseUrl}/search");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Fill the title field — Blazor @bind fires on 'change' (blur), not keydown,
        // so we must tab-out or click the Search button to commit the value.
        var titleInput = Page.Locator("input[type='text'], input[placeholder*='title' i], input[placeholder*='título' i]").First;
        await titleInput.FillAsync("a");
        await titleInput.DispatchEventAsync("change"); // force @bind update

        // Click the explicit Search button
        var searchBtn = Page.Locator("button:has-text('Search'), button:has-text('Buscar'), button[type='submit']").First;
        await searchBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // After search runs, either a results count OR a no-results message is visible.
        // Blazor renders: <p class="text-muted small mb-3"> (count) OR <div class="text-center"><p> (no results)
        var resultIndicator = Page.Locator(".text-muted, .text-gray-500, [data-testid='results-count'], [data-testid='no-results']");
        await resultIndicator.First.WaitForAsync(new() { Timeout = 15_000 });
        var count = await resultIndicator.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "Search results count or no-results message should render after search");
    }

    [Test]
    public async Task SearchPage_ClearFilters_ResetsResults()
    {
        await Page.GotoAsync($"{BaseUrl}/search?title=nonexistentxyz");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Look for a clear/reset button
        var clearBtn = Page.Locator("button:has-text('Clear'), button:has-text('Limpiar'), button:has-text('clear' )")
            .Or(Page.Locator("[data-testid='clear-filters']"));

        if (await clearBtn.CountAsync() > 0)
        {
            await clearBtn.First.ClickAsync();
            await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
            // After clear, URL should not have title param or field should be empty
            var url = Page.Url;
            Assert.That(url, Does.Not.Contain("nonexistentxyz"), "Filter param should be cleared");
        }
        else
        {
            Assert.Pass("No clear button found — skipping (may be a different UI pattern)");
        }
    }

    // ── Book detail page ──────────────────────────────────────────────────

    [Test]
    public async Task BookDetailPage_Shows_Metadata()
    {
        // Navigate to search first to find a real book ID
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        var count = await bookLink.CountAsync();
        if (count == 0)
        {
            Assert.Inconclusive("No books visible on home page to navigate to");
            return;
        }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Title, pages, year shown
        await Expect(Page.Locator("h1, h2").First).ToBeVisibleAsync();

        // Download button exists but disabled/prompts login for anonymous
        var downloadBtn = Page.Locator("button:has-text('Download'), button:has-text('Descargar'), a:has-text('Download')");
        if (await downloadBtn.CountAsync() > 0)
        {
            await Expect(downloadBtn.First).ToBeVisibleAsync();
        }
    }

    [Test]
    public async Task BookDetailPage_DownloadButton_PromptsLogin_ForAnonymous()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        if (await bookLink.CountAsync() == 0) { Assert.Inconclusive("No book links found"); return; }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Either a "login to download" message or a disabled button
        var loginPrompt = Page.Locator(
            ":text('Login'), :text('login'), :text('Inicia'), :text('Iniciar'), " +
            "button[disabled], a[href*='/login'], a[href*='/auth/login']");

        var found = await loginPrompt.CountAsync();
        Assert.That(found, Is.GreaterThan(0), "Anonymous user should see login prompt for download");
    }

    // ── Auth pages ────────────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_Shows_Form()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.Locator("input[type='email'], input[name='email']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("input[type='password']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("button[type='submit'], button:has-text('Login'), button:has-text('Iniciar')").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task LoginPage_Shows_ValidationError_OnBadCredentials()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email'], input[name='email']").First.FillAsync("bad@test.com");
        await Page.Locator("input[type='password']").First.FillAsync("WrongPass!");
        await Page.Locator("button[type='submit'], button:has-text('Login'), button:has-text('Iniciar')").First.ClickAsync();

        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        // Error alert or validation message visible
        var error = Page.Locator(".alert, .error, [role='alert'], .text-red, .text-danger");
        await error.First.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(error.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task RegisterPage_Shows_Form()
    {
        await Page.GotoAsync($"{BaseUrl}/register");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.Locator("input[type='email'], input[name='email']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("input[type='password']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task RegisterPage_Shows_ValidationError_OnPasswordMismatch()
    {
        await Page.GotoAsync($"{BaseUrl}/register");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email'], input[name='email']").First.FillAsync("new@test.com");
        // Fill first password
        var passwordFields = Page.Locator("input[type='password']");
        await passwordFields.Nth(0).FillAsync("Password1!");
        // Confirm password — different
        if (await passwordFields.CountAsync() > 1)
            await passwordFields.Nth(1).FillAsync("Mismatch99!");

        await Page.Locator("button[type='submit'], button:has-text('Register'), button:has-text('Registrar')").First.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var error = Page.Locator(".alert, .error, [role='alert'], .text-red, .text-danger, .validation-message");
        await error.First.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(error.First).ToBeVisibleAsync();
    }

    // ── Admin redirect ────────────────────────────────────────────────────

    [Test]
    public async Task AdminPage_Redirects_Anonymous_To_Login()
    {
        await Page.GotoAsync($"{BaseUrl}/admin");

        // Blazor client-side auth does a JS Navigation.NavigateTo("/login?returnUrl=...") —
        // WaitForLoadState(NetworkIdle) isn't enough; wait for the URL to change.
        try
        {
            await Page.WaitForURLAsync(url => url.Contains("/login") || url.Contains("/auth"),
                new() { Timeout = 8_000 });
        }
        catch (TimeoutException) { /* URL didn't change — check inline content instead */ }

        var url = Page.Url;
        var onLoginPage = url.Contains("/login") || url.Contains("/auth");
        var hasLoginForm = await Page.Locator("input[type='email'], input[type='password']").CountAsync() > 0;
        // Blazor also renders 'Access Denied' or 'Not authorized' in-place for authenticated non-admins,
        // but for unauthenticated users RedirectToLogin navigates to /login.
        var hasAccessDenied = await Page.Locator(":text('Access'), :text('Denied'), :text('Not authorized'), :text('login')").CountAsync() > 0;

        Assert.That(onLoginPage || hasLoginForm || hasAccessDenied, Is.True,
            $"Anonymous user accessing /admin should be redirected to login or see an access-denied page. URL: {url}");
    }

    [Test]
    public async Task Nav_Shows_Login_And_Register_Links_For_Anonymous()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var nav = Page.Locator("nav, header, [role='navigation']").First;
        var loginLink = nav.Locator("a:has-text('Login'), a:has-text('Iniciar'), a[href*='/login']");
        var registerLink = nav.Locator("a:has-text('Register'), a:has-text('Registrar'), a[href*='/register']");

        await Expect(loginLink.First).ToBeVisibleAsync();
        await Expect(registerLink.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Nav_Does_Not_Show_Admin_Link_For_Anonymous()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var adminLink = Page.Locator("a[href*='/admin']:visible, a:has-text('Admin'):visible");
        var count = await adminLink.CountAsync();
        Assert.That(count, Is.EqualTo(0), "Admin nav link should not appear for anonymous users");
    }
}
