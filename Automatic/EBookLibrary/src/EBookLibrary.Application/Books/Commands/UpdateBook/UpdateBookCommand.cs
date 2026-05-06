using MediatR;

namespace EBookLibrary.Application.Books.Commands.UpdateBook;

public record UpdateBookCommand(
    Guid BookId,
    string Title,
    int Pages,
    int? PublicationYear,
    string? Isbn,
    string? Description,
    string Language
) : IRequest;
