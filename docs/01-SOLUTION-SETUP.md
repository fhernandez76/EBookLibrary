# Component 01 — Solution Setup & Project Structure

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to scaffold the complete solution structure for the EBook Library application.
> **Session goal:** Generate all project files, solution configuration, and NuGet packages listed here. Do NOT write business logic — only scaffolding.

---

## Context

You are setting up the solution scaffolding for **EBook Library**, a full-stack web application built with:
- Clean Architecture (Domain → Application → Infrastructure → WebApi)
- CQRS pattern using MediatR
- .NET 10 / C# 14
- ASP.NET Core 10 Web API (controller-based, NOT minimal APIs)
- Entity Framework Core 10 with SQL Server 2022
- JWT Bearer authentication
- React 18 + TypeScript (primary frontend)
- Blazor WebAssembly (secondary frontend)
- xUnit for unit tests

---

## Task 1 — Create Solution and Projects

### 1.1 Run CLI commands to create the solution

```bash
# Root solution
mkdir EBookLibrary
cd EBookLibrary
dotnet new sln -n EBookLibrary

# Source projects
dotnet new classlib -n EBookLibrary.Domain          -f net10.0 -o src/EBookLibrary.Domain
dotnet new classlib -n EBookLibrary.Application     -f net10.0 -o src/EBookLibrary.Application
dotnet new classlib -n EBookLibrary.Infrastructure  -f net10.0 -o src/EBookLibrary.Infrastructure
dotnet new webapi   -n EBookLibrary.WebApi          -f net10.0 -o src/EBookLibrary.WebApi --use-controllers

# Frontend projects
dotnet new blazorwasm -n EBookLibrary.Blazor -f net10.0 -o src/EBookLibrary.Blazor

# Test projects
dotnet new xunit -n EBookLibrary.Domain.Tests      -f net10.0 -o tests/EBookLibrary.Domain.Tests
dotnet new xunit -n EBookLibrary.Application.Tests -f net10.0 -o tests/EBookLibrary.Application.Tests
dotnet new xunit -n EBookLibrary.WebApi.Tests      -f net10.0 -o tests/EBookLibrary.WebApi.Tests

# Add all projects to solution
dotnet sln add src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet sln add src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet sln add src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj
dotnet sln add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
dotnet sln add src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj
dotnet sln add tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj
dotnet sln add tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj
dotnet sln add tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj
```

### 1.2 React Frontend (Vite + TypeScript)

```bash
# From the EBookLibrary root
cd src
npm create vite@latest EBookLibrary.React -- --template react-ts
cd EBookLibrary.React
npm install
npm install react-router-dom axios @tanstack/react-query zustand
npm install i18next react-i18next i18next-browser-languagedetector
npm install tailwindcss @tailwindcss/typography postcss autoprefixer
npm install @headlessui/react @heroicons/react
npm install react-hook-form @hookform/resolvers zod
npm install -D @types/node
npx tailwindcss init -p
```

---

## Task 2 — Configure Project References

### 2.1 Add project references (dependency graph)

```bash
# Application → Domain
dotnet add src/EBookLibrary.Application/EBookLibrary.Application.csproj reference \
  src/EBookLibrary.Domain/EBookLibrary.Domain.csproj

# Infrastructure → Application (implements interfaces)
dotnet add src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj reference \
  src/EBookLibrary.Application/EBookLibrary.Application.csproj

# WebApi → Application (sends commands/queries)
dotnet add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj reference \
  src/EBookLibrary.Application/EBookLibrary.Application.csproj

# WebApi → Infrastructure (registers DI)
dotnet add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj reference \
  src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj

# Test projects
dotnet add tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj reference \
  src/EBookLibrary.Domain/EBookLibrary.Domain.csproj

dotnet add tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj reference \
  src/EBookLibrary.Application/EBookLibrary.Application.csproj

dotnet add tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj reference \
  src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj
```

---

## Task 3 — Install NuGet Packages

### 3.1 Domain project — NO external dependencies
The Domain project must remain pure. **Do not add any NuGet packages.**

Remove the default `Class1.cs` placeholder from all class library projects.

### 3.2 Application project

