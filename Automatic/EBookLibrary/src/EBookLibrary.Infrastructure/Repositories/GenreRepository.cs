using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using EBookLibrary.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Repositories;

public class GenreRepository : GenericRepository<Genre>, IGenreRepository
{
    public GenreRepository(AppDbContext context) : base(context) { }

    public override async Task<Genre?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.Include(g => g.BookGenres).FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<Genre?> GetByNameAsync(string name, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(g => g.Name == name, ct);

    public async Task<IEnumerable<Genre>> GetAllOrderedAsync(CancellationToken ct = default)
        => await _dbSet
            .Include(g => g.BookGenres)
            .OrderBy(g => g.Name)
            .ToListAsync(ct);
}
