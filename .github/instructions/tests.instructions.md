---
applyTo: "**/tests/**"
---

# Tests

The solution has four test projects, each with a clear scope. Pick the right
one before adding a test.

| Project                            | Scope                                                         |
|------------------------------------|---------------------------------------------------------------|
| `EBookLibrary.Domain.Tests`        | Pure domain logic (entities, value objects, domain events).   |
| `EBookLibrary.Application.Tests`   | MediatR handlers + validators, with mocked dependencies.      |
| `EBookLibrary.WebApi.Tests`        | HTTP surface via `WebApplicationFactory<Program>` (in-memory). |
| `EBookLibrary.E2E.Tests`           | Playwright for .NET against a running stack.                  |

## Common stack

- **xUnit** as the runner.
- **FluentAssertions** for readable asserts (`result.Should().BeOfType<...>()`).
- **Moq** for test doubles.
- AAA layout in every test, with `// Arrange / Act / Assert` comment markers.
- Test class name matches the SUT: `RegisterUserCommandHandlerTests`.
- Test method name reads as a sentence: `Handle_WithDuplicateEmail_ShouldFail`.

## Helpers

Each project that needs them ships:

- `TestHelpers/MockFactory.cs` — pre-configured Mocks (`CreatePasswordHashService`, etc.).
- `TestHelpers/EntityBuilders.cs` — fluent builders for domain entities with
  sane defaults so tests only specify what matters.

Reach for these before writing inline `Mock<...>` setup or hand-built entities.

## Application handler test pattern

```csharp
[Fact]
public async Task Handle_WithValidInput_ShouldReturnSuccess()
{
    // Arrange
    var uow  = TestMockFactory.CreateUnitOfWork(...);
    var hash = TestMockFactory.CreatePasswordHashService();
    var jwt  = TestMockFactory.CreateJwtService();
    var sut  = new RegisterUserCommandHandler(uow.Object, hash.Object, jwt.Object);

    // Act
    var result = await sut.Handle(new RegisterUserCommand(...), default);

    // Assert
    result.IsSuccess.Should().BeTrue();
    uow.Verify(u => u.SaveChangesAsync(default), Times.Once);
}
```

## WebApi integration tests

- Use a custom `WebApplicationFactory<Program>` that swaps the DbContext for
  SQLite in-memory or an InMemory provider.
- Seed via the same `DataSeeder` — never copy seed data into the test project.
- Hardcoded admin creds for tests live in
  `Controllers/UsersControllerTests.cs` (intentional fixture, **not a real secret**).

## E2E tests

- Choose the frontend with the `FRONTEND` env var (`react` or `blazor`).
  Defaults to Blazor when unset.
- Tests live under `tests/` (Blazor selectors) and `tests/React/` (React
  selectors). Common helpers in `Helpers/`.
- Always start the API and the chosen frontend before running. The fixtures
  do **not** start them automatically.

## Don't

- Don't share state between tests (no `static` fields, no shared DbContext).
- Don't assert on log output unless that **is** the behaviour under test.
- Don't add a `Thread.Sleep` to hide async timing — fix the await.
