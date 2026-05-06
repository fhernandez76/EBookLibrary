namespace EBookLibrary.Domain.Entities;

/// <summary>Many-to-many join between Book and Genre</summary>
public sealed class BookGenre
{
    public Guid BookId { get; private set; }
    public Guid GenreId { get; private set; }

    public Book Book { get; private set; } = null!;
    public Genre Genre { get; private set; } = null!;

    private BookGenre() { }

    public static BookGenre Create(Guid bookId, Guid genreId)
        => new() { BookId = bookId, GenreId = genreId };
}
