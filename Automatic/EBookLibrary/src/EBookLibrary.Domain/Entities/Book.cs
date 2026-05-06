using EBookLibrary.Domain.Common;
using EBookLibrary.Domain.Enums;

namespace EBookLibrary.Domain.Entities;

public sealed class Book : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public int Pages { get; private set; }
    public int? PublicationYear { get; private set; }
    public string? Isbn { get; private set; }
    public string? Description { get; private set; }
    public string? CoverImagePath { get; private set; }
    public string? FilePath { get; private set; }
    public BookLanguage Language { get; private set; } = BookLanguage.Spanish;
    public BookStatus Status { get; private set; } = BookStatus.Unavailable;

    // Navigations
    public ICollection<BookAuthor> BookAuthors { get; private set; } = [];
    public ICollection<BookGenre> BookGenres { get; private set; } = [];
    public ICollection<BookDownload> Downloads { get; private set; } = [];

    private Book() { }

    public static Book Create(string title, int pages, BookLanguage language = BookLanguage.Spanish)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        var book = new Book
        {
            Title = title.Trim(),
            Pages = pages >= 0 ? pages : 0,
            Language = language
        };
        return book;
    }

    public void Update(string title, int pages, int? publicationYear, string? isbn,
        string? description, BookLanguage language)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        Title = title.Trim();
        Pages = pages >= 0 ? pages : 0;
        PublicationYear = publicationYear;
        Isbn = isbn?.Trim();
        Description = description?.Trim();
        Language = language;
        MarkAsUpdated();
    }

    public void SetFilePath(string relativePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath, nameof(relativePath));
        FilePath = relativePath;
        Status = BookStatus.Available;
        MarkAsUpdated();
    }

    public void SetCoverImagePath(string relativePath)
    {
        CoverImagePath = relativePath;
        MarkAsUpdated();
    }

    public void MarkAsUnavailable() { Status = BookStatus.Unavailable; MarkAsUpdated(); }
    public bool HasFile => !string.IsNullOrWhiteSpace(FilePath) && Status == BookStatus.Available;
}
