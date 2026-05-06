# Chapter 3 — Solution Setup

> *"A well-structured solution is readable before a single line of
> business code is written."*

---

## What you will learn

- How to scaffold all ten projects in the EBook Library solution from
  the .NET CLI.
- The role of `global.json` and `Directory.Build.props` and why both are
  worth a few minutes of attention.
- Which NuGet packages belong in which layer, and why the Domain layer
  has none.
- How to verify that the dependency rule from Chapter 2 is enforced by
  your `.csproj` references.
- How to scaffold the React frontend with the correct, version-pinned
  dependencies.

By the end of this chapter the solution will compile, build with zero
errors, and contain no business logic. That is the point: the
scaffolding has to be right before the building begins.

---

## 3.1 The end-state to aim at

Before running any commands, fix the target structure in your head.
Listing 3.1 is identical to Listing 2.1 in the previous chapter; it is
worth re-reading.

**Listing 3.1 — Solution layout (target).**

```text
EBookLibrary/
├── EBookLibrary.sln
├── global.json                   ← pins the .NET SDK version
├── Directory.Build.props         ← shared MSBuild properties
│
├── src/
│   ├── EBookLibrary.Domain/
│   ├── EBookLibrary.Application/
│   ├── EBookLibrary.Infrastructure/
│   ├── EBookLibrary.WebApi/
│   ├── EBookLibrary.Blazor/
│   └── EBookLibrary.React/
│
├── tests/
│   ├── EBookLibrary.Domain.Tests/
│   ├── EBookLibrary.Application.Tests/
│   ├── EBookLibrary.WebApi.Tests/
│   └── EBookLibrary.E2E.Tests/
│
└── scripts/
    └── EBookLibrary.Seeder/
```

Ten projects in total: six source projects, four test projects, and one
seeder console application.

---

## 3.2 Step 1 — Create the solution and the shared MSBuild files

**Listing 3.2 — Creating the solution and entering it.**

```powershell
mkdir EBookLibrary
cd EBookLibrary
dotnet new sln -n EBookLibrary
```

### Pinning the .NET SDK version

A team of more than one engineer needs to agree on which SDK builds the
solution. `global.json` does that.

**Listing 3.3 — `global.json` at the solution root.**

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestMinor"
  }
}
```

`rollForward: latestMinor` reads as *use SDK 10.0.x or higher, but stay
on major version 10*. This protects against an accidental upgrade to
.NET 11 while still allowing patch releases.

> **Pitfall:** Without `global.json`, your build is at the mercy of
> whichever SDK happens to be installed on each engineer's machine,
> which is also the SDK CI happened to install last week. The first
> symptom is *"works on my machine"*; the second is a Friday-afternoon
> emergency upgrade.

### Shared MSBuild properties

Every `.csproj` in the solution should target the same framework, opt
in to nullable reference types, and enable implicit usings.
`Directory.Build.props` declares those defaults once.

**Listing 3.4 — `Directory.Build.props` at the solution root.**

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <LangVersion>preview</LangVersion>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
    <Optimize Condition="'$(Configuration)'=='Release'">true</Optimize>
  </PropertyGroup>
</Project>
```

> **Foundations:** *Implicit usings* automatically include common
> namespaces (`System`, `System.Collections.Generic`, `System.Linq`,
> …) so you do not need a `using System;` at the top of every file.
> *Nullable reference types* causes the compiler to treat `string` as
> non-nullable; to allow null you write `string?` explicitly. Both
> features have been on by default in new project templates for several
> .NET releases; both can be disabled per-project if needed.

---

## 3.3 Step 2 — Create the projects

The order does not matter; the `dotnet new` commands are independent.

**Listing 3.5 — Creating the backend projects.**

```powershell
dotnet new classlib -n EBookLibrary.Domain         -o src/EBookLibrary.Domain
dotnet new classlib -n EBookLibrary.Application    -o src/EBookLibrary.Application
dotnet new classlib -n EBookLibrary.Infrastructure -o src/EBookLibrary.Infrastructure
dotnet new webapi   -n EBookLibrary.WebApi         -o src/EBookLibrary.WebApi --use-controllers
dotnet new blazorwasm -n EBookLibrary.Blazor       -o src/EBookLibrary.Blazor
```

