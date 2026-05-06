using EBookLibrary.Application.Auth.DTOs;
using MediatR;

namespace EBookLibrary.Application.Auth.Commands.LoginUser;

public record LoginUserCommand(string Email, string Password) : IRequest<AuthResponseDto>;
