---
applyTo: "**/EBookLibrary.Infrastructure/**"
---

# Infrastructure layer

Concrete implementations of Application interfaces. References
`EBookLibrary.Application` and `EBookLibrary.Domain`.

## Components

- `Persistence/AppDbContext.cs` — DbContext, `OnModelCreating` configures
  global soft-delete query filter and applies `IEntityTypeConfiguration<T>`
  classes from the same folder.
- `Persistence/Repositories/` — one repository per aggregate, implementing the
  Application interface.
- `Persistence/UnitOfWork.cs` — wraps `SaveChangesAsync`, exposes repositories.
- `Auth/JwtService.cs` — generates and validates JWT (HS256, claims include
  `sub`, `email`, `ClaimTypes.Role`).
- `Auth/PasswordHashService.cs` — BCrypt with **work factor 12**.
- `Storage/FileStorageService.cs` — saves/reads `.epub` files under the
  configured `FileStorageSettings.BasePath`. **Always validate paths** to
  prevent traversal (`Path.GetFullPath` check against base).
- `DataSeeder.cs` — idempotent seed of admin user + catalogue.

## Migrations

- Generated via `dotnet ef migrations add <Name>` from the solution root.
- Live in `Persistence/Migrations/`.
- **Never edit a committed migration.** If wrong, add a new corrective
  migration. Squashing only allowed on a clean main with team agreement.

## EF Core conventions

- Use `IEntityTypeConfiguration<T>` per entity, not Fluent API in `OnModelCreating`.
- Money / decimal columns: `HasColumnType("decimal(18,2)")`.
- Strings: explicit `HasMaxLength(...)`.
- Indexes: `HasIndex(...)` for any FK or queried-by column.
- Relationships: declare both navigation and FK property; configure cascade
  explicitly (`OnDelete(DeleteBehavior.Restrict)` is the default we prefer).

## DI registration

`DependencyInjection.AddInfrastructure(IServiceCollection, IConfiguration)`
is the **only** public entry point. WebApi calls it once in `Program.cs`.
Add new services there in the appropriate `Add...` partial method.
