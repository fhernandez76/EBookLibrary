using AutoMapper;
using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Auth.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IMapper mapper)
    : IRequestHandler<GetCurrentUserQuery, UserProfileDto>
{
    public async Task<UserProfileDto> Handle(GetCurrentUserQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated || currentUser.UserId is null)
            throw new ForbiddenAccessException("Not authenticated.");

        var user = await unitOfWork.Users.GetByIdAsync(currentUser.UserId.Value, ct)
            ?? throw new NotFoundException(nameof(User), currentUser.UserId.Value);

        return mapper.Map<UserProfileDto>(user);
    }
}
