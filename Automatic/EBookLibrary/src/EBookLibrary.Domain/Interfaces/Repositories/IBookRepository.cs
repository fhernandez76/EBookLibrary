using EBookLibrary.Domain.Entities;

namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IBookRepository : IRepository<Book>
{
    Task<(IEnumerable<Book> Items, int TotalCount)> SearchAsync(
        string? title, string? authorName, string? genreName,
        int? publicationYear, int pageNumber, int pageSize,
        CancellationToken ct = default);

    Task<Book?> GetWithDetailsAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(string title, string authorName, CancellationToken ct = default);
}
