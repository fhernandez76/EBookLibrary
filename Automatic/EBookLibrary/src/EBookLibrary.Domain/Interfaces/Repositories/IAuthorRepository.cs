using EBookLibrary.Domain.Entities;

namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IAuthorRepository : IRepository<Author>
{
    Task<Author?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<IEnumerable<Author>> SearchByNameAsync(string nameQuery, CancellationToken ct = default);
    Task<(IEnumerable<Author> Items, int TotalCount)> GetPagedAsync(int pageNumber, int pageSize, CancellationToken ct = default);
}