> **Pitfall:** The `--use-controllers` flag on the `webapi` template is
> easy to forget. Without it you get a Minimal API skeleton, not a
> controller-based one, and § 7.2 of this book will not match what is
> on your screen.

**Listing 3.6 — Creating the test projects.**

```powershell
dotnet new xunit -n EBookLibrary.Domain.Tests       -o tests/EBookLibrary.Domain.Tests
dotnet new xunit -n EBookLibrary.Application.Tests  -o tests/EBookLibrary.Application.Tests
dotnet new xunit -n EBookLibrary.WebApi.Tests       -o tests/EBookLibrary.WebApi.Tests
dotnet new nunit -n EBookLibrary.E2E.Tests          -o tests/EBookLibrary.E2E.Tests
```

> **Architect's Note:** The E2E test project uses NUnit, not xUnit.
> Microsoft's Playwright integration leans heavily on NUnit's
> `[SetUpFixture]` and `[OneTimeSetUp]` lifecycle hooks for booting and
> tearing down the test web server. xUnit's collection fixtures can be
> made to work but require more ceremony. Mixing test frameworks in one
> solution is unusual; it is justified here.

**Listing 3.7 — Creating the seeder console application.**

```powershell
dotnet new console -n EBookLibrary.Seeder -o scripts/EBookLibrary.Seeder
```

### The React frontend

The React project is created with Vite, which is the present default
scaffolder for new React + TypeScript projects. The full dependency
list appears below; do not run the install commands yet — read the
pitfall first.

**Listing 3.8 — Creating the React frontend.**

```powershell
cd src
npm create vite@latest EBookLibrary.React -- --template react-ts
cd EBookLibrary.React

# Core
npm install react-router-dom@6 axios @tanstack/react-query zustand

# Internationalization
npm install i18next react-i18next i18next-browser-languagedetector

# Tailwind CSS — pin to v3 explicitly
npm install -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p

# Forms
npm install react-hook-form @hookform/resolvers zod

# UI utilities
npm install @headlessui/react @heroicons/react clsx

# Dev typings
npm install -D @types/node

cd ../..
```

> **Pitfall:** Install `tailwindcss@3` *explicitly*. A bare
> `npm install tailwindcss` resolves to v4, which uses a completely
> different configuration format. The `tailwind.config.js` shown in
> Chapter 10 is a v3 file; on v4 it will not work, and the error
> messages do not point at the version mismatch. This is the single
> most common setup error in the entire project.

---

## 3.4 Step 3 — Register the projects with the solution

`dotnet sln add` makes the solution aware of each project. The order
does not matter.

**Listing 3.9 — Registering all ten projects.**

```powershell
# Source projects
dotnet sln add src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet sln add src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet sln add src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj
dotnet sln add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
dotnet sln add src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj

# Tests
dotnet sln add tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj
dotnet sln add tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj
dotnet sln add tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj
dotnet sln add tests/EBookLibrary.E2E.Tests/EBookLibrary.E2E.Tests.csproj

# Seeder
dotnet sln add scripts/EBookLibrary.Seeder/EBookLibrary.Seeder.csproj

dotnet sln list      # → expect 10 projects listed
```

The React project does not appear in `dotnet sln list` — Vite
projects are not part of the .NET solution by design.

---

## 3.5 Step 4 — Configure project references

This is the step where the dependency rule from Chapter 2 stops being a
diagram and starts being enforced by the build.

**Listing 3.10 — Linking the backend project references.**

```powershell
# Application → Domain
dotnet add src/EBookLibrary.Application reference `
    src/EBookLibrary.Domain/EBookLibrary.Domain.csproj

# Infrastructure → Application
dotnet add src/EBookLibrary.Infrastructure reference `
    src/EBookLibrary.Application/EBookLibrary.Application.csproj

# WebApi → Application + Infrastructure
dotnet add src/EBookLibrary.WebApi reference `
    src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet add src/EBookLibrary.WebApi reference `
    src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj
```

**Listing 3.11 — Linking the test project references.**

```powershell
dotnet add tests/EBookLibrary.Domain.Tests reference `
    src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet add tests/EBookLibrary.Application.Tests reference `
    src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet add tests/EBookLibrary.WebApi.Tests reference `
    src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
