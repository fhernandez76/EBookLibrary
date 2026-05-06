using AutoMapper;
using EBookLibrary.Application.Authors.DTOs;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Authors.Queries.GetAuthorsPaged;

public record GetAuthorsPagedQuery(int PageNumber = 1, int PageSize = 20) : IRequest<PagedResult<AuthorDto>>;

public class GetAuthorsPagedQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetAuthorsPagedQuery, PagedResult<AuthorDto>>
{
    public async Task<PagedResult<AuthorDto>> Handle(GetAuthorsPagedQuery request, CancellationToken ct)
    {
        var (items, total) = await unitOfWork.Authors.GetPagedAsync(request.PageNumber, request.PageSize, ct);
        var dtos = mapper.Map<IEnumerable<AuthorDto>>(items);
        return PagedResult<AuthorDto>.Create(dtos, total, request.PageNumber, request.PageSize);
    }
}
