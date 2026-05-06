// EBookLibrary.Seeder v2 — Two-pass deduplication + SQL generation + DB auto-execution
//
// Usage (from Automatic/EBookLibrary/ or from the project folder):
//   dotnet run --project scripts/EBookLibrary.Seeder [-- [autorHtml] [generosHtml] [output.sql] [connStr]]
//
// Defaults:
//   autorHtml   → auto-located docs/lista_autor.html
//   generosHtml → auto-located docs/lista_generos.html
//   output.sql  → seed_data.sql  (in current dir)
//   connStr     → auto-read from src/EBookLibrary.WebApi/appsettings.json
//                 (omit to generate SQL only, without executing)
//
// Strategy:
//   Pass 1 (lista_autor.html) — authoritative source for Books + Authors.
//     Books are keyed by (normalizedTitle|normalizedAuthor).  When the author
//     column is blank, the previous author is inherited (the file is sorted by author).
//   Pass 2 (lista_generos.html) — source for Genres + BookGenre links only.
//     Each book entry is cross-referenced against Pass-1 books; no new Book rows
//     are created unless a title genuinely doesn't exist in Pass 1 (orphan).
//   Genres are normalised via a static map that collapses spelling variants /
//   typos into a single canonical name (required because Genres.Name is UNIQUE).

using System.Data;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

// ── Arguments ─────────────────────────────────────────────────────────────────
var autorPath   = args.Length > 0 ? args[0] : FindDocFile("lista_autor.html");
var generosPath = args.Length > 1 ? args[1] : FindDocFile("lista_generos.html");
var sqlOutPath  = args.Length > 2 ? args[2] : "seed_data.sql";
var connStr     = args.Length > 3 ? args[3] : TryReadConnectionString();

foreach (var (label, path) in new[] { ("lista_autor.html", autorPath), ("lista_generos.html", generosPath) })
{
    if (!File.Exists(path))
    {
        Console.Error.WriteLine($"[ERROR] {label} not found: {path}");
        return 1;
    }
}

Console.WriteLine($"[Config] lista_autor   : {autorPath}");
Console.WriteLine($"[Config] lista_generos : {generosPath}");
Console.WriteLine($"[Config] SQL output    : {Path.GetFullPath(sqlOutPath)}");
Console.WriteLine($"[Config] DB execution  : {(string.IsNullOrWhiteSpace(connStr) ? "SKIP (no connection string)" : "YES")}");
Console.WriteLine();

// ── Genre normalization map ───────────────────────────────────────────────────
// Maps lower-case variant names to their canonical form.
// Genres.Name has a UNIQUE constraint, so all variants must resolve to one name.
var genreNorm = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
{
    ["Aventura"]                           = "Aventuras",
    ["Biograf\u00edas"]                    = "Biograf\u00eda",
    ["Biograf\u00edas y Memorias"]         = "Biograf\u00eda",
    ["Ciencia Ficcion"]                    = "Ciencia ficci\u00f3n",
    ["Ciencia-Ficci\u00f3n"]               = "Ciencia ficci\u00f3n",
    ["Cl\u00e1sica"]                       = "Cl\u00e1sico",
    ["Cl\u00e1sicos"]                      = "Cl\u00e1sico",
    ["Divulgacion"]                        = "Divulgaci\u00f3n",
    ["Divulgaci\u00f3n cient\u00edfica"]   = "Divulgaci\u00f3n",
    ["Erotica"]                            = "Er\u00f3tico",
    ["Erotico"]                            = "Er\u00f3tico",
    ["Er\u00f3tica"]                       = "Er\u00f3tico",
    ["Novela Er\u00f3tica"]                = "Er\u00f3tico",
    ["Eocnom\u00eda"]                      = "Econom\u00eda",
    ["Fantasia"]                           = "Fant\u00e1stico",
    ["Fantastico"]                         = "Fant\u00e1stico",
    ["Fantas\u00eda"]                      = "Fant\u00e1stico",
    ["Fant\u00e1stica"]                    = "Fant\u00e1stico",
    ["Fant\u00e1stico. Novela"]            = "Fant\u00e1stico",
    ["Filosofia"]                          = "Filosof\u00eda",
    ["Hist\u00f3rica"]                     = "Hist\u00f3rico",
    ["Historico"]                          = "Hist\u00f3rico",
    ["Narrativa Historica"]                = "Hist\u00f3rico",
    ["Narrativa Hist\u00f3rica"]           = "Hist\u00f3rico",
    ["Ficci\u00f3n hist\u00f3rica"]        = "Hist\u00f3rico",
    ["Historia Universal"]                 = "Historia",
    ["Intirga"]                            = "Intriga",
    ["Intr"]                               = "Intriga",
    ["Intriga y Suspense"]                 = "Intriga",
    ["Novela Historica"]                   = "Novela",
    ["Novela Hist\u00f3rica"]              = "Novela",
    ["Novela contemporanea"]               = "Novela",
    ["Novela contempor\u00e1nea"]          = "Novela",
    ["Novela Negra"]                       = "Negra",
    ["Novela Policiaca"]                   = "Policial",
    ["Novela polic\u00edaca"]              = "Policial",
    ["Novela Polic\u00edaco"]              = "Policial",
    ["Policiaca"]                          = "Policial",
    ["Polic\u00edaca"]                     = "Policial",
    ["Polic\u00edaco"]                     = "Policial",
    ["Poesia"]                             = "Poes\u00eda",
    ["Ficci\u00f3n contemporanea"]         = "Contempor\u00e1nea",
    ["Tecnologia"]                         = "Tecnolog\u00eda",
    ["Narrativa espa\u00f1ola"]            = "Narrativa",
    ["Narrativa hisp\u00e1nica"]           = "Narrativa",
    ["Narrativa extranjera"]               = "Narrativa",
};

