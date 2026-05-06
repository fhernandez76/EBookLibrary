using EBookLibrary.Application.Auth.DTOs;
using MediatR;

namespace EBookLibrary.Application.Auth.Queries.GetCurrentUser;

public record GetCurrentUserQuery : IRequest<UserProfileDto>;
