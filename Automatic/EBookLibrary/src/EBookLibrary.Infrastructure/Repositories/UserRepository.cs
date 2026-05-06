using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using EBookLibrary.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await _dbSet.AnyAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public override Task DeleteAsync(User entity, CancellationToken ct = default)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }

    public async Task<(IEnumerable<User> Items, int TotalCount)> GetPagedAsync(
        int pageNumber, int pageSize, CancellationToken ct = default)
    {
        var total = await _dbSet.CountAsync(ct);
        var items = await _dbSet
            .OrderBy(u => u.Email)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
