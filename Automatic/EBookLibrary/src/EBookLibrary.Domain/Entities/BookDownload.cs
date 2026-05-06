namespace EBookLibrary.Domain.Entities;

/// <summary>Records every time a user downloads/requests a book</summary>
public sealed class BookDownload
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public Guid BookId { get; private set; }
    public DateTime DownloadedAt { get; private set; } = DateTime.UtcNow;
    public string? IpAddress { get; private set; }

    public User User { get; private set; } = null!;
    public Book Book { get; private set; } = null!;

    private BookDownload() { }

    public static BookDownload Create(Guid userId, Guid bookId, string? ipAddress = null)
        => new() { UserId = userId, BookId = bookId, IpAddress = ipAddress };
}
