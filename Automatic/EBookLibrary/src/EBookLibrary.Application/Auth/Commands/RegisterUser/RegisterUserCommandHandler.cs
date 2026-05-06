using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation.Results;
using MediatR;

namespace EBookLibrary.Application.Auth.Commands.RegisterUser;

public class RegisterUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHashService passwordHash, IJwtTokenService jwtService)
    : IRequestHandler<RegisterUserCommand, AuthResponseDto>
{
    public async Task<AuthResponseDto> Handle(RegisterUserCommand request, CancellationToken ct)
    {
        if (await unitOfWork.Users.EmailExistsAsync(request.Email, ct))
            throw new ApplicationValidationException(
                [new ValidationFailure("Email", "Email is already registered.")]);

        var hash = passwordHash.HashPassword(request.Password);
        var user = User.Create(request.Email, hash);
        user.UpdateProfile(request.FirstName, request.LastName);

        await unitOfWork.Users.AddAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var token = jwtService.GenerateToken(user.Id, user.Email, user.Role.ToString());
        return new AuthResponseDto(
            user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), token, DateTime.UtcNow.AddHours(1));
    }
}
