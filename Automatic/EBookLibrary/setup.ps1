$ErrorActionPreference = "Continue"
$base = "c:\Copilot CLI\EBook Web Api Project\Automatic\EBookLibrary"
Set-Location $base

Write-Host "`n=== STEP 1: Check existing solution ===" -ForegroundColor Cyan
dotnet sln EBookLibrary.sln list

Write-Host "`n=== STEP 2: Add missing projects to solution ===" -ForegroundColor Cyan
$projects = @(
    "src/EBookLibrary.Domain/EBookLibrary.Domain.csproj",
    "src/EBookLibrary.Application/EBookLibrary.Application.csproj",
    "src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj",
    "src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj",
    "src/EBookLibrary.Blazor/EBookLibrary.Blazor.csproj",
    "tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj",
    "tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj",
    "tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj"
)
foreach ($p in $projects) {
    dotnet sln EBookLibrary.sln add $p 2>&1 | Write-Host
}

Write-Host "`n=== STEP 3: Project references ===" -ForegroundColor Cyan
dotnet add src/EBookLibrary.Application/EBookLibrary.Application.csproj reference src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet add src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj reference src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj reference src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet add src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj reference src/EBookLibrary.Infrastructure/EBookLibrary.Infrastructure.csproj
dotnet add tests/EBookLibrary.Domain.Tests/EBookLibrary.Domain.Tests.csproj reference src/EBookLibrary.Domain/EBookLibrary.Domain.csproj
dotnet add tests/EBookLibrary.Application.Tests/EBookLibrary.Application.Tests.csproj reference src/EBookLibrary.Application/EBookLibrary.Application.csproj
dotnet add tests/EBookLibrary.WebApi.Tests/EBookLibrary.WebApi.Tests.csproj reference src/EBookLibrary.WebApi/EBookLibrary.WebApi.csproj

Write-Host "`n=== STEP 4: NuGet packages ===" -ForegroundColor Cyan

# Application packages
Set-Location "$base/src/EBookLibrary.Application"
dotnet add package MediatR --version 12.*
dotnet add package FluentValidation --version 11.*
dotnet add package FluentValidation.DependencyInjectionExtensions --version 11.*
dotnet add package AutoMapper --version 13.*
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection --version 13.*
dotnet add package Microsoft.Extensions.DependencyInjection.Abstractions
dotnet add package Microsoft.Extensions.Logging.Abstractions

# Infrastructure packages
Set-Location "$base/src/EBookLibrary.Infrastructure"
dotnet add package Microsoft.EntityFrameworkCore --version 8.*
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.*
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.*
dotnet add package BCrypt.Net-Next --version 4.*
dotnet add package Microsoft.Extensions.Configuration.Abstractions
dotnet add package Microsoft.Extensions.Options
dotnet add package System.IdentityModel.Tokens.Jwt --version 7.*
dotnet add package Microsoft.IdentityModel.Tokens --version 7.*

# WebApi packages
Set-Location "$base/src/EBookLibrary.WebApi"
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.*
dotnet add package Swashbuckle.AspNetCore --version 6.*
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.*

# Application.Tests packages
Set-Location "$base/tests/EBookLibrary.Application.Tests"
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Moq --version 4.*
dotnet add package FluentAssertions --version 6.*
dotnet add package Microsoft.EntityFrameworkCore.InMemory --version 8.*
dotnet add package Microsoft.NET.Test.Sdk

# WebApi.Tests packages
Set-Location "$base/tests/EBookLibrary.WebApi.Tests"
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package Moq
dotnet add package FluentAssertions
dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 8.*
dotnet add package Microsoft.NET.Test.Sdk

Write-Host "`n=== STEP 5: Remove Class1.cs placeholders ===" -ForegroundColor Cyan
Set-Location $base
Remove-Item "src/EBookLibrary.Domain/Class1.cs" -ErrorAction SilentlyContinue
Remove-Item "src/EBookLibrary.Application/Class1.cs" -ErrorAction SilentlyContinue
Remove-Item "src/EBookLibrary.Infrastructure/Class1.cs" -ErrorAction SilentlyContinue

Write-Host "`n=== STEP 6: Create folder structures ===" -ForegroundColor Cyan

