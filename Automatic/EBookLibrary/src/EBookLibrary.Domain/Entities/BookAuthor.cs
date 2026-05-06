namespace EBookLibrary.Domain.Entities;

/// <summary>Many-to-many join between Book and Author</summary>
public sealed class BookAuthor
{
    public Guid BookId { get; private set; }
    public Guid AuthorId { get; private set; }
    public bool IsPrimary { get; private set; } = true; // primary vs. co-author

    public Book Book { get; private set; } = null!;
    public Author Author { get; private set; } = null!;

    private BookAuthor() { }

    public static BookAuthor Create(Guid bookId, Guid authorId, bool isPrimary = true)
        => new() { BookId = bookId, AuthorId = authorId, IsPrimary = isPrimary };
}