```

After running these, `EBookLibrary.WebApi.csproj` should look exactly
like Listing 3.12. Notice that it does *not* directly reference Domain.
Domain types are reachable through Application; the layers in between
exist precisely to keep the API layer from depending on them directly.

**Listing 3.12 — `EBookLibrary.WebApi.csproj` after linking.**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <ProjectReference Include="..\EBookLibrary.Application\EBookLibrary.Application.csproj" />
    <ProjectReference Include="..\EBookLibrary.Infrastructure\EBookLibrary.Infrastructure.csproj" />
  </ItemGroup>
</Project>
```

> **Pitfall:** It is tempting, on first scaffolding, to add a Domain
> reference to WebApi "to make a controller compile faster". Don't.
> Once the reference exists, controllers will start using Domain types
> directly, and the abstraction the Application layer is supposed to
> provide stops doing any work. Spend the extra minute to add the
> required Application DTO instead.

---

## 3.6 Step 5 — Install NuGet packages

The package list per layer is shown below. The Domain project has none.

### Domain — zero packages

The cleanest first commit you can make on this project is to delete the
default `Class1.cs` files from each class library and check in the
empty projects.

**Listing 3.13 — Removing the default `Class1.cs` placeholders.**

```powershell
Remove-Item src/EBookLibrary.Domain/Class1.cs
Remove-Item src/EBookLibrary.Application/Class1.cs
Remove-Item src/EBookLibrary.Infrastructure/Class1.cs
```

> **Architect's Note:** "Why zero NuGet dependencies in Domain?" If
> Domain depended on EF Core, the Domain test project would need EF
> Core to compile. If it depended on MediatR, swapping mediator
> libraries would require touching domain entities. The discipline of
> keeping Domain dependency-free pays its largest dividend the day
> someone proposes replacing one of those libraries.

### Application

**Listing 3.14 — Application layer NuGet packages.**

```powershell
cd src/EBookLibrary.Application

dotnet add package MediatR
dotnet add package FluentValidation.DependencyInjectionExtensions
dotnet add package AutoMapper
dotnet add package Microsoft.Extensions.DependencyInjection.Abstractions
dotnet add package Serilog.AspNetCore
```

### Infrastructure

**Listing 3.15 — Infrastructure layer NuGet packages.**

```powershell
cd ../EBookLibrary.Infrastructure

dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package BCrypt.Net-Next
dotnet add package Microsoft.IdentityModel.Tokens
dotnet add package System.IdentityModel.Tokens.Jwt
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.Extensions.Configuration.Abstractions
```

### Web API

**Listing 3.16 — Web API layer NuGet packages.**

```powershell
cd ../EBookLibrary.WebApi

dotnet add package MediatR.Extensions.Microsoft.DependencyInjection
dotnet add package Serilog.AspNetCore
dotnet add package Scalar.AspNetCore
dotnet add package Microsoft.AspNetCore.RateLimiting
```

### Test projects

**Listing 3.17 — Test project NuGet packages.**

```powershell
cd ../../tests/EBookLibrary.Application.Tests

dotnet add package Moq
dotnet add package FluentAssertions
dotnet add package AutoMapper

cd ../EBookLibrary.WebApi.Tests

dotnet add package Microsoft.AspNetCore.Mvc.Testing
dotnet add package Microsoft.EntityFrameworkCore.InMemory
dotnet add package FluentAssertions

cd ../EBookLibrary.E2E.Tests

dotnet add package Microsoft.Playwright.NUnit
dotnet add package Microsoft.AspNetCore.Mvc.Testing
```

---

## 3.7 Step 6 — Create the folder structure

The folder layout inside each project mirrors how Chapters 4–11 add
files to it. Create the empty folders now so you do not have to
interrupt yourself later. (`gitkeep` files are not strictly required;
add them if your version control discards empty directories.)

**Listing 3.18 — Folder skeleton for each project (abbreviated).**

```powershell
# Domain
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Common
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Entities
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Enums
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Events
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Interfaces/Repositories
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/ValueObjects

# Application — one folder per feature (Books, Authors, Genres, Users, Auth)
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Behaviors
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Interfaces
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Mappings
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Models
# (… one Commands/Queries/DTOs subtree per feature …)

# Infrastructure
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Persistence/Configurations
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Persistence/Migrations
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Repositories
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Services

# Web API
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Controllers
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Extensions
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Filters
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Middleware
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Models
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/OpenApi
```

The full list (with the per-feature CQRS subtrees in Application) lives
in the reference repository. The shape is what matters: feature-first
inside Application, layer-first elsewhere.