// ── Data structures ───────────────────────────────────────────────────────────
var authors      = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
// Primary book index: key = "normalizedTitle|normalizedAuthor"
var booksByKey   = new Dictionary<string, BookRecord>(StringComparer.OrdinalIgnoreCase);
// Fallback index for cross-referencing when genre file has blank author
var booksByTitle = new Dictionary<string, List<BookRecord>>(StringComparer.OrdinalIgnoreCase);
var genres       = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
var bookGenreSet = new HashSet<(Guid BookId, Guid GenreId)>();
var bookGenres   = new List<(Guid BookId, Guid GenreId)>();

// ── Book line pattern (shared for both HTML files) ────────────────────────────
// Matches:  NNNNN | PAGES [•]| Author | Title
// • (U+2022) marks EPUB availability; author field may be blank (whitespace only).
var lineRx = new Regex(
    @"\d{5}\s*\|\s*(\d+)\s*(\u2022?)\s*\|\s*([^|\r\n]*?)\s*\|\s*([^\r\n<]+)",
    RegexOptions.Compiled);

// ─────────────────────────────────────────────────────────────────────────────
// PASS 1 — lista_autor.html
// Authoritative source for Books and Authors.
// Blank author → inherit from previous entry (file is sorted by author).
// ─────────────────────────────────────────────────────────────────────────────
Console.WriteLine("[Pass 1] Parsing lista_autor.html …");
var autorHtml = await File.ReadAllTextAsync(autorPath, Encoding.UTF8);

string? currentAuthor = null;
foreach (Match m in lineRx.Matches(autorHtml))
{
    var pages     = int.TryParse(m.Groups[1].Value.Trim(), out var p) ? p : 0;
    var hasEpub   = m.Groups[2].Value.Length > 0;
    var rawAuthor = Normalize(m.Groups[3].Value);
    var rawTitle  = Normalize(m.Groups[4].Value);

    if (string.IsNullOrWhiteSpace(rawTitle)) continue;

    // Inherit author when blank (consecutive books by same author)
    if (!string.IsNullOrWhiteSpace(rawAuthor))
        currentAuthor = rawAuthor;

    var authorName = currentAuthor ?? string.Empty;

    if (!authors.TryGetValue(authorName, out var authorId) && !string.IsNullOrWhiteSpace(authorName))
    {
        authorId = Guid.NewGuid();
        authors[authorName] = authorId;
    }

    var key = MakeKey(rawTitle, authorName);
    if (booksByKey.ContainsKey(key)) continue; // deduplicate within Pass 1

    var rec = new BookRecord(
        Guid.NewGuid(), rawTitle, pages, hasEpub,
        authorName,
        string.IsNullOrWhiteSpace(authorName) ? null : authorId);

    booksByKey[key] = rec;

    var titleKey = rawTitle.ToLowerInvariant();
    if (!booksByTitle.TryGetValue(titleKey, out var bucket))
    {
        bucket = new List<BookRecord>();
        booksByTitle[titleKey] = bucket;
    }
    bucket.Add(rec);
}

