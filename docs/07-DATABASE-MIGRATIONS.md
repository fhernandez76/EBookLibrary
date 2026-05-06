# Component 07 — Database Setup & EF Core Migrations

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to set up the SQL Server database, run EF Core migrations, and seed the initial book catalog from the HTML export files.
> **Session goal:** Create a fully populated development database with schema migrations, seed data scripts, and data import tooling.
> **Prerequisites:** Components 02–05 must be complete. SQL Server 2022 must be installed.

---

## Context

- **Database:** MS SQL Server 2022 Developer Edition (localhost)
- **ORM:** Entity Framework Core 10 with Code-First migrations
- **DB-agnostic design:** `UseSqlServer()` can be swapped for `UseNpgsql()` for PostgreSQL
- **Book data source:** Two HTML files (`lista_autor.html` + `lista_generos.html`) containing ~51,599 deduplicated books across 128 normalized genres
- **Migrations location:** `src/EBookLibrary.Infrastructure/Persistence/Migrations/`

---

## Task 1 — Connection String Configuration

### `appsettings.json` in WebApi project

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True"
  }
}
```

### Alternative connection strings

```json
{
  "ConnectionStrings": {
    "DefaultConnection_SQL_Auth": "Server=localhost;Database=EBookLibraryDb;User Id=sa;Password=@Omnitracs601;TrustServerCertificate=True;",
    "DefaultConnection_PostgreSQL": "Host=localhost;Database=ebooklibrary;Username=postgres;Password=@Omnitracs601;"
  }
}
```

---

## Task 2 — EF Core Migrations

### 2.1 Install EF Core tools (if not already done)

```bash
dotnet tool install --global dotnet-ef
# or update
dotnet tool update --global dotnet-ef
```

### 2.2 Create the initial migration

Run from the **solution root** (EBookLibrary/):

```bash
dotnet ef migrations add InitialCreate \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi \
  --output-dir Persistence/Migrations
