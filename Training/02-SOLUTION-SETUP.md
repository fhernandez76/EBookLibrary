# Chapter 02 — Solution Setup & Project Structure

> *"A well-structured solution is readable before a single line of business code is written."*

---

## Chapter Objectives

By the end of this chapter you will:
- Have a compilable .NET solution with all 9 projects created and correctly linked
- Understand the purpose of `global.json` and `Directory.Build.props`
- Know which NuGet packages belong in which layer and why
- Have the React frontend scaffold initialized with the correct dependencies

---

## 2.1 Solution Structure Overview

Before running any commands, understand the target structure:

```
EBookLibrary/
├── EBookLibrary.sln              ← Solution file (lists all projects)
├── global.json                   ← Pins the .NET SDK version for consistency
├── Directory.Build.props         ← Shared MSBuild properties for all projects
│
├── src/
│   ├── EBookLibrary.Domain/          ← Class library — zero deps
│   ├── EBookLibrary.Application/     ← Class library — CQRS orchestration
│   ├── EBookLibrary.Infrastructure/  ← Class library — EF Core, JWT, BCrypt
│   ├── EBookLibrary.WebApi/          ← ASP.NET Core 10 Web API
│   ├── EBookLibrary.Blazor/          ← Blazor WebAssembly (alternative frontend)
│   └── EBookLibrary.React/           ← Vite + React 18 + TypeScript SPA
│
├── tests/
│   ├── EBookLibrary.Domain.Tests/
│   ├── EBookLibrary.Application.Tests/
│   ├── EBookLibrary.WebApi.Tests/
│   └── EBookLibrary.E2E.Tests/       ← Playwright end-to-end tests
│
└── scripts/
    └── EBookLibrary.Seeder/           ← Console app for DB seeding
```

---

## 2.2 Step 1 — Create the Solution

Open a terminal and run the following commands:

```bash
# Create the root directory and navigate into it
mkdir EBookLibrary
cd EBookLibrary

# Create the solution file
dotnet new sln -n EBookLibrary
```

### Pin the .NET SDK Version

Create `global.json` in the solution root to ensure everyone on the team uses the same SDK version:

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestMinor"
  }
}
```

> **Why `rollForward: latestMinor`?** This means "use SDK 10.0.x or higher, but stay on major version 10." It prevents accidentally using .NET 11 while still receiving patch updates.

### Shared Build Properties

Create `Directory.Build.props` in the solution root. This file applies to **all** `.csproj` files automatically:

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

> **Why `Directory.Build.props`?** Without it, you'd need to set `Nullable`, `ImplicitUsings`, and `TargetFramework` in every single `.csproj`. With it, they're inherited automatically.

---

## 2.3 Step 2 — Create All Projects

### Backend Projects (.NET)

```bash
# Domain — pure class library, zero deps
dotnet new classlib -n EBookLibrary.Domain -o src/EBookLibrary.Domain

# Application — CQRS orchestration layer
dotnet new classlib -n EBookLibrary.Application -o src/EBookLibrary.Application

# Infrastructure — EF Core, services
dotnet new classlib -n EBookLibrary.Infrastructure -o src/EBookLibrary.Infrastructure

# Web API — ASP.NET Core controller-based (NOT minimal APIs)
dotnet new webapi -n EBookLibrary.WebApi -o src/EBookLibrary.WebApi --use-controllers

# Blazor WebAssembly frontend
dotnet new blazorwasm -n EBookLibrary.Blazor -o src/EBookLibrary.Blazor
```

### Test Projects

```bash
dotnet new xunit -n EBookLibrary.Domain.Tests      -o tests/EBookLibrary.Domain.Tests
dotnet new xunit -n EBookLibrary.Application.Tests -o tests/EBookLibrary.Application.Tests
dotnet new xunit -n EBookLibrary.WebApi.Tests      -o tests/EBookLibrary.WebApi.Tests
dotnet new nunit -n EBookLibrary.E2E.Tests         -o tests/EBookLibrary.E2E.Tests
```

> **Note:** The E2E tests use **NUnit** (not xUnit) because Playwright's .NET integration works best with NUnit's `[SetUpFixture]` and `[OneTimeSetUp]` attributes for test server lifecycle management.

### Seeder Console App

```bash
dotnet new console -n EBookLibrary.Seeder -o scripts/EBookLibrary.Seeder
```

### React Frontend (Vite + TypeScript)

```bash
cd src
npm create vite@latest EBookLibrary.React -- --template react-ts
cd EBookLibrary.React

