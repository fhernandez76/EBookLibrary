# Chapter 13 — End-to-End Tests

> *"A test that drives the real browser tells you the real story."*

---

## What you will learn

- The role end-to-end tests play *in addition to* the unit tests of
  Chapter 12 — and the small set of journeys that earn their slow
  runtime.
- How **Playwright for .NET** drives Chromium, Firefox, and WebKit
  with a single API, against either the React or the Blazor frontend.
- The Page Object Model pattern that keeps an E2E suite maintainable
  beyond the first ten tests.
- How to run the suite headlessly in CI and how to record video and
  trace files for failed runs.
- The five anti-patterns that turn an E2E suite into a flaky burden.

---

## 13.1 Why E2E tests, given the unit tests

The unit tests of Chapter 12 prove the controller dispatches, the
handler handles, the entity validates. They do not prove that a user
clicking the *Sign in* button on the React app *actually* logs in. The
gap is in the wiring: the form's `onSubmit`, the API client, the CORS
preflight, the JWT round-trip, the route guard, the data fetch on the
landing page. Any one of those can break in a way no unit test sees.

E2E tests cover the wiring. The trade-off is steep: they are slow
(seconds per test, not microseconds), they are brittle (a CSS selector
changes and the test breaks), and they require a running stack. The
trade is worth it *for the small set of journeys that actually
matter*.

> **In Practice:** A useful rule: *one E2E per business-critical user
> journey*. For this project that is roughly five — register, login,
> search, download, admin-create-book. Add the sixth E2E only when an
> incident proves it earns its keep. A team that writes "an E2E for
> every page" inevitably ends up with an E2E suite they ignore
> because it is too slow and too red.

---

## 13.2 The Playwright stack

The project uses Playwright for .NET — Microsoft's cross-browser
automation library, with a strongly-typed C# API that matches the
JavaScript original almost line-for-line.

```xml
<PackageReference Include="Microsoft.Playwright" Version="1.51.0" />
<PackageReference Include="Microsoft.Playwright.NUnit" Version="1.51.0" />
```

After install, browser binaries are downloaded with one command:

```powershell
pwsh tests/EBookLibrary.E2E.Tests/bin/Debug/net10.0/playwright.ps1 install
```

That fetches Chromium, Firefox, and WebKit. The same test suite runs
against any of the three by changing one configuration line.

---

## 13.3 The shape of an E2E test

A first end-to-end test in raw form — before any abstractions — looks
like Listing 13.1.

**Listing 13.1 — `LoginJourneyTests.cs` (raw, no Page Object).**

```csharp
public sealed class LoginJourneyTests : PageTest
{
    [SetUp]
    public async Task NavigateToHome() =>
        await Page.GotoAsync("https://localhost:5173");

    [Test]
    public async Task Admin_can_log_in_and_reach_dashboard()
    {
        await Page.ClickAsync("a:has-text('Sign in')");
        await Page.FillAsync("input[name='email']",    "admin@ebooklibrary.dev");
        await Page.FillAsync("input[name='password']", "Admin#2026!");
        await Page.ClickAsync("button[type='submit']");

        await Expect(Page).ToHaveURLAsync(new Regex(@"\/$"));    // back to home
        await Expect(Page.Locator("a:has-text('Admin')")).ToBeVisibleAsync();
    }
}
```

The test reads top to bottom as a user story. `Expect(...)` calls are
auto-retrying — they wait up to the default timeout for the assertion
to become true. There is no manual `Sleep` or `WaitForElementAsync`;
that is a Playwright design decision that has aged extremely well.

> **Pitfall:** *Never* use `Task.Delay`/`Thread.Sleep` in an E2E test.
> The "wait long enough that the slowest CI box can keep up" anti-
> pattern leads to a suite that takes hours and still flakes. Trust
> Playwright's auto-waiting; if a `ClickAsync` is racy, fix the
> selector to be more specific, do not throw a timer at it.

---

## 13.4 The Page Object Model

By the third test, common operations (login, search, navigate) are
duplicated. The Page Object Model groups the *operations* offered by a
page into a class.

**Listing 13.2 — `Pages/LoginPage.cs`.**

```csharp
public sealed class LoginPage
{
    private readonly IPage _page;
    public LoginPage(IPage page) => _page = page;

    public Task GoToAsync() => _page.GotoAsync("/login");

    public async Task SignInAsync(string email, string password)
    {
        await _page.FillAsync("input[name='email']", email);
        await _page.FillAsync("input[name='password']", password);
        await _page.ClickAsync("button[type='submit']");
    }

    public ILocator ErrorAlert => _page.Locator("[role='alert']");
}
```