$folders = @(
    # Domain
    "src/EBookLibrary.Domain/Common",
    "src/EBookLibrary.Domain/Entities",
    "src/EBookLibrary.Domain/ValueObjects",
    "src/EBookLibrary.Domain/Enums",
    "src/EBookLibrary.Domain/Events",
    "src/EBookLibrary.Domain/Interfaces/Repositories",
    # Application
    "src/EBookLibrary.Application/Common/Behaviors",
    "src/EBookLibrary.Application/Common/Exceptions",
    "src/EBookLibrary.Application/Common/Interfaces",
    "src/EBookLibrary.Application/Common/Mappings",
    "src/EBookLibrary.Application/Common/Models",
    "src/EBookLibrary.Application/Auth/Commands/RegisterUser",
    "src/EBookLibrary.Application/Auth/Commands/LoginUser",
    "src/EBookLibrary.Application/Auth/Queries/GetCurrentUser",
    "src/EBookLibrary.Application/Auth/DTOs",
    "src/EBookLibrary.Application/Books/Commands/CreateBook",
    "src/EBookLibrary.Application/Books/Commands/UpdateBook",
    "src/EBookLibrary.Application/Books/Commands/DeleteBook",
    "src/EBookLibrary.Application/Books/Commands/DownloadBook",
    "src/EBookLibrary.Application/Books/Commands/UploadBookFile",
    "src/EBookLibrary.Application/Books/Queries/GetBookById",
    "src/EBookLibrary.Application/Books/Queries/GetBooksPaged",
    "src/EBookLibrary.Application/Books/Queries/SearchBooks",
    "src/EBookLibrary.Application/Books/DTOs",
    "src/EBookLibrary.Application/Authors/Commands/CreateAuthor",
    "src/EBookLibrary.Application/Authors/Commands/UpdateAuthor",
    "src/EBookLibrary.Application/Authors/Commands/DeleteAuthor",
    "src/EBookLibrary.Application/Authors/Queries/GetAuthorById",
    "src/EBookLibrary.Application/Authors/Queries/GetAuthorsPaged",
    "src/EBookLibrary.Application/Authors/DTOs",
    "src/EBookLibrary.Application/Genres/Commands/CreateGenre",
    "src/EBookLibrary.Application/Genres/Commands/UpdateGenre",
    "src/EBookLibrary.Application/Genres/Commands/DeleteGenre",
    "src/EBookLibrary.Application/Genres/Queries/GetGenreById",
    "src/EBookLibrary.Application/Genres/Queries/GetAllGenres",
    "src/EBookLibrary.Application/Genres/DTOs",
    "src/EBookLibrary.Application/Users/Commands/UpdateUserRole",
    "src/EBookLibrary.Application/Users/Queries/GetUsersPaged",
    "src/EBookLibrary.Application/Users/DTOs",
    # Infrastructure
    "src/EBookLibrary.Infrastructure/Persistence/Configurations",
    "src/EBookLibrary.Infrastructure/Persistence/Migrations",
    "src/EBookLibrary.Infrastructure/Repositories",
    "src/EBookLibrary.Infrastructure/Services",
    # WebApi
    "src/EBookLibrary.WebApi/Controllers",
    "src/EBookLibrary.WebApi/Middleware",
    "src/EBookLibrary.WebApi/Filters",
    "src/EBookLibrary.WebApi/Extensions"
)

foreach ($folder in $folders) {
    $path = Join-Path $base $folder
    New-Item -ItemType Directory -Force -Path $path | Out-Null
    New-Item -ItemType File -Force -Path (Join-Path $path ".gitkeep") | Out-Null
}
Write-Host "Folder structure created." -ForegroundColor Green

Write-Host "`n=== STEP 7: Solution-level files ===" -ForegroundColor Cyan
# global.json
@'
{
  "sdk": {
    "version": "8.0.0",
    "rollForward": "latestMinor"
  }
}
'@ | Set-Content -Path "$base/global.json" -Encoding utf8

# Directory.Build.props
@'
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
    <LangVersion>12</LangVersion>
    <RootNamespace>EBookLibrary</RootNamespace>
  </PropertyGroup>
</Project>
'@ | Set-Content -Path "$base/Directory.Build.props" -Encoding utf8

# .gitignore
@'
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
'@ | Set-Content -Path "$base/.gitignore" -Encoding utf8

# appsettings.json
@'
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
'@ | Set-Content -Path "$base/src/EBookLibrary.WebApi/appsettings.json" -Encoding utf8

Write-Host "Solution-level files created." -ForegroundColor Green

Write-Host "`n=== STEP 8: dotnet build ===" -ForegroundColor Cyan
Set-Location $base
dotnet build --no-incremental 2>&1

Write-Host "`n=== DONE ===" -ForegroundColor Green
