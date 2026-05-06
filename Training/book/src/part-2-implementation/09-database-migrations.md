# Chapter 9 — Database and Migrations

> *"The schema is a contract that outlives the code that wrote it."*

---

## What you will learn

- How EF Core migrations turn `DbContext` changes into versioned SQL
  scripts.
- How to read the schema EF Core generates and verify it against
  what you expected.
- How the two-pass seeder ingests 51,599 books from real HTML export
  files without exhausting memory.
- How to seed an admin user once at application startup.
- The migration management commands you will use weekly: `add`,
  `remove`, `script`, `update`, `list`.
- The five most common migration problems and their fixes.

---

## 9.1 Connection string configuration

Connection strings are not committed. Local development uses .NET's
*user-secrets* feature; production uses environment variables. Both
are read by `IConfiguration` exactly the same way.

**Listing 9.1 — Adding the local connection string.**

```powershell
# From src/EBookLibrary.WebApi/
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" `
    "Server=(localdb)\MSSQLLocalDB;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
```

`appsettings.json` carries the *non-secret* defaults
(logging configuration, JWT issuer/audience, file storage paths) and
explicitly omits the connection string and the JWT secret.

> **Pitfall:** The `MultipleActiveResultSets=True` parameter is *not*
> optional in this project. Several handlers use `await foreach` over
> one query while issuing a second query to a related table; without
> MARS, the second query throws *"There is already an open
> DataReader…"*. The fix is the connection string. The error is
> obscure if you do not know to look for it.

---

## 9.2 Creating the first migration

The Domain entities of Chapter 4 plus the EF configurations of
Chapter 6 give EF Core enough information to generate a complete
schema.

**Listing 9.2 — Creating the initial migration.**

```powershell
# From the solution root
dotnet ef migrations add InitialCreate `
    --project src/EBookLibrary.Infrastructure `
    --startup-project src/EBookLibrary.WebApi
```

The `--project` flag names the assembly that contains the
`DbContext`; `--startup-project` names the assembly that contains the
`Program.cs` that registers `AddDbContext`. EF Core compiles the
startup project so it can read the configuration and DI registrations.

The command writes three files to
`src/EBookLibrary.Infrastructure/Persistence/Migrations/`:

- `<timestamp>_InitialCreate.cs` — the migration as C# code (`Up()`
  builds the schema, `Down()` reverts it).
- `<timestamp>_InitialCreate.Designer.cs` — the migration metadata.
- `AppDbContextModelSnapshot.cs` — the cumulative model snapshot used
  to compute the *next* migration's diff.

> **Pitfall:** `AppDbContextModelSnapshot.cs` is *generated*, not
> hand-edited. It is also a frequent merge-conflict victim. When two
> branches each add a migration, both branches modify the snapshot.
> Resolve by accepting *neither* version, deleting the file, then
> re-running `dotnet ef migrations add` on the merged branch with a
> placeholder name and discarding the new migration. The snapshot
> regenerates correctly.

---

## 9.3 Applying the migration

`dotnet ef database update` applies all pending migrations to the
configured connection string.

**Listing 9.3 — Applying migrations.**

```powershell
dotnet ef database update `
    --project src/EBookLibrary.Infrastructure `
    --startup-project src/EBookLibrary.WebApi

# Or, generate the SQL script for review without applying:
dotnet ef migrations script `
    --project src/EBookLibrary.Infrastructure `
    --startup-project src/EBookLibrary.WebApi `
    --output db_v1.sql
```

In production, the script form is preferred: a DBA reviews the SQL
before it runs against the production database. The C# migration
runner is convenient for development; it is not the right tool for
unattended production deploys.

---

## 9.4 The expected schema

After `database update`, the database has seven tables. Listing 9.4
sketches the shape; the live database can be inspected with
`SELECT name FROM sys.tables`.

**Listing 9.4 — Tables produced by `InitialCreate`.**

```text
Books         (Id PK, Title, Isbn, Description, Pages, ...,
               Status nvarchar(20), Language nvarchar(20), CreatedAt, ...)
Authors       (Id PK, Name, Biography, IsDeleted, CreatedAt, ...)
Genres        (Id PK, Name, Description, IsDeleted, CreatedAt, ...)
Users         (Id PK, Email UNIQUE, PasswordHash, FirstName, LastName,
               Role nvarchar(20), IsActive, IsDeleted, CreatedAt, ...)
BookAuthors   (BookId FK, AuthorId FK, PRIMARY KEY (BookId, AuthorId))
BookGenres    (BookId FK, GenreId  FK, PRIMARY KEY (BookId, GenreId))
BookDownloads (Id PK, UserId FK, BookId FK, DownloadedAt)
```

