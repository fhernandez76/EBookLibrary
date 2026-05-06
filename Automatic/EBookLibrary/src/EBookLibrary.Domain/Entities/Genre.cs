using EBookLibrary.Domain.Common;

namespace EBookLibrary.Domain.Entities;

public sealed class Genre : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    public ICollection<BookGenre> BookGenres { get; private set; } = [];

    private Genre() { }

    public static Genre Create(string name, string? description = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        return new Genre { Name = name.Trim(), Description = description?.Trim() };
    }

    public void Update(string name, string? description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        Description = description?.Trim();
        MarkAsUpdated();
    }
}
