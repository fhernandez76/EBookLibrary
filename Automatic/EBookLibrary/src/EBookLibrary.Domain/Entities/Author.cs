using EBookLibrary.Domain.Common;

namespace EBookLibrary.Domain.Entities;

public sealed class Author : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Biography { get; private set; }

    // Navigation
    public ICollection<BookAuthor> BookAuthors { get; private set; } = [];

    private Author() { } // EF Core

    public static Author Create(string name, string? biography = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        if (name.Length > 300) throw new ArgumentException("Author name cannot exceed 300 characters.", nameof(name));

        return new Author
        {
            Name = name.Trim(),
            Biography = biography?.Trim()
        };
    }

    public void Update(string name, string? biography)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        Biography = biography?.Trim();
        MarkAsUpdated();
    }
}