Console.WriteLine($"         Books : {booksByKey.Count:N0}");
Console.WriteLine($"         Authors: {authors.Count:N0}");

// ─────────────────────────────────────────────────────────────────────────────
// PASS 2 — lista_generos.html
// Source for Genres and BookGenre relationships only.
// Books are cross-referenced against Pass-1; orphans are added with null author.
// ─────────────────────────────────────────────────────────────────────────────
Console.WriteLine();
Console.WriteLine("[Pass 2] Parsing lista_generos.html …");
var generosHtml = await File.ReadAllTextAsync(generosPath, Encoding.UTF8);

var sectionRx = new Regex(
    @"<a name=""l\d+""></a>([^<(]+?)\s*\(\d+\)</b></p>(.*?)(?=<center><hr|<p style=""font-size:1\.3em|$)",
    RegexOptions.Singleline | RegexOptions.Compiled);

int orphanCount = 0;

foreach (Match section in sectionRx.Matches(generosHtml))
{
    var rawGenre     = Normalize(section.Groups[1].Value);
    if (string.IsNullOrWhiteSpace(rawGenre)) continue;

    // Apply normalization map; fall back to the raw name if not in map
    var canonicalGenre = genreNorm.TryGetValue(rawGenre, out var mapped) ? mapped : rawGenre;

    if (!genres.TryGetValue(canonicalGenre, out var genreId))
    {
        genreId = Guid.NewGuid();
        genres[canonicalGenre] = genreId;
    }

    foreach (Match m in lineRx.Matches(section.Groups[2].Value))
    {
        var rawAuthor = Normalize(m.Groups[3].Value);
        var rawTitle  = Normalize(m.Groups[4].Value);
        if (string.IsNullOrWhiteSpace(rawTitle)) continue;

        // 1. Try exact (title + author) match
        var key = MakeKey(rawTitle, rawAuthor);
        if (!booksByKey.TryGetValue(key, out var book))
        {
            // 2. Try title-only fallback (only when exactly one candidate exists)
            var titleKey = rawTitle.ToLowerInvariant();
            if (booksByTitle.TryGetValue(titleKey, out var candidates) && candidates.Count == 1)
            {
                book = candidates[0];
            }
            else
            {
                // 3. Orphan — appears in genre list but not in autor list
                orphanCount++;
                Guid? orphanAuthorId = null;
                if (!string.IsNullOrWhiteSpace(rawAuthor))
                {
                    if (!authors.TryGetValue(rawAuthor, out var oaid))
                    {
                        oaid = Guid.NewGuid();
                        authors[rawAuthor] = oaid;
                    }
                    orphanAuthorId = oaid;
                }
                var pages   = int.TryParse(m.Groups[1].Value.Trim(), out var p2) ? p2 : 0;
                var hasEpub = m.Groups[2].Value.Length > 0;
                book = new BookRecord(Guid.NewGuid(), rawTitle, pages, hasEpub, rawAuthor, orphanAuthorId);
                booksByKey[key] = book;
                if (!booksByTitle.TryGetValue(rawTitle.ToLowerInvariant(), out var bl))
                {
                    bl = new List<BookRecord>();
                    booksByTitle[rawTitle.ToLowerInvariant()] = bl;
                }
                bl.Add(book);
            }
        }

        // Add BookGenre link (deduplicated by composite key)
        if (bookGenreSet.Add((book.Id, genreId)))
            bookGenres.Add((book.Id, genreId));
    }
}

Console.WriteLine($"         Genres     : {genres.Count:N0}");
Console.WriteLine($"         BookGenres : {bookGenres.Count:N0}");
Console.WriteLine($"         Orphans    : {orphanCount:N0}");