---

## 3.8 Step 7 — First build

Now is the moment of truth.

**Listing 3.19 — Verifying that the empty solution compiles.**

```powershell
dotnet build EBookLibrary.sln
```

The expected output is:

```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

If you see one error, read the rest of this section. If you see more,
re-run the failing `dotnet add reference` from § 3.5.

### The most common first-build failures

**Table 3.1 — Common first-build failures and their causes.**

| Symptom                                                            | Likely cause                                  | Fix                                                           |
|--------------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------------|
| `error NETSDK1045: The current .NET SDK does not support …`        | SDK older than the one pinned in `global.json`| Install .NET 10 SDK; re-open terminal.                        |
| `error CS0246: The type or namespace 'X' could not be found`       | Missing `dotnet add reference`                | Re-run the relevant command from § 3.5.                       |
| `error MSB4019: The imported project … was not found`              | `Directory.Build.props` not at solution root  | Move it next to `EBookLibrary.sln`.                           |
| Vite project errors during `npm install`                           | Wrong Tailwind version                        | `npm install -D tailwindcss@3` (Pitfall in § 3.3).            |
| `error: dotnet ef not found`                                       | EF Core CLI not installed                     | `dotnet tool install --global dotnet-ef` (Listing 1.2).       |
| Cycle reported in project references                               | Reverse reference (e.g. Domain → Application) | Remove the offending reference; dependencies point inward.    |

---

## 3.9 What you can verify right now

Before moving to Chapter 4, run all of the following. Each should
succeed.

**Listing 3.20 — End-of-chapter sanity checks.**

```powershell
dotnet sln list                   # 10 projects
dotnet build EBookLibrary.sln     # 0 errors, 0 warnings
dotnet ef --version               # 10.x.x
node --version                    # v20+ in src/EBookLibrary.React
npm run dev --prefix src/EBookLibrary.React   # Vite dev server starts (Ctrl+C to stop)
```

The last command starts the Vite development server even though there
is no application yet. Seeing the React placeholder load in the browser
is a proof that the entire frontend toolchain works.

---

## 3.10 Checkpoint

You are ready for Part II when:

- [ ] `dotnet sln list` shows all ten projects.
- [ ] `dotnet build EBookLibrary.sln` reports zero errors and zero
      warnings.
- [ ] The Vite dev server starts and serves the React placeholder.
- [ ] Inspecting `EBookLibrary.WebApi.csproj` matches Listing 3.12.
- [ ] `Class1.cs` files have been removed from the three class
      libraries.

---

## Key takeaways

- The `.csproj` reference graph is the *primary* enforcement mechanism
  for the dependency rule introduced in Chapter 2.
- `global.json` and `Directory.Build.props` are five-minute investments
  with multi-month payoffs; do not skip them.
- The Domain layer takes zero NuGet dependencies, deliberately. This
  is a constraint, not an oversight.
- The single most common setup error in this project is installing
  Tailwind v4 by accident. Pin v3 explicitly.
- A green build with no business code is a milestone worth pausing
  on. The next chapter starts adding behavior.

---

## Exercises

**Easy.** Open all four `.csproj` files under `src/` and verify, by
reading them, that the references match Table 2.1. (No code, only XML.)

**Medium.** The seeder project (`scripts/EBookLibrary.Seeder`) is a
console application that will eventually need to call into Application
handlers to insert the seed data. Decide which project(s) the seeder
should reference, and add the references with `dotnet add reference`.
Then build the solution. (Hint: it is the same set of references as
the Web API.)

**Hard.** Add a *fifth* test project, `EBookLibrary.Infrastructure.Tests`,
following the conventions established in this chapter. Decide what kinds
of tests you would put in it (and what kinds you would *not*; some
infrastructure tests belong in the WebApi.Tests project's integration
tests instead).

---

## Further reading

- Microsoft, *.NET CLI overview*.
  <https://docs.microsoft.com/dotnet/core/tools/>
- Microsoft, *Customize your build with `Directory.Build.props`*.
  <https://docs.microsoft.com/visualstudio/msbuild/customize-by-directory>
- Vite, *Getting Started* — the canonical React + TypeScript scaffold.
  <https://vitejs.dev/guide/>
- Tailwind CSS v3 documentation (note the version explicitly).
  <https://v3.tailwindcss.com/docs/installation>