The test then reads even closer to a user story.

**Listing 13.3 — `LoginJourneyTests.cs` (with Page Object).**

```csharp
[Test]
public async Task Wrong_password_shows_generic_error()
{
    var login = new LoginPage(Page);
    await login.GoToAsync();
    await login.SignInAsync("admin@ebooklibrary.dev", "wrong-password");

    await Expect(login.ErrorAlert).ToContainTextAsync("Invalid email or password");
    // Generic — see § 5.5. Test passes only if the API and frontend
    // both honor the anti-enumeration discipline.
}
```

The page object owns the selectors. When the form's HTML changes,
exactly one file changes — not every test that touched the form.

---

## 13.5 The five journeys this project tests

The E2E suite is small on purpose. Each test maps to a user-visible
business journey.

**Table 13.1 — The full E2E suite.**

| #  | Journey                                    | Time | Why it earns its keep                                               |
|----|--------------------------------------------|------|----------------------------------------------------------------------|
| 1  | Anonymous search → result list             | 3 s  | Catches CORS, OpenAPI, paging contract drift.                       |
| 2  | Register → auto-login → home               | 5 s  | Catches BCrypt config, JWT issuance, persistence wiring.            |
| 3  | Login (admin) → reach `/admin/books`       | 4 s  | Catches the role-claim bug from § 8.4 in production-like form.      |
| 4  | Login → book detail → download             | 6 s  | Catches file-streaming bugs and the download-while-anon redirect.   |
| 5  | Admin: create book → appears in search     | 8 s  | Catches the entire write path including TanStack Query invalidation.|

Five tests. ~30 seconds total. Run on every pull request.

> **Architect's Note:** The constraint "the E2E suite finishes in
> under one minute" forces the right kind of selectivity. A team that
> permits a fifteen-minute E2E suite quickly stops blocking PRs on
> it; a team that permits a sixty-second E2E suite blocks every PR
> on it gladly. The *short* suite is the *useful* suite.

---

## 13.6 Test data and isolation

The hardest problem in E2E testing is *data*. Tests must start from a
known state and must not leave the database in a state that breaks the
next test.

The project's strategy is the simplest one that works:

1. The CI pipeline spins up a SQL Server *Testcontainer* per E2E
   run.
2. The Web API points at that container's connection string via an
   environment variable.
3. The seeder runs once, populating the admin user and a small
   curated catalog of ten books.
4. Tests that need write data create their own (with timestamp-suffixed
   titles to avoid collision).
5. The container is torn down at the end of the run.

No cleanup code per test. Each test run gets a fresh database. Total
provisioning time: ~12 seconds. Worth it.

> **Pitfall:** "Run the suite against the staging database" is a
> tempting shortcut that ends in tears. The first test that creates
> a book leaves the book in staging. The fifth run, the search test
> finds *six* test books, not five, and fails. Either fully isolate
> per run or accept the flake.

---

## 13.7 CI integration and trace artifacts

In CI the suite runs headless. On failure, Playwright records video,
screenshots, and a *trace* file — a complete recording of network
calls, DOM mutations, and console output — that can be replayed in
the Playwright Trace Viewer.

**Listing 13.4 — `playwright.config` excerpt (from `BaseTest.cs`).**

```csharp
[OneTimeSetUp]
public async Task GlobalSetup()
{
    var playwright = await Playwright.CreateAsync();
    Browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
    {
        Headless = true,
    });
}

[SetUp]
public async Task PerTestSetup()
{
    Context = await Browser.NewContextAsync(new BrowserNewContextOptions
    {
        RecordVideoDir = "videos/",
    });
    await Context.Tracing.StartAsync(new TracingStartOptions
    {
        Screenshots = true, Snapshots = true, Sources = true,
    });
}

[TearDown]
public async Task PerTestTeardown()
{
    var failed = TestContext.CurrentContext.Result.Outcome.Status == TestStatus.Failed;
    await Context.Tracing.StopAsync(new TracingStopOptions
    {
        Path = failed ? $"traces/{TestContext.CurrentContext.Test.Name}.zip" : null,
    });
    await Context.CloseAsync();
}
```

A failed CI run uploads the trace as a build artifact. Opening the
trace in
`pwsh playwright.ps1 show-trace traces/<test>.zip` plays back exactly
what the browser did, frame by frame, with a network panel and a DOM
snapshot per action. This single feature is the reason E2E debugging
in 2025 is finally bearable.