Notice three things in passing.

- **Enums are `nvarchar`.** `Status` and `Language` and `Role` all
  store the string form. The reason is the same as in Chapter 6:
  human-readable, safe to renumber, robust to cross-system reads.
- **Soft-delete columns** (`IsDeleted`, `DeletedAt`) appear on every
  aggregate root. The global query filter from `OnModelCreating` is
  what makes them invisible to normal reads.
- **No foreign-key cascades.** Removing an author through the API is
  a soft delete that updates `IsDeleted = 1`; the join rows in
  `BookAuthors` remain intact and refer to a row the API now hides.

---

## 9.5 The two-pass seeder

The seed corpus is three HTML files (`lista_autor.html`,
`lista_generos.html`, `lista_titulo.html`) parsed into 51,599 books,
about 12,800 distinct authors, and 128 genres. The seeder runs as a
console application:

```powershell
dotnet run --project scripts/EBookLibrary.Seeder
```

The total runtime is 3–5 minutes on typical developer hardware. Two
design decisions make that achievable.

**Decision 1 — Two passes.** Books cannot be inserted before the
authors and genres they reference exist. Pass 1 reads
`lista_generos.html` and `lista_autor.html`, deduplicates by name,
and inserts `Author` and `Genre` rows. Pass 2 reads `lista_titulo.html`,
constructs `Book` rows, and links each to the appropriate authors
and genres via the join entities. This is the pattern for any seeder
with dependency order.

