using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Application.Users.DTOs;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace EBookLibrary.Application.Users.Commands.UpdateUser;

public record UpdateUserCommand(
    Guid UserId,
    string? FirstName,
    string? LastName,
    string Email,
    string? NewPassword) : IRequest<UserDto>;

public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");
        When(x => !string.IsNullOrWhiteSpace(x.NewPassword), () =>
        {
            RuleFor(x => x.NewPassword)
                .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
                .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter.")
                .Matches("[0-9]").WithMessage("Password must contain at least one digit.")
                .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");
        });
    }
}

public class UpdateUserCommandHandler(IUnitOfWork unitOfWork, IPasswordHashService passwordHashService)
    : IRequestHandler<UpdateUserCommand, UserDto>
{
    public async Task<UserDto> Handle(UpdateUserCommand request, CancellationToken ct)
    {
        var user = await unitOfWork.Users.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (!user.Email.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailTaken = await unitOfWork.Users.EmailExistsAsync(normalizedEmail, ct);
            if (emailTaken)
                throw new ApplicationValidationException(
                    [new ValidationFailure("Email", "Email address is already in use.")]);
        }

        user.UpdateProfile(request.FirstName, request.LastName);
        user.UpdateEmail(normalizedEmail);

        if (!string.IsNullOrWhiteSpace(request.NewPassword))
            user.ResetPassword(passwordHashService.HashPassword(request.NewPassword));

        await unitOfWork.Users.UpdateAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return new UserDto(user.Id, user.Email, user.FirstName, user.LastName,
            user.Role.ToString(), user.IsActive, user.CreatedAt);
    }
}
