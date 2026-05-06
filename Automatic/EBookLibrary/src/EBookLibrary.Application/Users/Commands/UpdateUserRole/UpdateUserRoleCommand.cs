using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace EBookLibrary.Application.Users.Commands.UpdateUserRole;

public record UpdateUserRoleCommand(Guid UserId, string NewRole) : IRequest;

public class UpdateUserRoleCommandValidator : FluentValidation.AbstractValidator<UpdateUserRoleCommand>
{
    public UpdateUserRoleCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.NewRole).NotEmpty()
            .Must(r => Enum.TryParse<UserRole>(r, true, out _))
            .WithMessage("Invalid role. Valid values: Regular, Admin.");
    }
}

public class UpdateUserRoleCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<UpdateUserRoleCommand>
{
    public async Task Handle(UpdateUserRoleCommand request, CancellationToken ct)
    {
        var user = await unitOfWork.Users.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        if (!Enum.TryParse<UserRole>(request.NewRole, true, out var role))
            throw new ApplicationValidationException(
                [new ValidationFailure("NewRole", "Invalid role value.")]);

        user.ChangeRole(role);
        await unitOfWork.Users.UpdateAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