if (booksByKey.Count == 0)
{
    Console.Error.WriteLine("[ERROR] No books parsed. Check the HTML file paths.");
    return 2;
}

var allBooks        = booksByKey.Values.ToList();
var booksWithAuthor = allBooks.Where(b => b.AuthorId.HasValue).ToList();

// ─────────────────────────────────────────────────────────────────────────────
// SQL FILE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
Console.WriteLine();
Console.WriteLine($"[SQL] Writing → {Path.GetFullPath(sqlOutPath)}");

var now = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
await using (var w = new StreamWriter(sqlOutPath, false, Encoding.UTF8))
{
    await w.WriteLineAsync("-- EBook Library Seed Data  (v2 — two-pass, deduplicated)");
    await w.WriteLineAsync($"-- Generated  : {now}");
    await w.WriteLineAsync($"-- Books      : {allBooks.Count:N0}");
    await w.WriteLineAsync($"-- Authors    : {authors.Count:N0}");
    await w.WriteLineAsync($"-- Genres     : {genres.Count:N0}");
    await w.WriteLineAsync($"-- BookGenres : {bookGenres.Count:N0}");
    await w.WriteLineAsync("SET NOCOUNT ON;");
    await w.WriteLineAsync("BEGIN TRANSACTION;");
    await w.WriteLineAsync();

    // Purge — FK-safe deletion order (children before parents)
    await w.WriteLineAsync("-- ═══ PURGE (FK-safe order) ═══════════════════════════════════");
    await w.WriteLineAsync("DELETE FROM BookDownloads;");
    await w.WriteLineAsync("DELETE FROM BookGenres;");
    await w.WriteLineAsync("DELETE FROM BookAuthors;");
    await w.WriteLineAsync("DELETE FROM Books;");
    await w.WriteLineAsync("DELETE FROM Authors;");
    await w.WriteLineAsync("DELETE FROM Genres;");
    await w.WriteLineAsync();

    await w.WriteLineAsync("-- ═══ GENRES ═══════════════════════════════════════════════════");
    foreach (var (name, id) in genres)
        await w.WriteLineAsync(
            $"INSERT INTO Genres (Id, Name, Description, CreatedAt, UpdatedAt, IsDeleted)" +
            $" VALUES ('{id}', N'{Esc(name)}', NULL, '{now}', NULL, 0);");

    await w.WriteLineAsync();
    await w.WriteLineAsync("-- ═══ AUTHORS ══════════════════════════════════════════════════");
    foreach (var (name, id) in authors)
        await w.WriteLineAsync(
            $"INSERT INTO Authors (Id, Name, Biography, CreatedAt, UpdatedAt, IsDeleted)" +
            $" VALUES ('{id}', N'{Esc(name)}', NULL, '{now}', NULL, 0);");

    await w.WriteLineAsync();
    await w.WriteLineAsync("-- ═══ BOOKS ════════════════════════════════════════════════════");
    foreach (var b in allBooks)
    {
        var status = b.HasEpub ? "Available" : "Unavailable";
        await w.WriteLineAsync(
            $"INSERT INTO Books (Id, Title, Pages, PublicationYear, Isbn, Description," +
            $" CoverImagePath, FilePath, Language, Status, CreatedAt, UpdatedAt, IsDeleted)" +
            $" VALUES ('{b.Id}', N'{Esc(b.Title)}', {b.Pages}, NULL, NULL, NULL," +
            $" NULL, NULL, 'Spanish', '{status}', '{now}', NULL, 0);");
    }

    await w.WriteLineAsync();
    await w.WriteLineAsync("-- ═══ BOOK AUTHORS ═════════════════════════════════════════════");
    foreach (var b in booksWithAuthor)
        await w.WriteLineAsync(
            $"INSERT INTO BookAuthors (BookId, AuthorId, IsPrimary)" +
            $" VALUES ('{b.Id}', '{b.AuthorId}', 1);");

    await w.WriteLineAsync();
    await w.WriteLineAsync("-- ═══ BOOK GENRES ══════════════════════════════════════════════");
    foreach (var (bookId, genreId) in bookGenres)
        await w.WriteLineAsync(
            $"INSERT INTO BookGenres (BookId, GenreId) VALUES ('{bookId}', '{genreId}');");

    await w.WriteLineAsync();
    await w.WriteLineAsync("COMMIT TRANSACTION;");
    await w.WriteLineAsync();
    await w.WriteLineAsync("-- Validation query (run after COMMIT)");
    await w.WriteLineAsync("SELECT 'Genres'      AS [Table], COUNT(*) AS [Rows] FROM Genres      WHERE IsDeleted = 0");
    await w.WriteLineAsync("UNION ALL SELECT 'Authors',     COUNT(*) FROM Authors     WHERE IsDeleted = 0");
    await w.WriteLineAsync("UNION ALL SELECT 'Books',       COUNT(*) FROM Books       WHERE IsDeleted = 0");
    await w.WriteLineAsync("UNION ALL SELECT 'BookAuthors', COUNT(*) FROM BookAuthors");
    await w.WriteLineAsync("UNION ALL SELECT 'BookGenres',  COUNT(*) FROM BookGenres;");
}

