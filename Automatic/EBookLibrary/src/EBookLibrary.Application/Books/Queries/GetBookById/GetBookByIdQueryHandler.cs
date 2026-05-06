using AutoMapper;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.GetBookById;

public class GetBookByIdQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetBookByIdQuery, BookDto>
{
    public async Task<BookDto> Handle(GetBookByIdQuery request, CancellationToken ct)
    {
        var book = await unitOfWork.Books.GetWithDetailsAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);
        return mapper.Map<BookDto>(book);
    }
}
