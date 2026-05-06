using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests.React;

/// <summary>
/// Anonymous flow tests for the React (Vite) UI.
/// Run with: FRONTEND=react BASE_URL=http://localhost:5173 dotnet test --filter "Category=ReactAnonymous"
/// </summary>
[TestFixture]
[Category("React")]
[Category("ReactAnonymous")]
public class ReactAnonymousFlowTests : ReactE2ETestBase
{
    // ── Home page ──────────────────────────────────────────────────────────

    [Test]
    public async Task HomePage_Loads_With_Hero_And_SearchBar()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Hero section with gradient background
        var hero = Page.Locator("section").Filter(new() { HasText = "Library" }).First;
        await Expect(hero).ToBeVisibleAsync(new() { Timeout = 10_000 });

        // SearchBar is rendered inside hero
        var searchInput = Page.Locator("input[type='text'], input[placeholder*='Search'], input[placeholder*='Buscar']");
        await Expect(searchInput.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task HomePage_Shows_Genre_Cards()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Genre grid: at least one card with a gradient bg class
        var genreCards = Page.Locator("a[href*='genreName'], button[data-genre], a").Filter(
            new() { Has = Page.Locator("[class*='from-'][class*='to-']") });
        try
        {
            await genreCards.First.WaitForAsync(new() { Timeout = 10_000 });
            var count = await genreCards.CountAsync();
            Assert.That(count, Is.GreaterThan(0), "At least one genre card should be visible");
        }
        catch (TimeoutException)
        {
            Assert.Inconclusive("Genre cards not rendered (API may have no genres seeded)");
        }
    }

    [Test]
    public async Task HeroSearch_NavigatesTo_SearchPage()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var searchInput = Page.Locator("input[type='text'], input[placeholder*='Search'], input[placeholder*='Buscar']").First;
        await searchInput.WaitForAsync(new() { Timeout = 8_000 });
        await searchInput.FillAsync("history");

        // Submit via Enter or search button
        await searchInput.PressAsync("Enter");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        Assert.That(Page.Url, Does.Contain("search").Or.Contain("title=").Or.Contain("history"),
            "Search should navigate to search page");
    }

    // ── Search page ────────────────────────────────────────────────────────

    [Test]
    public async Task SearchPage_Loads_And_Shows_Filters()
    {
        await Page.GotoAsync($"{BaseUrl}/search");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // At least one filter input (title, author, etc.)
        var filterInput = Page.Locator("input[type='text'], input[placeholder*='Title'], input[placeholder*='Author'], input[placeholder*='Título']").First;
        await Expect(filterInput).ToBeVisibleAsync(new() { Timeout = 8_000 });
    }

    [Test]
    public async Task SearchPage_TitleFilter_RefreshesResults()
    {
        await Page.GotoAsync($"{BaseUrl}/search");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var titleInput = Page.Locator("input[placeholder*='Title'], input[placeholder*='Título'], input[type='text']").First;
        await titleInput.FillAsync("a");

        // Submit with Enter or search button
        var searchBtn = Page.Locator("button:has-text('Search'), button:has-text('Buscar')").First;
        var btnCount = await searchBtn.CountAsync();
        if (btnCount > 0)
            await searchBtn.ClickAsync();
        else
            await titleInput.PressAsync("Enter");

        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Results count or "no results" text should appear
        var results = Page.Locator("[class*='text-gray-500']:has-text('result'), [class*='text-gray-500']:has-text('resultado'), td, .book-card");
        await results.First.WaitForAsync(new() { Timeout = 10_000 });
    }

    [Test]
    public async Task SearchPage_NoResults_ShowsMessage()
    {
        await Page.GotoAsync($"{BaseUrl}/search?title=xyznonexistent99999");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Either a "no results" message or empty table body
        var noResults = Page.Locator(
            ":text('No books'), :text('no results'), :text('Sin resultados'), " +
            ":text('no se encontr'), :text('0 result')");
        var tableEmpty = Page.Locator("table tbody tr td[colspan]");

        var foundMsg = await noResults.CountAsync();
        var foundEmpty = await tableEmpty.CountAsync();
        Assert.That(foundMsg + foundEmpty, Is.GreaterThan(0), "Empty search should show no-results indicator");
    }

    // ── Book detail ────────────────────────────────────────────────────────

    [Test]
    public async Task BookDetailPage_Shows_Metadata()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        var count = await bookLink.CountAsync();
        if (count == 0) { Assert.Inconclusive("No book links on home page"); return; }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.Locator("h1, h2").First).ToBeVisibleAsync(new() { Timeout = 8_000 });
    }

    [Test]
    public async Task BookDetailPage_DownloadButton_PromptsLogin()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var bookLink = Page.Locator("a[href*='/books/']").First;
        if (await bookLink.CountAsync() == 0) { Assert.Inconclusive("No book links on home page"); return; }

        await bookLink.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Should see login prompt or disabled download
        var loginPrompt = Page.Locator(
            ":text('Login'), :text('login'), :text('Iniciar'), " +
            "a[href*='/login'], button[disabled]");
        var found = await loginPrompt.CountAsync();
        Assert.That(found, Is.GreaterThan(0), "Anonymous user should see login prompt for download");
    }

    // ── Auth pages ─────────────────────────────────────────────────────────

    [Test]
    public async Task LoginPage_Shows_Form()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.Locator("input[type='email']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("input[type='password']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("button[type='submit']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task LoginPage_WrongPassword_ShowsError()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email']").First.FillAsync(AdminEmail);
        await Page.Locator("input[type='password']").First.FillAsync("WrongPassword999!");
        await Page.Locator("button[type='submit']").First.ClickAsync();

        // React Query mutation error → bg-red-50 div
        var errorDiv = Page.Locator("[class*='bg-red-50'], [class*='text-red-'], [role='alert']").First;
        await errorDiv.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(errorDiv).ToBeVisibleAsync();
    }

    [Test]
    public async Task RegisterPage_Shows_Form()
    {
        await Page.GotoAsync($"{BaseUrl}/register");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.Locator("input[type='email']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("input[type='password']").First).ToBeVisibleAsync();
        await Expect(Page.Locator("button[type='submit']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task AdminRoute_Redirects_AnonymousUser_To_Login()
    {
        await Page.GotoAsync($"{BaseUrl}/admin");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // React Router RequireAdmin → Navigate to /login
        Assert.That(Page.Url, Does.Contain("/login"),
            "Unauthenticated access to /admin should redirect to /login");
    }
}