Console.WriteLine("       SQL written ✓");

// ─────────────────────────────────────────────────────────────────────────────
// DB EXECUTION  (skipped when no connection string is available)
// ─────────────────────────────────────────────────────────────────────────────
if (string.IsNullOrWhiteSpace(connStr))
{
    Console.WriteLine();
    Console.WriteLine("[DB] Skipping DB execution — no connection string found.");
    Console.WriteLine("     Run the generated SQL manually in SSMS or via sqlcmd:");
    Console.WriteLine($"     sqlcmd -S localhost -d EBookLibraryDb -E -i \"{Path.GetFullPath(sqlOutPath)}\"");
    return 0;
}

Console.WriteLine();
Console.WriteLine("[DB] Connecting …");

try
{
    await using var conn = new SqlConnection(connStr);
    await conn.OpenAsync();
    Console.WriteLine($"     Server   : {conn.DataSource}");
    Console.WriteLine($"     Database : {conn.Database}");

    await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

    try
    {
        // ── Purge ────────────────────────────────────────────────────────────
        Console.Write("[DB] Purging existing data ");
        foreach (var sql in new[]
        {
            "DELETE FROM BookDownloads",
            "DELETE FROM BookGenres",
            "DELETE FROM BookAuthors",
            "DELETE FROM Books",
            "DELETE FROM Authors",
            "DELETE FROM Genres",
        })
        {
            await using var cmd = new SqlCommand(sql, conn, tx) { CommandTimeout = 120 };
            await cmd.ExecuteNonQueryAsync();
            Console.Write(".");
        }
        Console.WriteLine(" done.");

        // ── Genres ───────────────────────────────────────────────────────────
        Console.Write($"[DB] Inserting {genres.Count:N0} Genres … ");
        {
            var dt = MakeTable(
                ("Id", typeof(Guid)),   ("Name", typeof(string)),  ("Description", typeof(string)),
                ("CreatedAt", typeof(DateTime)), ("UpdatedAt", typeof(DateTime)), ("IsDeleted", typeof(bool)));
            foreach (var (name, id) in genres)
                dt.Rows.Add(id, name, DBNull.Value, DateTime.UtcNow, DBNull.Value, false);
            await BulkCopyAsync(conn, tx, "Genres", dt);
        }
        Console.WriteLine("done.");

        // ── Authors ──────────────────────────────────────────────────────────
        Console.WriteLine($"[DB] Inserting {authors.Count:N0} Authors …");
        {
            var dt = MakeTable(
                ("Id", typeof(Guid)),   ("Name", typeof(string)), ("Biography", typeof(string)),
                ("CreatedAt", typeof(DateTime)), ("UpdatedAt", typeof(DateTime)), ("IsDeleted", typeof(bool)));
            foreach (var (name, id) in authors)
                dt.Rows.Add(id, name, DBNull.Value, DateTime.UtcNow, DBNull.Value, false);
            await BulkCopyAsync(conn, tx, "Authors", dt);
        }

        // ── Books ─────────────────────────────────────────────────────────────
        Console.WriteLine($"[DB] Inserting {allBooks.Count:N0} Books …");
        {
            var dt = MakeTable(
                ("Id", typeof(Guid)),       ("Title", typeof(string)),   ("Pages", typeof(int)),
                ("PublicationYear", typeof(int)), ("Isbn", typeof(string)), ("Description", typeof(string)),
                ("CoverImagePath", typeof(string)), ("FilePath", typeof(string)),
                ("Language", typeof(string)), ("Status", typeof(string)),
                ("CreatedAt", typeof(DateTime)), ("UpdatedAt", typeof(DateTime)), ("IsDeleted", typeof(bool)));
            foreach (var b in allBooks)
            {
                dt.Rows.Add(
                    b.Id, b.Title, b.Pages,
                    DBNull.Value, DBNull.Value, DBNull.Value,
                    DBNull.Value, DBNull.Value,
                    "Spanish", b.HasEpub ? "Available" : "Unavailable",
                    DateTime.UtcNow, DBNull.Value, false);
            }
            await BulkCopyAsync(conn, tx, "Books", dt);
        }

        // ── BookAuthors ───────────────────────────────────────────────────────
        Console.WriteLine($"[DB] Inserting {booksWithAuthor.Count:N0} BookAuthors …");
        {
            var dt = MakeTable(
                ("BookId", typeof(Guid)), ("AuthorId", typeof(Guid)), ("IsPrimary", typeof(bool)));
            foreach (var b in booksWithAuthor)
                dt.Rows.Add(b.Id, b.AuthorId!.Value, true);
            await BulkCopyAsync(conn, tx, "BookAuthors", dt);
        }

        // ── BookGenres ────────────────────────────────────────────────────────
        Console.WriteLine($"[DB] Inserting {bookGenres.Count:N0} BookGenres …");
        {
            var dt = MakeTable(("BookId", typeof(Guid)), ("GenreId", typeof(Guid)));
            foreach (var (bookId, genreId) in bookGenres)
                dt.Rows.Add(bookId, genreId);
            await BulkCopyAsync(conn, tx, "BookGenres", dt);
        }

        await tx.CommitAsync();
        Console.WriteLine("[DB] Transaction committed ✓");
    }
    catch
    {
        await tx.RollbackAsync();
        Console.Error.WriteLine("[DB] Transaction rolled back.");
        throw;
    }

    // ── Validation ────────────────────────────────────────────────────────────
    Console.WriteLine();
    Console.WriteLine("┌─────────────────────────────────────────────────────────┐");
    Console.WriteLine($"│ {"Table",-18} {"Expected",12} {"Actual",12} {"Status",8} │");
    Console.WriteLine("├─────────────────────────────────────────────────────────┤");

    var checks = new[]
    {
        ("Genres",      genres.Count,           "SELECT COUNT(*) FROM Genres      WHERE IsDeleted = 0"),
        ("Authors",     authors.Count,           "SELECT COUNT(*) FROM Authors     WHERE IsDeleted = 0"),
        ("Books",       allBooks.Count,          "SELECT COUNT(*) FROM Books       WHERE IsDeleted = 0"),
        ("BookAuthors", booksWithAuthor.Count,   "SELECT COUNT(*) FROM BookAuthors"),
        ("BookGenres",  bookGenres.Count,        "SELECT COUNT(*) FROM BookGenres"),
    };

    bool allOk = true;
    foreach (var (label, expected, query) in checks)
    {
        await using var cmd = new SqlCommand(query, conn) { CommandTimeout = 30 };
        var actual  = (int)(await cmd.ExecuteScalarAsync())!;
        var match   = actual == expected;
        var status  = match ? "✓" : "✗ MISMATCH";
        if (!match) allOk = false;
        Console.WriteLine($"│ {label,-18} {expected,12:N0} {actual,12:N0} {status,8} │");
    }

    Console.WriteLine("└─────────────────────────────────────────────────────────┘");
    Console.WriteLine(allOk ? "All counts match ✓" : "WARNING: count mismatches detected above.");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"[DB ERROR] {ex.Message}");
    return 3;
}

