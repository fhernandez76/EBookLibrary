using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Users.Commands.DeleteUser;

public record DeleteUserCommand(Guid UserId, Guid RequestingUserId) : IRequest;

public class DeleteUserCommandValidator : AbstractValidator<DeleteUserCommand>
{
    public DeleteUserCommandValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.RequestingUserId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.UserId != x.RequestingUserId)
            .WithName("UserId")
            .WithMessage("You cannot delete your own account.");
    }
}

public class DeleteUserCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<DeleteUserCommand>
{
    public async Task Handle(DeleteUserCommand request, CancellationToken ct)
    {
        var user = await unitOfWork.Users.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        await unitOfWork.Users.DeleteAsync(user, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