```bash
cd src/EBookLibrary.Application
dotnet add package MediatR --version 12.*
dotnet add package FluentValidation --version 11.*
dotnet add package FluentValidation.DependencyInjectionExtensions --version 11.*
dotnet add package AutoMapper --version 13.*
dotnet add package Microsoft.Extensions.DependencyInjection.Abstractions
dotnet add package Microsoft.Extensions.Logging.Abstractions
```

### 3.3 Infrastructure project

```bash
cd src/EBookLibrary.Infrastructure
dotnet add package Microsoft.EntityFrameworkCore --version 8.*
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.*
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.*
dotnet add package BCrypt.Net-Next --version 4.*
dotnet add package Microsoft.Extensions.Configuration.Abstractions
dotnet add package Microsoft.Extensions.Options
dotnet add package System.IdentityModel.Tokens.Jwt --version 7.*
dotnet add package Microsoft.IdentityModel.Tokens --version 7.*
```

### 3.4 WebApi project

```bash
cd src/EBookLibrary.WebApi
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 10.*
dotnet add package Microsoft.AspNetCore.OpenApi --version 10.*
dotnet add package Scalar.AspNetCore --version 2.*
dotnet add package Microsoft.EntityFrameworkCore.Design --version 10.*
```

### 3.5 Test projects

```bash
# Application Tests
cd tests/EBookLibrary.Application.Tests
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Moq --version 4.*
dotnet add package FluentAssertions --version 6.*
dotnet add package Microsoft.EntityFrameworkCore.InMemory --version 8.*
dotnet add package Microsoft.NET.Test.Sdk

# WebApi Tests
cd tests/EBookLibrary.WebApi.Tests
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Moq
dotnet add package FluentAssertions
dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 8.*
dotnet add package Microsoft.NET.Test.Sdk
```

---

## Task 4 — Create Folder Structure

### 4.1 Domain project folders

Create the following empty folders with `.gitkeep` files:

```
src/EBookLibrary.Domain/
├── Common/                    ← BaseEntity, IAuditableEntity
├── Entities/                  ← Book, Author, Genre, User, BookDownload
├── ValueObjects/              ← Email, FilePath
├── Enums/                     ← UserRole, Language, BookStatus
├── Events/                    ← IDomainEvent, domain event classes
└── Interfaces/
    └── Repositories/          ← IRepository<T>, IBookRepository, etc.
```

### 4.2 Application project folders

```
src/EBookLibrary.Application/
├── Common/
│   ├── Behaviors/             ← ValidationBehavior, LoggingBehavior, TransactionBehavior
│   ├── Exceptions/            ← NotFoundException, ValidationException, ForbiddenException
│   ├── Interfaces/            ← IJwtTokenService, IPasswordHashService, IFileStorageService, ICurrentUserService
│   ├── Mappings/              ← MappingProfile.cs (AutoMapper)
│   └── Models/                ← Result<T>, PagedResult<T>, PagedQuery
├── Auth/
│   ├── Commands/
│   │   ├── RegisterUser/      ← RegisterUserCommand.cs, RegisterUserCommandHandler.cs, RegisterUserCommandValidator.cs
│   │   └── LoginUser/         ← LoginUserCommand.cs, LoginUserCommandHandler.cs, LoginUserCommandValidator.cs
│   ├── Queries/
│   │   └── GetCurrentUser/    ← GetCurrentUserQuery.cs, GetCurrentUserQueryHandler.cs
│   └── DTOs/                  ← AuthResponseDto.cs, UserProfileDto.cs
├── Books/
│   ├── Commands/
│   │   ├── CreateBook/
│   │   ├── UpdateBook/
│   │   ├── DeleteBook/
│   │   ├── DownloadBook/
│   │   └── UploadBookFile/
│   ├── Queries/
│   │   ├── GetBookById/
│   │   ├── GetBooksPaged/
│   │   └── SearchBooks/
│   └── DTOs/                  ← BookDto.cs, BookDetailDto.cs, BookSearchResultDto.cs, BookSearchFilterDto.cs
├── Authors/
│   ├── Commands/
│   │   ├── CreateAuthor/
│   │   ├── UpdateAuthor/
│   │   └── DeleteAuthor/
│   ├── Queries/
│   │   ├── GetAuthorById/
│   │   └── GetAuthorsPaged/
│   └── DTOs/                  ← AuthorDto.cs
├── Genres/
│   ├── Commands/
│   │   ├── CreateGenre/
│   │   ├── UpdateGenre/
│   │   └── DeleteGenre/
│   ├── Queries/
│   │   ├── GetGenreById/
│   │   └── GetAllGenres/
│   └── DTOs/                  ← GenreDto.cs
└── Users/
    ├── Commands/
    │   └── UpdateUserRole/
    ├── Queries/
    │   └── GetUsersPaged/
    └── DTOs/                  ← UserDto.cs
```

