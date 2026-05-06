using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using EBookLibrary.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Repositories;

public class BookRepository : GenericRepository<Book>, IBookRepository
{
    public BookRepository(AppDbContext context) : base(context) { }

    public async Task<Book?> GetWithDetailsAsync(Guid id, CancellationToken ct = default)
        => await _dbSet
            .Include(b => b.BookAuthors).ThenInclude(ba => ba.Author)
            .Include(b => b.BookGenres).ThenInclude(bg => bg.Genre)
            .FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<(IEnumerable<Book> Items, int TotalCount)> SearchAsync(
        string? title, string? authorName, string? genreName,
        int? publicationYear, int pageNumber, int pageSize,
        CancellationToken ct = default)
    {
        var query = _dbSet
            .Include(b => b.BookAuthors).ThenInclude(ba => ba.Author)
            .Include(b => b.BookGenres).ThenInclude(bg => bg.Genre)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(title))
            query = query.Where(b => b.Title.Contains(title));

        if (!string.IsNullOrWhiteSpace(authorName))
            query = query.Where(b => b.BookAuthors.Any(ba => ba.Author.Name.Contains(authorName)));

        if (!string.IsNullOrWhiteSpace(genreName))
            query = query.Where(b => b.BookGenres.Any(bg => bg.Genre.Name.Contains(genreName)));

        if (publicationYear.HasValue)
            query = query.Where(b => b.PublicationYear == publicationYear.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(b => b.Title)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<bool> ExistsAsync(string title, string authorName, CancellationToken ct = default)
        => await _dbSet.AnyAsync(b =>
            b.Title == title &&
            b.BookAuthors.Any(ba => ba.Author.Name == authorName), ct);
}
