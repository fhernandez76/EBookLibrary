using EBookLibrary.Domain.Entities;

namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IBookDownloadRepository
{
    Task AddAsync(BookDownload download, CancellationToken ct = default);
    Task<IEnumerable<BookDownload>> GetByUserAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<BookDownload>> GetByBookAsync(Guid bookId, CancellationToken ct = default);
    Task<int> CountByBookAsync(Guid bookId, CancellationToken ct = default);
}
