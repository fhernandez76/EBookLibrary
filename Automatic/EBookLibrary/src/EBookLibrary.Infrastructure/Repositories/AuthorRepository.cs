using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using EBookLibrary.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Repositories;

public class AuthorRepository : GenericRepository<Author>, IAuthorRepository
{
    public AuthorRepository(AppDbContext context) : base(context) { }

    public override async Task<Author?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.Include(a => a.BookAuthors).FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task<Author?> GetByNameAsync(string name, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(a => a.Name == name, ct);

    public async Task<IEnumerable<Author>> SearchByNameAsync(string nameQuery, CancellationToken ct = default)
        => await _dbSet
            .Where(a => a.Name.Contains(nameQuery))
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

    public async Task<(IEnumerable<Author> Items, int TotalCount)> GetPagedAsync(
        int pageNumber, int pageSize, CancellationToken ct = default)
    {
        var total = await _dbSet.CountAsync(ct);
        var items = await _dbSet
            .Include(a => a.BookAuthors)
            .OrderBy(a => a.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