### 4.3 Infrastructure project folders

```
src/EBookLibrary.Infrastructure/
├── Persistence/
│   ├── AppDbContext.cs
│   ├── Configurations/        ← BookConfiguration, AuthorConfiguration, etc.
│   └── Migrations/            ← (auto-generated by EF Core)
├── Repositories/
│   ├── GenericRepository.cs
│   ├── BookRepository.cs
│   ├── AuthorRepository.cs
│   ├── GenreRepository.cs
│   ├── UserRepository.cs
│   └── BookDownloadRepository.cs
├── Services/
│   ├── JwtTokenService.cs
│   ├── PasswordHashService.cs
│   ├── FileStorageService.cs
│   └── CurrentUserService.cs
└── DependencyInjection.cs
```

### 4.4 WebApi project folders

```
src/EBookLibrary.WebApi/
├── Controllers/
│   ├── AuthController.cs
│   ├── BooksController.cs
│   ├── AuthorsController.cs
│   ├── GenresController.cs
│   ├── UsersController.cs
│   └── FilesController.cs
├── Middleware/
│   ├── ExceptionHandlingMiddleware.cs
│   └── RequestLoggingMiddleware.cs
├── Filters/
│   └── ValidateModelFilter.cs
├── Extensions/
│   ├── ServiceCollectionExtensions.cs
│   └── ApplicationBuilderExtensions.cs
└── Program.cs
```

---

## Task 5 — Solution-Level Files

### 5.1 Create `.gitignore`

```gitignore
## .NET
bin/
obj/
*.user
*.suo
.vs/
*.swp
*.DS_Store
launchSettings.json

## Node
node_modules/
dist/
.env
.env.local
.env.*.local
npm-debug.log*

## EF Core
*.pfx

## Secrets
appsettings.Development.json
secrets.json
```

### 5.2 Create `global.json`

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestMinor"
  }
}
```

### 5.3 Create `Directory.Build.props`

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
    <LangVersion>14</LangVersion>
    <RootNamespace>EBookLibrary</RootNamespace>
  </PropertyGroup>
</Project>
```

### 5.4 Create `appsettings.json` in WebApi

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
  },
  "JwtSettings": {
    "SecretKey": "REPLACE_WITH_64_CHARACTER_MINIMUM_SECRET_KEY_IN_PRODUCTION",
    "Issuer": "EBookLibrary",
    "Audience": "EBookLibraryUsers",
    "ExpiryInMinutes": 60
  },
  "FileStorageSettings": {
    "BasePath": "C:\\EBookLibrary\\Books",
    "AllowedExtensions": [".epub"]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    }
  },
  "AllowedHosts": "*",
  "AllowedOrigins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://localhost:7001"
  ]
}
```

---

## Task 6 — Verify Build

After completing all tasks above, run:

```bash
cd EBookLibrary
dotnet build
```

Expected output: `Build succeeded. 0 Error(s)`

If there are compilation errors, they will only be about missing `Class1.cs` files, which should be deleted from all class library projects.

---

## Deliverables Checklist

- [ ] Solution file `EBookLibrary.sln` created
- [ ] 5 source projects created (Domain, Application, Infrastructure, WebApi, Blazor)
- [ ] 3 test projects created
- [ ] React project created with Vite
- [ ] All project references configured correctly
- [ ] All NuGet packages installed
- [ ] Folder structure created for all projects
- [ ] `appsettings.json` configured
- [ ] `Directory.Build.props` created
- [ ] `global.json` created
- [ ] `.gitignore` created
- [ ] `dotnet build` succeeds with 0 errors

---

*Component 01 of 10 — EBook Library Project*