# Core dependencies
npm install react-router-dom@6 axios @tanstack/react-query zustand

# i18n (internationalization)
npm install i18next react-i18next i18next-browser-languagedetector

# Tailwind CSS v3 (NOT v4 — different config format)
npm install -D tailwindcss@3 postcss autoprefixer @tailwindcss/typography
npx tailwindcss init -p

# Form handling
npm install react-hook-form @hookform/resolvers zod

# UI utilities
npm install @headlessui/react @heroicons/react clsx

# Dev dependencies
npm install -D @types/node

cd ../..  # Back to solution root
```

> **Important:** Install `tailwindcss@3` explicitly. Running `npm install tailwindcss` without the version installs v4, which uses a completely different configuration format incompatible with the `tailwind.config.js` shown in Chapter 09.

---

## 2.4 Step 3 — Register Projects with the Solution

```bash
# Source projects
dotnet sln add src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet sln add src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet sln add src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj
dotnet sln add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
dotnet sln add src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj

# Test projects
dotnet sln add tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj
dotnet sln add tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj
dotnet sln add tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj
dotnet sln add tests/EBookLibrary.E2E.Tests/EBookLibrary.E2E.Tests.csproj

# Seeder
dotnet sln add scripts/EBookLibrary.Seeder/EBookLibrary.Seeder.csproj
```

Verify the solution file lists all projects:

```bash
dotnet sln list
# Expected: 10 projects listed
```

---

## 2.5 Step 4 — Configure Project References

This is the most critical step — enforcing the dependency rule from Chapter 01.

```bash
# Application → Domain (Application uses Domain entities and interfaces)
dotnet add src/EBookLibrary.Application reference \
    src/EBookLibrary.Domain/EBookLibrary.Domain.csproj

# Infrastructure → Application (Infrastructure implements Application interfaces)
dotnet add src/EBookLibrary.Infrastructure reference \
    src/EBookLibrary.Application/EBookLibrary.Application.csproj

# WebApi → Application (WebApi sends commands/queries via MediatR)
dotnet add src/EBookLibrary.WebApi reference \
    src/EBookLibrary.Application/EBookLibrary.Application.csproj

# WebApi → Infrastructure (WebApi registers Infrastructure services in DI)
dotnet add src/EBookLibrary.WebApi reference \
    src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj

# Test projects reference their subjects
dotnet add tests/EBookLibrary.Domain.Tests reference \
    src/EBookLibrary.Domain/EBookLibrary.Domain.csproj

dotnet add tests/EBookLibrary.Application.Tests reference \
    src/EBookLibrary.Application/EBookLibrary.Application.csproj

dotnet add tests/EBookLibrary.WebApi.Tests reference \
    src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
```

### Verify the Reference Graph

After running these commands, your `EBookLibrary.Application.csproj` should look like:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <ProjectReference Include="..\EBookLibrary.Domain\EBookLibrary.Domain.csproj" />
  </ItemGroup>
</Project>
```

And `EBookLibrary.WebApi.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <ProjectReference Include="..\EBookLibrary.Application\EBookLibrary.Application.csproj" />
    <ProjectReference Include="..\EBookLibrary.Infrastructure\EBookLibrary.Infrastructure.csproj" />
  </ItemGroup>
</Project>
```

> Notice that `WebApi` does NOT directly reference `Domain` — it accesses domain types through `Application`.

---

## 2.6 Step 5 — Install NuGet Packages

### Domain — Zero Dependencies

