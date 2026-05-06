namespace EBookLibrary.Application.Books.DTOs;

public record BookSearchFilterDto(
    string? Title = null,
    string? AuthorName = null,
    string? GenreName = null,
    int? PublicationYear = null,
    int PageNumber = 1,
    int PageSize = 20
);
