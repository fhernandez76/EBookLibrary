using EBookLibrary.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore.Storage;

namespace EBookLibrary.Infrastructure.Persistence;

public class UnitOfWork(
    AppDbContext context,
    IBookRepository books,
    IAuthorRepository authors,
    IGenreRepository genres,
    IUserRepository users,
    IBookDownloadRepository bookDownloads) : IUnitOfWork
{
    private IDbContextTransaction? _transaction;

    public IBookRepository Books { get; } = books;
    public IAuthorRepository Authors { get; } = authors;
    public IGenreRepository Genres { get; } = genres;
    public IUserRepository Users { get; } = users;
    public IBookDownloadRepository BookDownloads { get; } = bookDownloads;

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
        => _transaction = await context.Database.BeginTransactionAsync(ct);

    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        await context.SaveChangesAsync(ct);
        if (_transaction is not null)
            await _transaction.CommitAsync(ct);
    }

    public async Task RollbackTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
            await _transaction.RollbackAsync(ct);
    }

    public void Dispose() => _transaction?.Dispose();
}
