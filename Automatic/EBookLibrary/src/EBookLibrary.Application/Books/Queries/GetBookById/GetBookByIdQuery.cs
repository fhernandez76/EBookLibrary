using EBookLibrary.Application.Books.DTOs;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.GetBookById;

public record GetBookByIdQuery(Guid BookId) : IRequest<BookDto>;