return 0;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/// <summary>Creates a DataTable with the specified column definitions.</summary>
static DataTable MakeTable(params (string Name, Type Type)[] columns)
{
    var dt = new DataTable();
    foreach (var (name, type) in columns)
    {
        // Allow DBNull in every column so we can pass DBNull.Value for NULLable fields.
        var col = dt.Columns.Add(name, type);
        col.AllowDBNull = true;
    }
    return dt;
}

/// <summary>
/// Bulk-copies <paramref name="dt"/> into <paramref name="tableName"/> using the
/// supplied connection and transaction.  Column names in the DataTable must match
/// the destination table column names exactly.
/// </summary>
static async Task BulkCopyAsync(SqlConnection conn, SqlTransaction tx, string tableName, DataTable dt)
{
    using var bc = new SqlBulkCopy(conn, SqlBulkCopyOptions.Default, tx)
    {
        DestinationTableName = tableName,
        BulkCopyTimeout      = 600,
        BatchSize            = 5000,
        NotifyAfter          = 10000,
    };
    // Map each DataTable column to the identically-named destination column.
    foreach (DataColumn col in dt.Columns)
        bc.ColumnMappings.Add(col.ColumnName, col.ColumnName);

    bc.SqlRowsCopied += (_, e) =>
        Console.WriteLine($"       … {e.RowsCopied:N0} rows copied into {tableName}");

    await bc.WriteToServerAsync(dt);
}

