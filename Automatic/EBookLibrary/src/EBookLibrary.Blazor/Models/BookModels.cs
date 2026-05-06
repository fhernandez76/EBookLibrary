namespace EBookLibrary.Blazor.Models;

public record BookSummary(
    string Id, string Title, int Pages, int? PublicationYear,
    string? CoverImageUrl, string Status, bool HasFile,
    string PrimaryAuthor, string PrimaryGenre);

public record BookDetail(
    string Id, string Title, int Pages, int? PublicationYear,
    string? Isbn, string? Description, string? CoverImageUrl,
    string Language, string Status, bool HasFile,
    List<string> Authors, List<string> Genres);

public record BookSearchFilter(
    string? Title = null, string? AuthorName = null, string? GenreName = null,
    int? PublicationYear = null, int PageNumber = 1, int PageSize = 20);

public record PagedResult<T>(
    IEnumerable<T> Items, int TotalCount, int PageNumber, int PageSize,
    int TotalPages, bool HasPreviousPage, bool HasNextPage);

public record ApiResponse<T>(bool Success, T? Data, string? Message, List<string>? Errors);
