---
applyTo: "**/Migrations/**, **/AppDbContext*"
---

# Database migrations & DbContext

EF Core 10, Code First, SQL Server provider.

## Generating a migration

```powershell
dotnet ef migrations add <DescriptiveName> `
    --project   Automatic/EBookLibrary/src/EBookLibrary.Infrastructure `
    --startup-project Automatic/EBookLibrary/src/EBookLibrary.WebApi `
    --output-dir Persistence/Migrations
```

Migration name convention: `PascalCase`, action-first
(`AddIsbnToBook`, `RenameUserNameToFirstName`, `IndexBookTitle`).

## Applying a migration

```powershell
dotnet ef database update `
    --project   Automatic/EBookLibrary/src/EBookLibrary.Infrastructure `
    --startup-project Automatic/EBookLibrary/src/EBookLibrary.WebApi
```

## Rules

- **Never edit a committed migration.** Once it has been pushed, it is
  someone else's history. Add a new migration that performs the corrective
  change.
- **Never delete a migration** that has been applied to a shared environment.
- One logical change per migration — keep them small and named for what they do.
- Review the generated SQL (`dotnet ef migrations script <From> <To>`) before
  applying to anything other than your own dev DB.
- After adding a column with a NOT NULL constraint, supply a default in the
  migration's `Up` so existing rows don't break the apply.

## DbContext

- `OnModelCreating` applies all `IEntityTypeConfiguration<T>` from the same
  assembly via `modelBuilder.ApplyConfigurationsFromAssembly(...)`.
- Global query filter for soft delete: `entity.HasQueryFilter(e => !e.IsDeleted)`
  is set in `BaseEntityConfiguration<T>` (or equivalent shared base) — do not
  duplicate it per entity.
- To opt out of the filter for a query, use `.IgnoreQueryFilters()` deliberately.
- Auditing fields (`CreatedAt`, `UpdatedAt`) are populated in
  `SaveChangesAsync` interceptor — do not set them by hand.

## Connection string

Lives in `WebApi/appsettings.json` under `ConnectionStrings:DefaultConnection`.
For local dev, the default uses `Trusted_Connection=True`. For other
environments, override via env var `ConnectionStrings__DefaultConnection`.
