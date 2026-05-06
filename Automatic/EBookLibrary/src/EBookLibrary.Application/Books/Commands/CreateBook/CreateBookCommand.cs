using MediatR;

namespace EBookLibrary.Application.Books.Commands.CreateBook;

public record CreateBookCommand(
    string Title,
    int Pages,
    int? PublicationYear,
    string? Isbn,
    string? Description,
    string Language,
    List<Guid> AuthorIds,
    List<Guid> GenreIds
) : IRequest<Guid>;
