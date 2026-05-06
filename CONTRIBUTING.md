# Contributing

Thank you for your interest. This repository ships a full Clean-Architecture
.NET 10 reference solution (`Automatic/EBookLibrary/`), two frontends (React,
Blazor), an end-to-end test suite, and a 30-chapter training book
(`Training/book/`).

## Quick start

```powershell
git clone https://github.com/fhernandez76/EBookLibrary.git
cd <YOUR-REPO>/Automatic/EBookLibrary
dotnet restore
dotnet build
dotnet test
```

See [README.md](README.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md)
for full orientation.

## Branching

- `main` — protected, releasable
- `feature/<short-slug>` — new work
- `fix/<issue-id>-<slug>` — bug fixes
- `docs/<slug>` — docs / book changes only

## Pull request gates

Before opening a PR, the following must pass locally:

| Gate            | Command                                                                |
|-----------------|------------------------------------------------------------------------|
| Build           | `dotnet build Automatic/EBookLibrary/EBookLibrary.sln`                 |
| Unit tests      | `dotnet test Automatic/EBookLibrary/EBookLibrary.sln`                  |
| React lint      | `cd Automatic/EBookLibrary/src/EBookLibrary.React && npm run lint`     |
| React typecheck | `cd Automatic/EBookLibrary/src/EBookLibrary.React && npm run build`    |

E2E tests (`EBookLibrary.E2E.Tests`) require a running API and frontend; they
are not part of the default PR gate but should be run before merging changes
that touch controllers, the React app, or the Blazor app.

## Commit messages

Conventional commits preferred:

- `feat(api): add /books/featured endpoint`
- `fix(react): handle 401 on book detail page`
- `docs(book): clarify CQRS chapter`
- `test(e2e): cover admin user flow`

## Code conventions

The conventions encoded in `.github/copilot-instructions.md` and
`.github/instructions/*.instructions.md` are authoritative. In short:

- Domain layer has **zero** outward dependencies.
- Every use case is a MediatR `IRequest<Result<T>>` handler.
- API responses are wrapped in `ApiResponse<T>`.
- Soft delete via global query filter (`IsDeleted`).
- Roles via `ClaimTypes.Role` and `[Authorize(Roles = "...")]`.
- React: TanStack Query for server state, Zustand for client state,
  Tailwind for styling.
- Blazor: MudBlazor components, scoped CSS isolation.
- Tests: xUnit + FluentAssertions + Moq, AAA layout, no shared state.

## Reporting issues

Please include:

1. Affected layer / project
2. Steps to reproduce
3. Expected vs. actual behaviour
4. .NET / Node / OS versions
5. Relevant log excerpt (scrub secrets)

## Code of conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md).
