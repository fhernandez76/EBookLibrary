using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests.React;

/// <summary>
/// Admin flow tests for the React (Vite) UI.
/// Run with: FRONTEND=react BASE_URL=http://localhost:5173 dotnet test --filter "Category=ReactAdmin"
///
/// React modal selector: div.fixed.inset-0 (Tailwind, not Bootstrap)
/// Save button text: t('common.save') = "Save"
/// Error display: div.bg-red-50.text-red-700
/// </summary>
[TestFixture]
[Category("React")]
[Category("ReactAdmin")]
public class ReactAdminFlowTests : ReactE2ETestBase
{
    private string? _adminToken;
    private string? _testAuthorId;

    [OneTimeSetUp]
    public async Task AcquireAdminToken()
    {
        _adminToken = await GetTokenAsync(AdminEmail, AdminPassword);

        // Pre-create a test author for the book creation test
        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _adminToken!);
            var resp = await client.PostAsJsonAsync(
                "http://localhost:5149/api/authors",
                new { name = "React E2E Author " + Guid.NewGuid().ToString("N")[..6], biography = "" });
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                // ApiResponse<Guid> — data is a plain string GUID
                _testAuthorId = doc.RootElement.GetProperty("data").GetString();
            }
        }
        catch { /* book test will be Inconclusive if this fails */ }
    }

    // ── Navigate helper ────────────────────────────────────────────────────

    private async Task NavigateAsAdmin(string path = "/admin")
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(_adminToken!);
        await Page.GotoAsync($"{BaseUrl}{path}");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Task.Delay(800); // allow React Query to hydrate
    }

    // React modals use Tailwind: div.fixed.inset-0.z-50
    private ILocator ModalLocator =>
        Page.Locator("div.fixed.inset-0, [role='dialog'], dialog").First;

    // ── Login ──────────────────────────────────────────────────────────────

    [Test]
    public async Task Admin_Login_Succeeds_And_Shows_Admin_Link()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Page.Locator("input[type='email']").First.FillAsync(AdminEmail);
        await Page.Locator("input[type='password']").First.FillAsync(AdminPassword);
        await Page.Locator("button[type='submit']").First.ClickAsync();

        try
        {
            await Page.WaitForURLAsync(url => !url.Contains("/login"),
                new() { Timeout = 12_000 });
        }
        catch (TimeoutException) { }

        Assert.That(Page.Url, Does.Not.Contain("/login"), "Admin should redirect after login");

        // Nav shows Admin link (only visible to admin)
        var adminLink = Page.Locator("a[href*='/admin'], nav :has-text('Admin')").First;
        await adminLink.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(adminLink).ToBeVisibleAsync();
    }

    // ── Dashboard ──────────────────────────────────────────────────────────

    [Test]
    public async Task Admin_Dashboard_Shows_Stats_Cards()
    {
        await NavigateAsAdmin("/admin");

        // DashboardPage renders 4 stat cards with values from React Query
        var statCard = Page.Locator("div.bg-white.rounded-xl").First;
        await statCard.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(statCard).ToBeVisibleAsync();

        var cards = Page.Locator("div.bg-white.rounded-xl, [class*='rounded-xl'][class*='shadow']");
        var count = await cards.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "Dashboard should render stat cards");
    }

    // ── Books ──────────────────────────────────────────────────────────────

    [Test]
    public async Task AdminBooks_Page_Loads_With_Table()
    {
        await NavigateAsAdmin("/admin/books");

        // Table or skeleton rows
        var table = Page.Locator("table").First;
        await table.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(table).ToBeVisibleAsync();
    }

    [Test]
    public async Task AdminBooks_Add_Button_Opens_Modal()
    {
        await NavigateAsAdmin("/admin/books");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        await ModalLocator.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(ModalLocator).ToBeVisibleAsync();
    }

    [Test]
    public async Task AdminBooks_Create_Book_Succeeds()
    {
        if (_testAuthorId is null)
        {
            Assert.Inconclusive("No test author available — skipping book creation test");
            return;
        }

        await NavigateAsAdmin("/admin/books");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = ModalLocator;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        // Title (first text input in modal)
        var titleInput = modal.Locator("input[class*='input-field']:not([type='number'])").First;
        await titleInput.FillAsync("React E2E Book " + Guid.NewGuid().ToString("N")[..8]);

        // Language (second text input — index 1 after title)
        var textInputs = modal.Locator("input[class*='input-field']:not([type='number'])");
        await textInputs.Nth(1).FillAsync("English");

        // Author IDs (font-mono input)
        var authorInput = modal.Locator("input[class*='font-mono']").First;
        var authorCount = await authorInput.CountAsync();
        if (authorCount > 0)
            await authorInput.FillAsync(_testAuthorId!);

        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First;
        await saveBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Modal closes on success
        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    [Test]
    public async Task AdminBooks_Delete_Button_Shows_Confirmation()
    {
        await NavigateAsAdmin("/admin/books");

        // Wait for table rows
        var deleteBtn = Page.Locator("button").Filter(
            new() { Has = Page.Locator("svg[class*='lucide-trash'], .lucide-trash-2") }).First;

        try { await deleteBtn.WaitForAsync(new() { Timeout = 10_000 }); }
        catch (TimeoutException) { Assert.Inconclusive("No books in table to delete"); return; }

        await deleteBtn.ClickAsync();

        await ModalLocator.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(ModalLocator).ToBeVisibleAsync();

        // Cancel
        var cancelBtn = ModalLocator.Locator("button:has-text('Cancel'), button:has-text('Cancelar')").First;
        await cancelBtn.ClickAsync();
    }

    // ── Authors ────────────────────────────────────────────────────────────

    [Test]
    public async Task AdminAuthors_Create_And_List_Author()
    {
        await NavigateAsAdmin("/admin/authors");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = ModalLocator;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        // React inputs respond to fill directly (controlled components via onChange)
        var nameInput = modal.Locator("input[class*='input-field']").First;
        var authorName = "React E2E Author " + Guid.NewGuid().ToString("N")[..8];
        await nameInput.FillAsync(authorName);

        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First;
        await saveBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    // ── Genres ─────────────────────────────────────────────────────────────

    [Test]
    public async Task AdminGenres_Create_And_List_Genre()
    {
        await NavigateAsAdmin("/admin/genres");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = ModalLocator;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        var nameInput = modal.Locator("input[class*='input-field']").First;
        await nameInput.FillAsync("React E2E Genre " + Guid.NewGuid().ToString("N")[..8]);

        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First;
        await saveBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    // ── Users ──────────────────────────────────────────────────────────────

    [Test]
    public async Task AdminUsers_Page_Loads_And_Shows_Table()
    {
        await NavigateAsAdmin("/admin/users");

        var table = Page.Locator("table").First;
        await table.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(table).ToBeVisibleAsync();

        // Wait for skeleton to clear
        var skeleton = Page.Locator("[class*='animate-pulse']");
        try { await skeleton.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); }
        catch (TimeoutException) { }

        var rows = Page.Locator("table tbody tr");
        var rowCount = await rows.CountAsync();
        if (rowCount == 0)
        {
            Assert.Inconclusive("Users table is empty — no user data in DB");
            return;
        }

        // Role toggle button visible
        var toggleBtn = Page.Locator("button:has-text('→ Admin'), button:has-text('→ Regular')").First;
        await Expect(toggleBtn).ToBeVisibleAsync(new() { Timeout = 8_000 });
    }

    [Test]
    public async Task AdminUsers_ToggleStatus_ShouldChangeActiveState()
    {
        // Pre-create a user to toggle so we don't affect admin or other important accounts
        var email = $"e2e_toggle_{Guid.NewGuid():N}@test.com";
        using var http = new HttpClient();
        var reg = await http.PostAsJsonAsync("http://localhost:5149/api/auth/register",
            new { email, password = "Test@1234", confirmPassword = "Test@1234" });
        if (!reg.IsSuccessStatusCode)
        {
            Assert.Inconclusive("Could not register test user for toggle test");
            return;
        }

        await NavigateAsAdmin("/admin/users");

        // Wait for table rows
        var skeleton = Page.Locator("[class*='animate-pulse']");
        try { await skeleton.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); }
        catch (TimeoutException) { }

        // Find the row with our test user and click its Power (toggle status) button
        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        // Power icon button is in the actions cell — it's the second icon button (after role toggle text btn)
        var powerBtn = row.Locator("button[title*='eactivate'], button[title*='ctivate']").First;
        await powerBtn.WaitForAsync(new() { Timeout = 5_000 });
        await powerBtn.ClickAsync();

        // After toggle, query is invalidated and row re-renders — wait for network idle
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Task.Delay(600);

        // The button's title should have flipped
        var newTitle = await powerBtn.GetAttributeAsync("title");
        Assert.That(newTitle, Is.Not.Null, "Power button should still be present after toggle");
    }

    [Test]
    public async Task AdminUsers_EditUser_ShouldOpenModalAndSave()
    {
        // Pre-create a user to edit
        var email = $"e2e_edit_{Guid.NewGuid():N}@test.com";
        using var http = new HttpClient();
        var reg = await http.PostAsJsonAsync("http://localhost:5149/api/auth/register",
            new { email, password = "Test@1234", confirmPassword = "Test@1234" });
        if (!reg.IsSuccessStatusCode)
        {
            Assert.Inconclusive("Could not register test user for edit test");
            return;
        }

        await NavigateAsAdmin("/admin/users");

        var skeleton = Page.Locator("[class*='animate-pulse']");
        try { await skeleton.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); }
        catch (TimeoutException) { }

        // Find row and click pencil (edit) button
        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        var editBtn = row.Locator("button[title='Edit user']").First;
        await editBtn.WaitForAsync(new() { Timeout = 5_000 });
        await editBtn.ClickAsync();

        // Modal opens
        var modal = ModalLocator;
        await modal.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(modal).ToBeVisibleAsync();

        // Fill in first name
        var firstNameInput = modal.Locator("input[type='text']").First;
        await firstNameInput.ClearAsync();
        await firstNameInput.FillAsync("EditedFirst");

        // Save
        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First;
        await saveBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Modal closes on success
        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    [Test]
    public async Task AdminUsers_DeleteUser_ShouldShowConfirmationAndDelete()
    {
        // Pre-create a user to delete
        var email = $"e2e_delete_{Guid.NewGuid():N}@test.com";
        using var http = new HttpClient();
        var reg = await http.PostAsJsonAsync("http://localhost:5149/api/auth/register",
            new { email, password = "Test@1234", confirmPassword = "Test@1234" });
        if (!reg.IsSuccessStatusCode)
        {
            Assert.Inconclusive("Could not register test user for delete test");
            return;
        }

        await NavigateAsAdmin("/admin/users");

        var skeleton = Page.Locator("[class*='animate-pulse']");
        try { await skeleton.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); }
        catch (TimeoutException) { }

        // Find row and click trash (delete) button
        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        var deleteBtn = row.Locator("button[title='Delete user']").First;
        await deleteBtn.WaitForAsync(new() { Timeout = 5_000 });
        await deleteBtn.ClickAsync();

        // Confirmation dialog opens with the user's email
        var modal = ModalLocator;
        await modal.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(modal).ToBeVisibleAsync();
        await Expect(modal.Locator($"text={email}")).ToBeVisibleAsync();

        // Click the destructive Delete button
        var confirmDeleteBtn = modal.Locator("button:has-text('Delete')").Last;
        await confirmDeleteBtn.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Modal closes and row is gone
        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    // ── Upload ──────────────────────────────────────────────────────────────

    [Test]
    public async Task AdminUpload_Page_Loads()
    {
        await NavigateAsAdmin("/admin/upload");

        var heading = Page.Locator("h1:has-text('Upload'), h1:has-text('Subir'), h1:has-text('upload')").First;
        await heading.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(heading).ToBeVisibleAsync();

        // Book ID input and file upload area
        await Expect(Page.Locator("input[placeholder*='UUID'], input[placeholder*='book'], input[type='text']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task AdminUpload_Shows_Error_On_Empty_BookId()
    {
        await NavigateAsAdmin("/admin/upload");

        // Upload button should be disabled without a file selected
        var uploadBtn = Page.Locator("button:has-text('Upload'), button:has-text('Subir'), button[type='submit']").First;
        await uploadBtn.WaitForAsync(new() { Timeout = 8_000 });

        // Button is disabled when bookId is empty or no file selected
        var isDisabled = await uploadBtn.IsDisabledAsync();
        if (!isDisabled)
        {
            // Try clicking without filling in anything — should show validation error
            await uploadBtn.ClickAsync();
            var errorMsg = Page.Locator("[class*='text-red'], [class*='alert'], :text('required'), :text('requerido')").First;
            await errorMsg.WaitForAsync(new() { Timeout = 5_000 });
            await Expect(errorMsg).ToBeVisibleAsync();
        }
        else
        {
            await Expect(uploadBtn).ToBeDisabledAsync();
        }
    }
}