---

## 13.8 The five anti-patterns that ruin E2E suites

After years of watching teams write E2E suites, the same five failure
modes recur.

**Table 13.2 — E2E anti-patterns and their fixes.**

| Anti-pattern                                         | Symptom                                                  | Fix                                                            |
|------------------------------------------------------|----------------------------------------------------------|----------------------------------------------------------------|
| `Thread.Sleep(2000)` instead of waiting for state    | Suite is slow *and* still flakes                         | Use Playwright's auto-waiting locators                         |
| Selectors based on `nth-child(3)` or class name      | Test breaks every time the designer touches the DOM      | Use `data-testid` attributes that survive redesign             |
| Tests that depend on each other's state              | Reordering or running one test in isolation fails         | Each test creates the data it needs; clean by isolation        |
| Catching all exceptions in a test                    | Tests "pass" while the page is showing a crash dialog    | Let the test framework see the failure                         |
| One enormous test that does five things              | Failure tells you "something broke" with no localization | Split into the five things                                     |

The `data-testid` recommendation is worth elaborating. Frontend
designers reorganize markup constantly; CSS selectors break with
every redesign. A `data-testid="login-submit"` attribute on the
button is invisible to users, immune to redesign, and an explicit
contract between the frontend and the test suite.

---

## 13.9 Running the suite

```powershell
# All E2E tests against Chromium (default)
dotnet test tests/EBookLibrary.E2E.Tests/

# Single test, with the browser visible (debug mode)
dotnet test tests/EBookLibrary.E2E.Tests/ `
    --filter "Name=Admin_can_log_in_and_reach_dashboard" `
    -- TestRunParameters.Parameter\(name=\"Headless\",value=\"false\"\)

# Against Firefox
$env:BROWSER = "firefox"; dotnet test tests/EBookLibrary.E2E.Tests/

# Open the latest trace
pwsh tests/EBookLibrary.E2E.Tests/playwright.ps1 show-trace traces/latest.zip
```

For development the visible-browser run is the right tool — you watch
the test, see the click, see the form fill, see the assertion. For CI
the headless run is faster and produces the trace artifact for
post-mortem.

---

## 13.10 Checkpoint

You are ready for Chapter 14 when:

- [ ] `dotnet test tests/EBookLibrary.E2E.Tests/` runs and the five
      journeys pass against your local stack.
- [ ] You can name the bug Test #3 catches that no unit test would.
- [ ] You know what the Trace Viewer is and have opened a trace for a
      passing run to see what it shows.
- [ ] You can articulate why the suite has *five* tests and not
      fifty.
- [ ] You can write a sixth journey test from scratch using the Page
      Object pattern.

---

## Key takeaways

- E2E tests cover the wiring that unit tests cannot reach. Keep them
  *few* and keep them *meaningful*.
- Playwright's auto-waiting locators eliminate the
  `Thread.Sleep`-and-pray anti-pattern.
- The Page Object Model concentrates selectors in one place per
  page, surviving redesigns gracefully.
- Each E2E run gets a fresh database via Testcontainers; per-test
  cleanup is replaced by per-run isolation.
- A trace from a failed CI run replays the full browser session — the
  single feature that makes modern E2E debugging tractable.

---

## Exercises

**Easy.** Add `data-testid` attributes to the five elements the
existing E2E suite touches: email input, password input, submit
button, error alert, admin nav link. Replace the text-and-CSS
selectors in the page objects with `[data-testid='...']` selectors.
Run the suite; nothing should change.

**Medium.** Add a sixth journey: *registered reader downloads a
book*. The test signs up a fresh user (timestamp-suffixed email), logs
in, navigates to a known book, clicks Download, and asserts that the
download finishes. Use Playwright's `Page.WaitForDownloadAsync()` API.

**Hard.** Configure the suite to run against *both* the React frontend
(port 5173) and the Blazor frontend (port 7278) by parameterizing the
base URL. Discuss what assertions are portable across the two
frontends and which ones depend on framework-specific markup.

---

## Further reading

- Playwright for .NET docs. <https://playwright.dev/dotnet/>
- Trace Viewer guide. <https://playwright.dev/dotnet/docs/trace-viewer>
- Cypress's *Best Practices* page — even if you do not use Cypress,
  the principles transfer.
- Martin Fowler, *"Page Object"*. The original write-up.
- Testcontainers for .NET docs.
