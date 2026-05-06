using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Users.Commands.ToggleUserStatus;

public record ToggleUserStatusCommand(Guid UserId, Guid RequestingUserId) : IRequest;

public class ToggleUserStatusCommandValidator : AbstractValidator<ToggleUserStatusCommand>
{
    public ToggleUserStatusCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.RequestingUserId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.UserId != x.RequestingUserId)
            .WithName("UserId")
            .WithMessage("You cannot change the active status of your own account.");
    }
}

public class ToggleUserStatusCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<ToggleUserStatusCommand>
{
    public async Task Handle(ToggleUserStatusCommand request, CancellationToken ct)
    {
        var user = await unitOfWork.Users.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        if (user.IsActive)
            user.Deactivate();
        else
            user.Activate();

        await unitOfWork.Users.UpdateAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
