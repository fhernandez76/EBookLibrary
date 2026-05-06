using AutoMapper;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.SearchBooks;

public class SearchBooksQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<SearchBooksQuery, PagedResult<BookSummaryDto>>
{
    public async Task<PagedResult<BookSummaryDto>> Handle(SearchBooksQuery request, CancellationToken ct)
    {
        var f = request.Filter;
        var (items, total) = await unitOfWork.Books.SearchAsync(
            f.Title, f.AuthorName, f.GenreName, f.PublicationYear,
            f.PageNumber, f.PageSize, ct);

        var dtos = mapper.Map<IEnumerable<BookSummaryDto>>(items);
        return PagedResult<BookSummaryDto>.Create(dtos, total, f.PageNumber, f.PageSize);
    }
}