/// <summary>
/// Strips HTML tags, decodes HTML entities, collapses whitespace, and trims.
/// </summary>
static string Normalize(string s) =>
    Regex.Replace(WebUtility.HtmlDecode(Regex.Replace(s, "<[^>]+>", "")).Trim(), @"\s+", " ");

/// <summary>
/// Builds a case-insensitive lookup key from title and author.
/// Collapsing whitespace is intentional for robust cross-file matching.
/// </summary>
static string MakeKey(string title, string author) =>
    $"{title.ToLowerInvariant()}|{author.ToLowerInvariant()}";

/// <summary>Escapes single quotes for safe SQL string literals.</summary>
static string Esc(string s) => s.Replace("'", "''");

/// <summary>
/// Searches for <paramref name="filename"/> under a <c>docs/</c> subfolder by
/// walking up from both the current directory and the runtime base directory.
/// </summary>
static string FindDocFile(string filename)
{
    // Probe relative to current directory first (most common run locations)
    var cwdCandidates = new[]
    {
        Path.Combine("docs", filename),
        Path.Combine("..", "docs", filename),
        Path.Combine("..", "..", "docs", filename),
        Path.Combine("..", "..", "..", "docs", filename),
        Path.Combine("..", "..", "..", "..", "docs", filename),
        Path.Combine("..", "..", "..", "..", "..", "docs", filename),
    };
    foreach (var c in cwdCandidates)
        if (File.Exists(c)) return Path.GetFullPath(c);

    // Walk up from AppContext.BaseDirectory (the compiled output folder)
    for (var d = new DirectoryInfo(AppContext.BaseDirectory); d != null; d = d.Parent)
    {
        var p = Path.Combine(d.FullName, "docs", filename);
        if (File.Exists(p)) return p;
    }

    // Return a relative path that will produce a clear "file not found" error message
    return Path.Combine("docs", filename);
}

/// <summary>
/// Tries to read the DefaultConnection string from the WebApi appsettings.json
/// by walking up parent directories from both the working dir and base dir.
/// </summary>
static string? TryReadConnectionString()
{
    var searchRoots = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    for (var d = new DirectoryInfo(Environment.CurrentDirectory); d != null; d = d.Parent)
        searchRoots.Add(d.FullName);
    for (var d = new DirectoryInfo(AppContext.BaseDirectory); d != null; d = d.Parent)
        searchRoots.Add(d.FullName);

    foreach (var root in searchRoots)
    {
        var path = Path.Combine(root, "src", "EBookLibrary.WebApi", "appsettings.json");
        if (!File.Exists(path)) continue;
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            return doc.RootElement
                      .GetProperty("ConnectionStrings")
                      .GetProperty("DefaultConnection")
                      .GetString();
        }
        catch { /* try next */ }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
record BookRecord(Guid Id, string Title, int Pages, bool HasEpub,
                  string AuthorName, Guid? AuthorId);