The Domain project intentionally has no NuGet packages.

```bash
# Remove the default Class1.cs from all class libraries
Remove-Item src/EBookLibrary.Domain/Class1.cs
Remove-Item src/EBookLibrary.Application/Class1.cs
Remove-Item src/EBookLibrary.Infrastructure/Class1.cs
```

> **Why zero dependencies in Domain?** Domain entities should be pure C# classes. If Domain depended on EF Core, you couldn't run domain logic without the full EF stack. If it depended on MediatR, changing the messaging library would require modifying your business rules.

### Application Layer

```bash
cd src/EBookLibrary.Application

dotnet add package MediatR                           # CQRS dispatcher
dotnet add package FluentValidation.DependencyInjectionExtensions  # Validation
dotnet add package AutoMapper                        # Object-to-object mapping
dotnet add package Microsoft.Extensions.DependencyInjection.Abstractions  # IServiceCollection
dotnet add package Serilog.AspNetCore                # Structured logging (for LoggingBehavior)
```

### Infrastructure Layer

```bash
cd ../EBookLibrary.Infrastructure

dotnet add package Microsoft.EntityFrameworkCore.SqlServer    # EF Core SQL Server provider
dotnet add package Microsoft.EntityFrameworkCore.Tools        # Migrations CLI tooling
dotnet add package BCrypt.Net-Next                            # BCrypt password hashing
dotnet add package Microsoft.IdentityModel.Tokens            # JWT token handling
dotnet add package System.IdentityModel.Tokens.Jwt           # JWT token generation
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer  # JWT middleware
dotnet add package Microsoft.Extensions.Configuration.Abstractions  # IConfiguration
```

### WebApi Layer

```bash
cd ../EBookLibrary.WebApi

dotnet add package MediatR.Extensions.Microsoft.DependencyInjection  # MediatR DI registration
dotnet add package Serilog.AspNetCore               # Serilog web logging
dotnet add package Scalar.AspNetCore                # Scalar OpenAPI UI (replaces Swagger)
dotnet add package Microsoft.AspNetCore.RateLimiting  # Rate limiting middleware
```

### Test Projects

```bash
cd ../../tests/EBookLibrary.Application.Tests

dotnet add package Moq                              # Mocking framework
dotnet add package FluentAssertions                 # Readable test assertions
dotnet add package AutoMapper                       # For testing AutoMapper profiles

cd ../EBookLibrary.WebApi.Tests

dotnet add package Microsoft.AspNetCore.Mvc.Testing      # WebApplicationFactory
dotnet add package Microsoft.EntityFrameworkCore.InMemory # In-memory DB for tests
dotnet add package FluentAssertions

cd ../EBookLibrary.E2E.Tests

dotnet add package Microsoft.Playwright.NUnit       # Playwright browser automation
dotnet add package Microsoft.AspNetCore.Mvc.Testing
```

---

## 2.7 Step 6 — Create Folder Structure

Create the folder skeleton for each project. Empty folders are tracked with `.gitkeep` files:

```bash
# Domain folders
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Common
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Entities
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Enums
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Events
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/Interfaces/Repositories
New-Item -ItemType Directory -Path src/EBookLibrary.Domain/ValueObjects

# Application folders
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Behaviors
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Exceptions
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Interfaces
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Mappings
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Common/Models
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Auth/Commands/LoginUser
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Auth/Commands/RegisterUser
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Auth/DTOs
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Auth/Queries/GetCurrentUser
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Commands/CreateBook
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Commands/UpdateBook
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Commands/DeleteBook
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Commands/DownloadBook
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Commands/UploadBookFile
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/DTOs
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Queries/SearchBooks
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Queries/GetBookById
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Books/Queries/GetBooksPaged
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/Commands/CreateAuthor
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/Commands/UpdateAuthor
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/Commands/DeleteAuthor
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/DTOs
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/Queries/GetAuthorById
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Authors/Queries/GetAuthorsPaged
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Genres/Commands
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Genres/DTOs
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Genres/Queries
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Users/Commands
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Users/DTOs
New-Item -ItemType Directory -Path src/EBookLibrary.Application/Users/Queries

# Infrastructure folders
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Persistence/Configurations
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Persistence/Migrations
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Repositories
New-Item -ItemType Directory -Path src/EBookLibrary.Infrastructure/Services

# WebApi folders
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Controllers
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Extensions
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Filters
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Middleware
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/Models
New-Item -ItemType Directory -Path src/EBookLibrary.WebApi/OpenApi
```

