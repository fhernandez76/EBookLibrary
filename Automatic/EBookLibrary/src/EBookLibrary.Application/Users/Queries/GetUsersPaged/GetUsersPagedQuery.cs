using AutoMapper;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Application.Users.DTOs;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Users.Queries.GetUsersPaged;

public record GetUsersPagedQuery(int PageNumber = 1, int PageSize = 20) : IRequest<PagedResult<UserDto>>;

public class GetUsersPagedQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetUsersPagedQuery, PagedResult<UserDto>>
{
    public async Task<PagedResult<UserDto>> Handle(GetUsersPagedQuery request, CancellationToken ct)
    {
        var (items, total) = await unitOfWork.Users.GetPagedAsync(request.PageNumber, request.PageSize, ct);
        var dtos = mapper.Map<IEnumerable<UserDto>>(items);
        return PagedResult<UserDto>.Create(dtos, total, request.PageNumber, request.PageSize);
    }
}
