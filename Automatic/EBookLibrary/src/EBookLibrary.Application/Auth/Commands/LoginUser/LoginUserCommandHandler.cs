using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation.Results;
using MediatR;

namespace EBookLibrary.Application.Auth.Commands.LoginUser;

public class LoginUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHashService passwordHash, IJwtTokenService jwtService)
    : IRequestHandler<LoginUserCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(LoginUserCommand request, CancellationToken ct)
    {
        var user = await unitOfWork.Users.GetByEmailAsync(request.Email, ct)
            ?? throw new ApplicationValidationException(
                [new ValidationFailure("Email", "Invalid credentials.")]);

        if (!user.IsActive)
            throw new ForbiddenAccessException("Account is deactivated.");

        if (!passwordHash.VerifyPassword(request.Password, user.PasswordHash))
            throw new ApplicationValidationException(
                [new ValidationFailure("Password", "Invalid credentials.")]);

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString());
        return new AuthResponseDto(
            user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), token, DateTime.UtcNow.AddHours(1));
    }
}