**Decision 2 — Batched saves.** Inserting all 51K books in one
`SaveChangesAsync` call exhausts memory on developer machines (EF
Core's change tracker holds every entity). The seeder calls
`SaveChangesAsync` every 500 books and clears the change tracker
between batches.

**Listing 9.5 — Pass 2 of the seeder (abridged).**

```csharp
const int BatchSize = 500;
var batch = 0;

await foreach (var (title, authorName, genreName) in titles)
{
    var author = authorIndex.GetValueOrDefault(authorName);
    var genre  = genreIndex .GetValueOrDefault(genreName);
    if (author is null || genre is null) continue;

    var book = Book.Create(title, BookLanguage.Spanish);
    db.Books.Add(book);
    db.BookAuthors.Add(BookAuthor.Create(book.Id, author.Id));
    db.BookGenres .Add(BookGenre .Create(book.Id, genre.Id));

    if (++batch >= BatchSize)
    {
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();   // critical — release memory
        batch = 0;
    }
}
await db.SaveChangesAsync();
```

> **Architect's Note:** Bulk insert through `Add` + `SaveChangesAsync`
> is *not* the fastest route — the EF Core change tracker still
> processes every entity. For a 51K-row seed it is fast enough. For
> 5M rows you would reach for `SqlBulkCopy` or `EFCore.BulkExtensions`
> and accept that you have stepped outside the ORM's contract for
> performance. Choose the right tool for the row count.

---

## 9.6 The admin user seed

The seeder creates the first admin user. The credentials are not
random — they are the published defaults `admin@ebooklibrary.dev` /
`Admin#2026!`. **They must be changed on first deploy.**

**Listing 9.6 — Admin user seed (idempotent).**

```csharp
public async Task SeedAdminUserAsync(CancellationToken ct = default)
{
    const string email = "admin@ebooklibrary.dev";
    var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
    if (existing is not null) return;     // idempotent

    var hash = _hasher.Hash("Admin#2026!");
    var admin = User.Create(email, hash);
    admin.UpdateRole(UserRole.Admin);
    await _db.Users.AddAsync(admin, ct);
    await _db.SaveChangesAsync(ct);
}
```

The method is safe to run multiple times: if the row already exists,
it does nothing. The Web API calls it from `Program.cs` at startup so
that a fresh database is always usable from the first request.

> **Pitfall:** Default credentials in source code are convenient for
> development and dangerous in production. Production builds should
> require admin credentials in environment variables and refuse to
> start without them. Add the check before the application is
> internet-reachable, not after.

---

## 9.7 Migration management cheat sheet

**Table 9.1 — The five EF Core migration commands you will use weekly.**

| Goal                                          | Command                                                                                  |
|-----------------------------------------------|------------------------------------------------------------------------------------------|
| Add a new migration                           | `dotnet ef migrations add <Name> --project … --startup-project …`                        |
| Remove the most recent (un-applied) migration | `dotnet ef migrations remove --project … --startup-project …`                            |
| List all migrations and their applied status  | `dotnet ef migrations list --project … --startup-project …`                              |
| Apply pending migrations                      | `dotnet ef database update --project … --startup-project …`                              |
| Generate the SQL script (for review/deploy)   | `dotnet ef migrations script <from> <to> --output v.sql --project … --startup-project …` |

The `<from> <to>` pair on `script` gives you an *idempotent* SQL file
that takes a database from one named migration to another. This is
the form to hand a DBA.

---

## 9.8 The five most common migration problems

**Table 9.2 — Migration troubleshooting.**

| Symptom                                                           | Cause                                                                       | Fix                                                                                |
|-------------------------------------------------------------------|-----------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `The model for context 'AppDbContext' has pending changes.`       | A code change was made without adding a migration.                          | `dotnet ef migrations add <Name>` then `database update`.                          |
| `Cannot create more than one clustered index on table.`           | Composite primary key declared twice.                                       | One of two `HasKey` calls — keep one, delete the other.                            |
| `There is already an open DataReader.`                            | Connection string missing `MultipleActiveResultSets=True`.                  | Add it to the connection string.                                                   |
| Merge conflict in `AppDbContextModelSnapshot.cs`.                 | Two branches each added a migration; the snapshot diverged.                 | Re-generate (see Pitfall in § 9.2).                                                |
| Adding a non-nullable column to an existing table fails.          | Existing rows have no default value.                                        | Provide `defaultValue:` in the migration's `AddColumn` call, or seed before adding.|

---

## 9.9 Verification queries

After applying migrations and running the seeder, the following
queries verify the database is in the expected state.

**Listing 9.7 — Sanity-check queries.**

```sql
SELECT COUNT(*) AS BookCount   FROM Books;          -- expect ~51,599
SELECT COUNT(*) AS AuthorCount FROM Authors;        -- expect ~12,800
SELECT COUNT(*) AS GenreCount  FROM Genres;         -- expect 128

-- Spot-check a join:
SELECT TOP 5 b.Title, a.Name AS Author, g.Name AS Genre
FROM Books b
JOIN BookAuthors ba ON ba.BookId = b.Id
JOIN Authors     a  ON a.Id      = ba.AuthorId
JOIN BookGenres  bg ON bg.BookId = b.Id
JOIN Genres      g  ON g.Id      = bg.GenreId
ORDER BY NEWID();
```

If those numbers are within 5% of the expected values and the random
five rows look like real Spanish-language books, the seed worked.

---

## 9.10 Checkpoint

You are ready for Chapter 10 when:

- [ ] `dotnet ef database update` succeeds against your local SQL
      Server.
- [ ] The seeder finishes in 3–5 minutes with no errors.
- [ ] The verification queries in Listing 9.7 return the expected
      counts.
- [ ] `POST /api/auth/login` with `admin@ebooklibrary.dev` /
      `Admin#2026!` returns a JWT whose `role` claim says `Admin`.
- [ ] `GET /api/books/search?title=cervantes` returns a non-empty
      page of results.

---

## Key takeaways

- Migrations are version control for the database. Generate them with
  `dotnet ef migrations add`; review them like code; apply them with
  `database update` in dev and with reviewed SQL in production.
- `MultipleActiveResultSets=True` is not optional for this project.
- Two-pass seeding (parents then children) and batched
  `SaveChangesAsync` calls are the patterns that make a 51K-row
  ingestion practical.
- The admin user seed is idempotent and uses default credentials that
  must be changed in production. Build the check-on-startup that
  enforces the change.
- The model snapshot file (`AppDbContextModelSnapshot.cs`) is a
  frequent merge-conflict victim. Resolve by regenerating, never by
  hand-editing.

---

## Exercises

**Easy.** Add a non-nullable `IsFeatured bool` column to `Books`
defaulting to `false`. Generate the migration and verify it includes
`defaultValue: false`. (Without the default, the migration would fail
on the existing 51K rows.)

**Medium.** Write a *down migration* manually for the migration you
added in the previous exercise — that is, fill in the `Down()` method
to drop the `IsFeatured` column. Verify by running
`dotnet ef database update <previous-migration>` and inspecting the
schema.

**Hard.** The seeder currently parses HTML files. Extend it to also
accept a JSON file (one book per line, schema your choice). The
exercise is to factor `IBookSource` so the seeder can be invoked with
either source without duplicating the persistence logic. Write a
unit test for `IBookSource` that does not touch the database.

---

## Further reading

- Microsoft, *EF Core migrations*.
  <https://docs.microsoft.com/ef/core/managing-schemas/migrations/>
- Jon Smith, *Entity Framework Core in Action*, 2nd ed. — Chapter 9 on
  migrations and Chapter 14 on bulk loading.
- Andrew Lock, *"Running async tasks on app startup in ASP.NET Core"* —
  the pattern used by the admin-user seed.
- `EFCore.BulkExtensions` documentation — when seeding crosses the
  half-million-row threshold.
