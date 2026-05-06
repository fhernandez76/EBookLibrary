using EBookLibrary.Application.Auth.DTOs;
using MediatR;

namespace EBookLibrary.Application.Auth.Commands.RegisterUser;

public record RegisterUserCommand(
    string Email,
    string Password,
    string ConfirmPassword,
    string? FirstName,
    string? LastName
) : IRequest<AuthResponseDto>;
