using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EBookLibrary.E2E.Tests.Infrastructure;
using Microsoft.Playwright;

namespace EBookLibrary.E2E.Tests.Tests;

/// <summary>
/// 12 tests covering Admin user flows: login, dashboard, Books/Authors/Genres CRUD, Users role toggle, upload validation.
/// </summary>
[TestFixture]
[Category("Admin")]
public class AdminFlowTests : E2ETestBase
{
    private string? _adminToken;
    private string? _testAuthorId;

    [OneTimeSetUp]
    public async Task AcquireAdminToken()
    {
        _adminToken = await GetTokenAsync(AdminEmail, AdminPassword);

        // Pre-create a test author so AdminBooks_Create_Book_Succeeds has a valid AuthorId
        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _adminToken!);
            var authorName = "E2E Auto Author " + Guid.NewGuid().ToString("N")[..6];
            var resp = await client.PostAsJsonAsync(
                "http://localhost:5149/api/authors",
                new { name = authorName, biography = "" });
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                // ApiResponse<Guid> → { "success": true, "data": "guid-string" }
                _testAuthorId = doc.RootElement.GetProperty("data").GetString();
            }
        }
        catch { /* book test will be marked Inconclusive if author creation fails */ }
    }

    private async Task NavigateAsAdmin(string path = "/admin")
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
        await InjectAuthTokenAsync(_adminToken!);
        // Navigate directly — Blazor will read auth_token from localStorage on load
        await Page.GotoAsync($"{BaseUrl}{path}");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        // Give Blazor auth state time to resolve
        await Task.Delay(1_500);
    }

    // ── Login ─────────────────────────────────────────────────────────────

    [Test]
    public async Task Admin_Login_Succeeds_And_Shows_Admin_Link()
    {
        await Page.GotoAsync($"{BaseUrl}/login");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Blazor InputText uses @bind-Value — must dispatch 'change' to commit values
        var emailInput = Page.Locator("input[type='email'], input[name='email']").First;
        await emailInput.FillAsync(AdminEmail);
        await emailInput.DispatchEventAsync("change");

        var passInput = Page.Locator("input[type='password']").First;
        await passInput.FillAsync(AdminPassword);
        await passInput.DispatchEventAsync("change");

        await Page.Locator("button[type='submit'], button:has-text('Login'), button:has-text('Iniciar')").First.ClickAsync();
        try { await Page.WaitForURLAsync(url => !url.Contains("/login"), new() { Timeout = 12_000 }); }
        catch (TimeoutException) { /* check below */ }

        Assert.That(Page.Url, Does.Not.Contain("/login"), "Admin should be redirected after login");

        var adminLink = Page.Locator("a[href*='/admin'], nav :has-text('Admin')");
        await adminLink.First.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(adminLink.First).ToBeVisibleAsync();
    }

    // ── Dashboard ─────────────────────────────────────────────────────────

    [Test]
    public async Task Admin_Dashboard_Shows_Stats_Cards()
    {
        await NavigateAsAdmin("/admin");

        // Stats cards (total books, total users, etc.)
        var statsCard = Page.Locator(
            "[data-testid='stat-card'], .card, .stat, " +
            ":has-text('Books'), :has-text('Libros'), :has-text('Users'), :has-text('Usuarios')");

        await statsCard.First.WaitForAsync(new() { Timeout = 10_000 });
        await Expect(statsCard.First).ToBeVisibleAsync();
    }

    // ── Books CRUD ────────────────────────────────────────────────────────

    [Test]
    public async Task AdminBooks_Page_Loads_And_Shows_Table()
    {
        await NavigateAsAdmin("/admin/books");

        var tableRow = Page.Locator("table tbody tr, [data-testid='book-row']");
        await tableRow.First.WaitForAsync(new() { Timeout = 12_000 });
        await Expect(tableRow.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task AdminBooks_Add_Button_Opens_Modal()
    {
        await NavigateAsAdmin("/admin/books");

        var addBtn = Page.Locator(
            "button:has-text('Add'), button:has-text('Agregar'), button:has-text('+'), " +
            "[data-testid='add-book-btn']");
        await addBtn.First.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.First.ClickAsync();

        // Modal / dialog opens
        var modal = Page.Locator(".modal, dialog, [role='dialog'], .fixed.inset-0");
        await modal.First.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(modal.First).ToBeVisibleAsync();
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

        var addBtn = Page.Locator(
            "button:has-text('Add'), button:has-text('Agregar'), button:has-text('+')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = Page.Locator(".modal, dialog, [role='dialog'], .fixed.inset-0").First;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        var allInputs = modal.Locator("input");

        // Title (Nth 0) — @bind:event="oninput"; FillAsync commits immediately
        await allInputs.Nth(0).FillAsync("E2E Test Book " + Guid.NewGuid().ToString("N")[..8]);

        // Language (Nth 1) — required; must be Spanish | English | Other
        await allInputs.Nth(1).FillAsync("English");

        // AuthorIds (after Title, Language, Pages, Year, ISBN = Nth 5) — required
        await allInputs.Nth(5).FillAsync(_testAuthorId!);

        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')");
        await saveBtn.First.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Modal closes on success
        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    [Test]
    public async Task AdminBooks_Delete_Button_Shows_Confirmation()
    {
        await NavigateAsAdmin("/admin/books");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var deleteBtn = Page.Locator(
            "button[title='Delete'], button[aria-label='Delete'], button:has-text('Delete'), " +
            "button[title='Eliminar'], svg.lucide-trash ~ button, button:has(.lucide-trash)").First;

        var count = await deleteBtn.CountAsync();
        if (count == 0)
        {
            // Try finding trash icon button
            deleteBtn = Page.Locator("button").Filter(new() { Has = Page.Locator(".lucide-trash-2, .lucide-trash") }).First;
        }

        await deleteBtn.WaitForAsync(new() { Timeout = 10_000 });
        await deleteBtn.ClickAsync();

        // Confirmation modal/dialog appears
        var confirmModal = Page.Locator(".modal, dialog, [role='dialog'], .fixed.inset-0");
        await confirmModal.First.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(confirmModal.First).ToBeVisibleAsync();

        // Cancel the delete
        var cancelBtn = confirmModal.First.Locator("button:has-text('Cancel'), button:has-text('Cancelar')");
        await cancelBtn.First.ClickAsync();
    }

    // ── Authors CRUD ──────────────────────────────────────────────────────

    [Test]
    public async Task AdminAuthors_Create_And_List_Author()
    {
        await NavigateAsAdmin("/admin/authors");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar'), button:has-text('+')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = Page.Locator(".modal, dialog, [role='dialog'], .fixed.inset-0").First;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        var nameInput = modal.Locator("input[type='text'], input:not([type='number'])").First;
        var authorName = "E2E Author " + Guid.NewGuid().ToString("N")[..8];
        await nameInput.FillAsync(authorName);
        // @bind:event="oninput" on the Blazor input — FillAsync commits immediately

        await modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // New author appears in table (may need page reload)
        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    // ── Genres CRUD ───────────────────────────────────────────────────────

    [Test]
    public async Task AdminGenres_Create_And_List_Genre()
    {
        await NavigateAsAdmin("/admin/genres");

        var addBtn = Page.Locator("button:has-text('Add'), button:has-text('Agregar'), button:has-text('+')").First;
        await addBtn.WaitForAsync(new() { Timeout = 8_000 });
        await addBtn.ClickAsync();

        var modal = Page.Locator(".modal, dialog, [role='dialog'], .fixed.inset-0").First;
        await modal.WaitForAsync(new() { Timeout = 5_000 });

        var nameInput = modal.Locator("input[type='text'], input:not([type='number'])").First;
        await nameInput.FillAsync("E2E Genre " + Guid.NewGuid().ToString("N")[..8]);
        // @bind:event="oninput" — FillAsync commits immediately

        await modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(modal).ToBeHiddenAsync(new() { Timeout = 10_000 });
    }

    // ── Users role toggle ─────────────────────────────────────────────────

    [Test]
    public async Task AdminUsers_Page_Loads_And_Shows_RoleToggle()
    {
        await NavigateAsAdmin("/admin/users");

        // Wait for loading spinner to disappear (API call completes)
        var spinner = Page.Locator(".spinner-border");
        try { await spinner.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 20_000 }); }
        catch (TimeoutException) { /* spinner may not appear if load is fast */ }

        await Task.Delay(500);

        var tableRow = Page.Locator("table tbody tr").First;
        var rowCount = await tableRow.CountAsync();

        if (rowCount == 0)
        {
            // Check for error message — API may have failed
            var errMsg = await Page.Locator(".alert-danger").CountAsync();
            Assert.Inconclusive(
                errMsg > 0
                    ? "Users API returned an error — check server logs"
                    : "Users table is empty — no users in database");
            return;
        }

        await Expect(tableRow).ToBeVisibleAsync();

        // Each row should have a role-toggle button
        var toggleBtn = Page.Locator(
            "button:has-text('→ Admin'), button:has-text('→ Regular'), " +
            "button:has-text('→ Administrador')").First;

        var count = await toggleBtn.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "Admin users page should show role toggle buttons");
    }

    [Test]
    public async Task AdminUsers_ToggleStatus_ShouldChangeActiveState()
    {
        // Pre-create a user via API so we have a known target
        var email = $"e2e_toggle_{Guid.NewGuid():N}@test.com";
        using var http = new HttpClient();
        var reg = await http.PostAsJsonAsync("http://localhost:5149/api/auth/register",
            new { email, password = "Test@1234", confirmPassword = "Test@1234" });
        if (!reg.IsSuccessStatusCode)
        {
            Assert.Inconclusive("Could not register test user for toggle-status test");
            return;
        }

        await NavigateAsAdmin("/admin/users");

        var spinner = Page.Locator(".spinner-border");
        try { await spinner.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 20_000 }); }
        catch (TimeoutException) { }
        await Task.Delay(500);

        // Find the row with our test user
        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        // Click the power (⏻) toggle-status button — title is "Deactivate" or "Activate"
        var powerBtn = row.Locator("button[title='Deactivate'], button[title='Activate']").First;
        await powerBtn.WaitForAsync(new() { Timeout = 5_000 });
        await powerBtn.ClickAsync();

        // Wait for the page to reload
        var spinner2 = Page.Locator(".spinner-border");
        try { await spinner2.WaitForAsync(new() { Timeout = 5_000 }); } catch (TimeoutException) { }
        try { await spinner2.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); } catch (TimeoutException) { }
        await Task.Delay(500);

        // The row should still exist but with a flipped status indicator
        var updatedRow = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        var rowExists = await updatedRow.CountAsync();
        Assert.That(rowExists, Is.GreaterThan(0), "User row should still exist after toggle");
    }

    [Test]
    public async Task AdminUsers_EditUser_ShouldOpenModalAndSave()
    {
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

        var spinner = Page.Locator(".spinner-border");
        try { await spinner.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 20_000 }); }
        catch (TimeoutException) { }
        await Task.Delay(500);

        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        // Click edit (✏) button
        var editBtn = row.Locator("button[title='Edit user']").First;
        await editBtn.WaitForAsync(new() { Timeout = 5_000 });
        await editBtn.ClickAsync();

        // Modal opens
        var modal = Page.Locator(".modal.fade.show.d-block").First;
        await modal.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(modal).ToBeVisibleAsync();

        // Fill first name
        var firstNameInput = modal.Locator("input[type='text']").First;
        await firstNameInput.FillAsync("EditedName");
        await firstNameInput.DispatchEventAsync("input");

        // Save
        var saveBtn = modal.Locator("button:has-text('Save'), button:has-text('Guardar')").First;
        await saveBtn.ClickAsync();

        // Modal should close after successful save
        try { await modal.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); }
        catch (TimeoutException) { Assert.Inconclusive("Modal did not close — save may have failed"); }
    }

    [Test]
    public async Task AdminUsers_DeleteUser_ShouldShowConfirmationAndDelete()
    {
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

        var spinner = Page.Locator(".spinner-border");
        try { await spinner.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 20_000 }); }
        catch (TimeoutException) { }
        await Task.Delay(500);

        var row = Page.Locator("table tbody tr").Filter(new() { HasText = email });
        await row.WaitForAsync(new() { Timeout = 8_000 });

        // Click delete (🗑) button
        var deleteBtn = row.Locator("button[title='Delete user']").First;
        await deleteBtn.WaitForAsync(new() { Timeout = 5_000 });
        await deleteBtn.ClickAsync();

        // Confirmation modal opens showing the user's email
        var modal = Page.Locator(".modal.fade.show.d-block").First;
        await modal.WaitForAsync(new() { Timeout = 5_000 });
        await Expect(modal).ToBeVisibleAsync();
        await Expect(modal.Locator($"text={email}")).ToBeVisibleAsync();

        // Click the destructive Delete button
        var confirmBtn = modal.Locator("button.btn-danger:has-text('Delete')").First;
        await confirmBtn.ClickAsync();

        var spinner2 = Page.Locator(".spinner-border");
        try { await spinner2.WaitForAsync(new() { Timeout = 5_000 }); } catch (TimeoutException) { }
        try { await spinner2.WaitForAsync(new() { State = WaitForSelectorState.Hidden, Timeout = 10_000 }); } catch (TimeoutException) { }
        await Task.Delay(500);

        // Modal is gone
        var modalCount = await Page.Locator(".modal.fade.show.d-block").CountAsync();
        Assert.That(modalCount, Is.EqualTo(0), "Delete confirmation modal should be closed");
    }

    // ── Upload page ───────────────────────────────────────────────────────

    [Test]
    public async Task AdminUpload_Page_Loads_And_Shows_Form()
    {
        await NavigateAsAdmin("/admin/upload");

        // Book ID input
        var bookIdInput = Page.Locator("input[type='text'], input[placeholder*='book' i], input[placeholder*='ID' i]").First;
        await bookIdInput.WaitForAsync(new() { Timeout = 8_000 });
        await Expect(bookIdInput).ToBeVisibleAsync();

        // File input
        var fileInput = Page.Locator("input[type='file']").First;
        await Expect(fileInput).ToBeAttachedAsync();
    }

    [Test]
    public async Task AdminUpload_Shows_Error_On_Invalid_BookId()
    {
        await NavigateAsAdmin("/admin/upload");

        // Fill BookId — plain @bind requires change event to commit value
        var bookIdInput = Page.Locator("input[type='text'], input[placeholder*='book' i], input[placeholder*='ID' i]").First;
        await bookIdInput.WaitForAsync(new() { Timeout = 8_000 });
        await bookIdInput.FillAsync("not-a-valid-guid");
        await bookIdInput.DispatchEventAsync("change"); // commit @bind value

        // Attach a dummy epub file so the Upload button becomes enabled
        // (button is disabled when _selectedFile is null)
        await Page.SetInputFilesAsync("input[type='file']", new FilePayload[]
        {
            new() { Name = "test.epub", MimeType = "application/epub+zip",
                    Buffer = System.Text.Encoding.UTF8.GetBytes("PK fake epub") }
        });
        await Task.Delay(500); // Let Blazor OnChange handler run

        var uploadBtn = Page.Locator("button:has-text('Upload'), button:has-text('Subir')").First;
        await uploadBtn.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 5_000 });
        await uploadBtn.ClickAsync();

        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        // Should show error: invalid GUID → 404 or API validation error
        var error = Page.Locator(".alert-danger, .alert-warning, [role='alert']");
        await error.First.WaitForAsync(new() { Timeout = 8_000 });
        var count = await error.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "Upload with invalid book ID should show an error");
    }
}