---

## 2.8 Step 7 — First Build Verification

After setting up the structure, verify everything compiles:

```bash
# From the solution root
dotnet build EBookLibrary.sln
```

Expected output:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

At this point, all projects exist, references are configured, and packages are installed. No business logic has been written yet — just scaffolding.

---

## 2.9 Understanding the `.csproj` Files

### What `<Nullable>enable</Nullable>` means

Nullable reference types (enabled via `Directory.Build.props`) means the C# compiler treats `string` as non-nullable. To allow null, you must explicitly write `string?`. This prevents null reference exceptions at compile time:

```csharp
// Without nullable enabled:
string name = null;  // compiles fine, crashes at runtime

// With nullable enabled:
string name = null;     // CS8600 warning — assign null to non-nullable
string? name = null;    // correct — explicitly nullable
```

### What `<ImplicitUsings>enable</ImplicitUsings>` means

Implicit usings automatically include common namespaces so you don't need `using System;` in every file. .NET adds these globally for `classlib` projects:
```csharp
// Automatically included in every file (no need to write these):
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
```

---

## 2.10 Common Setup Pitfalls

| Problem | Symptom | Fix |
|---|---|---|
| Wrong Tailwind version | `tailwind.config.js` format errors | `npm install -D tailwindcss@3` explicitly |
| Missing `--use-controllers` flag | WebApi uses Minimal API template instead of controllers | Delete project, re-create with `--use-controllers` |
| `Directory.Build.props` not in root | `TargetFramework` errors in child projects | Ensure `Directory.Build.props` is at the same level as `.sln` |
| EF Tools not installed | `dotnet ef` not found | `dotnet tool install --global dotnet-ef` |
| Circular project reference | Build error about circular dependency | Check reference direction: always points inward |

---

## 2.11 Checkpoint ✅

Your solution should now:

- [ ] Have `dotnet sln list` show all 10 projects
- [ ] Build with `dotnet build EBookLibrary.sln` — 0 errors
- [ ] Show the correct project reference graph (Application → Domain, not the reverse)
- [ ] Have the React project in `src/EBookLibrary.React/` with `package.json`
- [ ] Have all folder structure created in each project

---

## 2.12 🤖 AI-Assisted Development — Solution Setup

**What Copilot generated well:**
- All `dotnet new` commands were correct on first generation
- `Directory.Build.props` and `global.json` content was accurate
- NuGet package lists per layer were comprehensive

**What required correction:**
- Copilot initially included `Microsoft.EntityFrameworkCore` in the Application project — it should only be in Infrastructure
- The Tailwind version issue (`tailwindcss@3` vs latest v4) is a good example of AI using outdated package information — always verify package versions

> **Tip:** When using Copilot to scaffold a solution, tell it explicitly which packages are forbidden in which layers. Example: *"Domain must have zero NuGet packages. Application must not reference EF Core or any data access packages."*

---

## Further Reading

- [docs/01-SOLUTION-SETUP.md](../docs/01-SOLUTION-SETUP.md) — Original solution setup prompt document
- .NET CLI documentation: https://docs.microsoft.com/dotnet/core/tools/
- MSBuild Directory.Build.props: https://docs.microsoft.com/visualstudio/msbuild/customize-by-directory

---

**← Previous:** [01 — Architecture Deep Dive](01-ARCHITECTURE-DEEP-DIVE.md)  
**Next →** [03 — Domain Layer](03-DOMAIN-LAYER.md)
