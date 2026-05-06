using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using EBookLibrary.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Repositories;

public class BookDownloadRepository(AppDbContext context) : IBookDownloadRepository
{
    public async Task AddAsync(BookDownload download, CancellationToken ct = default)
        => await context.BookDownloads.AddAsync(download, ct);

    public async Task<IEnumerable<BookDownload>> GetByUserAsync(Guid userId, CancellationToken ct = default)
        => await context.BookDownloads
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.DownloadedAt)
            .ToListAsync(ct);

    public async Task<IEnumerable<BookDownload>> GetByBookAsync(Guid bookId, CancellationToken ct = default)
        => await context.BookDownloads
            .Where(d => d.BookId == bookId)
            .OrderByDescending(d => d.DownloadedAt)
            .ToListAsync(ct);

    public async Task<int> CountByBookAsync(Guid bookId, CancellationToken ct = default)
        => await context.BookDownloads.CountAsync(d => d.BookId == bookId, ct);
}
