namespace EBookLibrary.Application.Books.DTOs;

public record BookDto(
    Guid Id,
    string Title,
    int Pages,
    int? PublicationYear,
    string? Isbn,
    string? Description,
    string? CoverImageUrl,
    string Language,
    string Status,
    bool HasFile,
    IEnumerable<string> Authors,
    IEnumerable<string> Genres
);

public record BookSummaryDto(
    Guid Id,
    string Title,
    int Pages,
    int? PublicationYear,
    string? CoverImageUrl,
    string Status,
    bool HasFile,
    string PrimaryAuthor,
    string PrimaryGenre
);
