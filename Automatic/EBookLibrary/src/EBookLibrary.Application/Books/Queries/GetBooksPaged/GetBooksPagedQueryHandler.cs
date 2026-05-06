using AutoMapper;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.GetBooksPaged;

public class GetBooksPagedQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetBooksPagedQuery, PagedResult<BookSummaryDto>>
{
    public async Task<PagedResult<BookSummaryDto>> Handle(GetBooksPagedQuery request, CancellationToken ct)
    {
        var (items, total) = await unitOfWork.Books.SearchAsync(
            null, null, null, null, request.PageNumber, request.PageSize, ct);
        var dtos = mapper.Map<IEnumerable<BookSummaryDto>>(items);
        return PagedResult<BookSummaryDto>.Create(dtos, total, request.PageNumber, request.PageSize);
    }
}