```

This generates three files in `Persistence/Migrations/`:
- `YYYYMMDDHHMMSS_InitialCreate.cs` — migration code
- `YYYYMMDDHHMMSS_InitialCreate.Designer.cs` — model snapshot info
- `AppDbContextModelSnapshot.cs` — current model state

### 2.3 Apply migrations to the database

```bash
# Apply to default database (Development)
dotnet ef database update \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi
```

### 2.4 Verify the schema in SSMS

Expected tables after migration:
```
dbo.Authors
dbo.Books
dbo.BookAuthors
dbo.BookGenres
dbo.BookDownloads
dbo.Genres
dbo.Users
dbo.__EFMigrationsHistory
```

---

## Task 3 — Expected Database Schema

### Tables and key columns

```sql
-- Authors
CREATE TABLE Authors (
    Id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    Name       NVARCHAR(300) NOT NULL,
    Biography  NVARCHAR(2000) NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt  DATETIME2 NULL,
    IsDeleted  BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Authors_Name ON Authors (Name) WHERE IsDeleted = 0;

-- Genres
CREATE TABLE Genres (
    Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    CreatedAt   DATETIME2 NOT NULL,
    UpdatedAt   DATETIME2 NULL,
    IsDeleted   BIT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX UX_Genres_Name ON Genres (Name) WHERE IsDeleted = 0;

-- Books
CREATE TABLE Books (
    Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Title           NVARCHAR(500) NOT NULL,
    Pages           INT NOT NULL,
    PublicationYear INT NULL,
    Isbn            NVARCHAR(20) NULL,
    Description     NVARCHAR(4000) NULL,
    CoverImagePath  NVARCHAR(1000) NULL,
    FilePath        NVARCHAR(1000) NULL,
    Language        NVARCHAR(20) NOT NULL DEFAULT 'Spanish',
    Status          NVARCHAR(20) NOT NULL DEFAULT 'Unavailable',
    CreatedAt       DATETIME2 NOT NULL,
    UpdatedAt       DATETIME2 NULL,
    IsDeleted       BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Books_Title ON Books (Title) WHERE IsDeleted = 0;
CREATE INDEX IX_Books_Status ON Books (Status);
CREATE UNIQUE INDEX UX_Books_Isbn ON Books (Isbn) WHERE Isbn IS NOT NULL;

-- Users
CREATE TABLE Users (
    Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Email        NVARCHAR(256) NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    FirstName    NVARCHAR(100) NULL,
    LastName     NVARCHAR(100) NULL,
    Role         NVARCHAR(20) NOT NULL DEFAULT 'Regular',
    IsActive     BIT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL,
    UpdatedAt    DATETIME2 NULL,
    IsDeleted    BIT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX UX_Users_Email ON Users (Email) WHERE IsDeleted = 0;

-- BookAuthors (join table)
CREATE TABLE BookAuthors (
    BookId    UNIQUEIDENTIFIER NOT NULL REFERENCES Books(Id) ON DELETE CASCADE,
    AuthorId  UNIQUEIDENTIFIER NOT NULL REFERENCES Authors(Id),
    IsPrimary BIT NOT NULL DEFAULT 1,
    PRIMARY KEY (BookId, AuthorId)
);

-- BookGenres (join table)
CREATE TABLE BookGenres (
    BookId   UNIQUEIDENTIFIER NOT NULL REFERENCES Books(Id) ON DELETE CASCADE,
    GenreId  UNIQUEIDENTIFIER NOT NULL REFERENCES Genres(Id),
    PRIMARY KEY (BookId, GenreId)
);

-- BookDownloads
CREATE TABLE BookDownloads (
    Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId       UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    BookId       UNIQUEIDENTIFIER NOT NULL REFERENCES Books(Id),
    DownloadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IpAddress    NVARCHAR(45) NULL
);
```

---

## Task 4 — Data Seed Script Generator

### EBookLibrary.Seeder — Two-Pass C# Console App

The seeder is a C# console app located at `scripts/EBookLibrary.Seeder/`. It uses a **two-pass strategy** to produce a fully deduplicated, normalized dataset and can optionally execute directly against the SQL Server database.

**NuGet dependency:** `Microsoft.Data.SqlClient 5.*` (for direct DB execution via `SqlBulkCopy`).

**HTML source files:**

| File | Role | Format |
|---|---|---|
| `docs/lista_autor.html` | **Pass 1 — authoritative** | Books sorted by author name; consecutive rows with blank author inherit the previous author |
| `docs/lista_generos.html` | **Pass 2 — genres only** | Books grouped by genre section; cross-referenced against Pass 1 |

**Book line format (both files):**
```
NNNNN | PAGES [•]| AUTHOR | TITLE
```
- `•` (U+2022) before `|` after pages → ePub file is available (`Status = Available`)
- Blank `AUTHOR` column → inherit from the previous row

### Pass 1 — `lista_autor.html` (Books + Authors)

1. Read every data line with the shared regex pattern
2. Track **current author**: when author cell is blank, inherit from the previous row (covers multi-book author groups, e.g. Dan Brown's 6 books)
3. Deduplicate by composite key `(normalizedTitle|normalizedAuthor)` — one `BookRecord` per unique book
4. Build:
   - `Dictionary<string, Guid> authors` — one GUID per unique author name
   - `Dictionary<string, BookRecord> booksByKey` — deduplicated book list
   - `Dictionary<string, List<BookRecord>> booksByTitle` — fallback index for title-only matching

### Pass 2 — `lista_generos.html` (Genres + BookGenre links)

1. Parse genre section headings: `<a name="lNN"></a>GenreName (Count)</b></p>`
2. Apply the **genre normalization map** (≈35 entries) before inserting into the genre dictionary — collapses spelling variants and typos into canonical names (required because `Genres.Name` has a `UNIQUE` constraint)
3. For each book line in a genre section:
   - Try exact match in Pass 1 by `(title|author)` key
   - Fall back to title-only match when author is blank and exactly one candidate exists
   - If no match: create an **orphan** `BookRecord` with `AuthorId = NULL`
4. Add deduplicated `(BookId, GenreId)` pairs to the `BookGenres` list

### Genre Normalization Map (selected examples)

| Source variant | Canonical name |
|---|---|
| `"Ciencia Ficcion"`, `"Ciencia-Ficción"` | `"Ciencia ficción"` |
| `"Erótica"`, `"Erotica"`, `"Erotico"` | `"Erótico"` |
| `"Fantasia"`, `"Fantastico"`, `"Fantástica"` | `"Fantástico"` |
| `"Historico"`, `"Histórica"` | `"Histórico"` |
| `"Intirga"`, `"Intr"` (typos) | `"Intriga"` |
| `"Divulgacion"` | `"Divulgación"` |
| `"Eocnomía"` (typo) | `"Economía"` |

### SQL Output Structure

The generated `seed_data.sql` contains the following sections in order:

```sql
SET NOCOUNT ON;
BEGIN TRANSACTION;

-- ═══ PURGE (FK-safe order) ═══════════════════════════════════════
DELETE FROM BookDownloads;
DELETE FROM BookGenres;
DELETE FROM BookAuthors;
DELETE FROM Books;
DELETE FROM Authors;
DELETE FROM Genres;

-- ═══ GENRES ═══
-- ═══ AUTHORS ══
-- ═══ BOOKS ════
-- ═══ BOOK AUTHORS ═════
-- ═══ BOOK GENRES ══════

COMMIT TRANSACTION;

-- Validation query
SELECT 'Genres'      AS [Table], COUNT(*) AS [Rows] FROM Genres      WHERE IsDeleted = 0
UNION ALL SELECT 'Authors',     COUNT(*) FROM Authors     WHERE IsDeleted = 0
UNION ALL SELECT 'Books',       COUNT(*) FROM Books       WHERE IsDeleted = 0
UNION ALL SELECT 'BookAuthors', COUNT(*) FROM BookAuthors
UNION ALL SELECT 'BookGenres',  COUNT(*) FROM BookGenres;
```

> The DELETE section runs inside the same transaction as all INSERTs, so the operation is atomic.

---

## Task 5 — Run the Seed Data

### Single command (auto-detects HTML files + connection string)

Run from the **solution root** (`Automatic/EBookLibrary/`):

```powershell
# Parses both HTML files, generates seed_data.sql, and auto-executes against the DB
dotnet run --project scripts/EBookLibrary.Seeder
```

The seeder auto-locates:
- `docs/lista_autor.html` (walks up parent directories)
- `docs/lista_generos.html`
- Connection string from `src/EBookLibrary.WebApi/appsettings.json`

### Expected console output

```
[Config] lista_autor   : C:\...\docs\lista_autor.html
[Config] lista_generos : C:\...\docs\lista_generos.html
[Config] SQL output    : ...\seed_data.sql
[Config] DB execution  : YES

[Pass 1] Parsing lista_autor.html ...
         Books : 50,174
         Authors: 16,788

[Pass 2] Parsing lista_generos.html ...
         Genres     : 128
         BookGenres : 75,722
         Orphans    : 1,425

[SQL] Writing → ...\seed_data.sql
       SQL written ✓

[DB] Connecting ...
     Server   : localhost
     Database : EBookLibraryDb
[DB] Purging existing data ...... done.
[DB] Inserting 128 Genres ... done.
[DB] Inserting 16,788 Authors ...
       ... 10,000 rows copied into Authors
[DB] Inserting 51,599 Books ...
       ... 10,000 rows copied into Books
       ... 50,000 rows copied into Books
[DB] Inserting 50,174 BookAuthors ...
[DB] Inserting 75,722 BookGenres ...
[DB] Transaction committed ✓

┌─────────────────────────────────────────────────────────┐
│ Table              Expected       Actual   Status        │
├─────────────────────────────────────────────────────────┤
│ Genres                  128          128        ✓        │
│ Authors              16,788       16,788        ✓        │
│ Books                51,599       51,599        ✓        │
│ BookAuthors          50,174       50,174        ✓        │
│ BookGenres           75,722       75,722        ✓        │
└─────────────────────────────────────────────────────────┘
All counts match ✓
```

### SQL-only mode (generate without executing)

If no connection string is found, or to generate SQL for manual execution:

```powershell
# Generates seed_data.sql and skips DB execution
dotnet run --project scripts/EBookLibrary.Seeder -- "" "" "seed_data.sql"

# Then run manually via sqlcmd:
sqlcmd -S localhost -d EBookLibraryDb -E -i seed_data.sql
```

### Step 3: Verify data

```sql
SELECT COUNT(*) AS TotalBooks    FROM Books    WHERE IsDeleted = 0; -- Expected: 51,599
SELECT COUNT(*) AS TotalAuthors  FROM Authors  WHERE IsDeleted = 0; -- Expected: 16,788
SELECT COUNT(*) AS TotalGenres   FROM Genres   WHERE IsDeleted = 0; -- Expected: 128
SELECT COUNT(*) AS BookAuthors   FROM BookAuthors;                   -- Expected: 50,174
SELECT COUNT(*) AS BookGenres    FROM BookGenres;                    -- Expected: 75,722

-- Spot-check: Dan Brown should have exactly 6 books
SELECT b.Title, b.Pages
FROM Books b
JOIN BookAuthors ba ON b.Id = ba.BookId
JOIN Authors a ON ba.AuthorId = a.Id
WHERE a.Name = 'Dan Brown' AND b.IsDeleted = 0;

-- Spot-check: no genre variants remaining (should return only 1 row)
SELECT Name FROM Genres WHERE Name LIKE 'Cienci%' AND IsDeleted = 0;

-- Top 10 genres by book count
SELECT TOP 10 g.Name, COUNT(bg.BookId) AS BookCount
FROM Genres g
LEFT JOIN BookGenres bg ON g.Id = bg.GenreId
GROUP BY g.Name
ORDER BY BookCount DESC;
```

---

## Task 6 — PostgreSQL Migration (Future)

### Steps to switch to PostgreSQL

1. Install the Npgsql provider:
   ```bash
   cd src/EBookLibrary.Infrastructure
   dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.*
   ```

2. In `DependencyInjection.cs`, replace:
   ```csharp
   // FROM:
   options.UseSqlServer(connectionString, b => b.MigrationsAssembly(...))
   // TO:
   options.UseNpgsql(connectionString, b => b.MigrationsAssembly(...))
   ```

3. Create new migration for PostgreSQL:
   ```bash
   dotnet ef migrations add InitialCreate_PG \
     --project src/EBookLibrary.Infrastructure \
     --startup-project src/EBookLibrary.WebApi
   ```

4. Update connection string to PostgreSQL format.

---

## Task 7 — Migration Management Commands

```bash
# Add a new migration
dotnet ef migrations add <MigrationName> \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi

# Apply pending migrations
dotnet ef database update \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi

# Roll back to a specific migration
dotnet ef database update <PreviousMigrationName> \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi

# Remove the last migration (if not applied)
dotnet ef migrations remove \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi

# Generate SQL script for a migration (for production deployment)
dotnet ef migrations script \
  --project src/EBookLibrary.Infrastructure \
  --startup-project src/EBookLibrary.WebApi \
  --output migrations.sql \
  --idempotent
```

---

## Deliverables Checklist

- [ ] `appsettings.json` has correct SQL Server connection string
- [ ] `dotnet-ef` global tool installed
- [ ] `InitialCreate` migration generated with all 7 tables
- [ ] `dotnet ef database update` runs successfully
- [ ] Schema verified in SSMS (all tables present with correct columns)
- [ ] `scripts/EBookLibrary.Seeder/` project created with two-pass parse script
- [ ] `scripts/seed_data.sql` generated from `lista_autor.html` + `lista_generos.html`
- [ ] Seed executed — 51,599 deduplicated books, 16,788 authors, 128 genres, 75,722 book-genre links
- [ ] Admin user seeded (`admin@ebooklibrary.com` / `Admin@12345`)
- [ ] Validation query shows all counts match

---

*Component 07 of 10 — EBook Library Project*
