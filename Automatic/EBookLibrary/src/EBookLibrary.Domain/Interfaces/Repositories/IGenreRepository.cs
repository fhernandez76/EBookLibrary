using EBookLibrary.Domain.Entities;

namespace EBookLibrary.Domain.Interfaces.Repositories;

public interface IGenreRepository : IRepository<Genre>
{
    Task<Genre?> GetByNameAsync(string name, CancellationToken ct = default);
    Task<IEnumerable<Genre>> GetAllOrderedAsync(CancellationToken ct = default);
}
