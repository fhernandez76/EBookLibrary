using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Authors.Commands.UpdateAuthor;

public record UpdateAuthorCommand(Guid AuthorId, string Name, string? Biography) : IRequest;

public class UpdateAuthorCommandValidator : FluentValidation.AbstractValidator<UpdateAuthorCommand>
{
    public UpdateAuthorCommandValidator()
    {
        RuleFor(x => x.AuthorId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Biography).MaximumLength(2000).When(x => x.Biography is not null);
    }
}

public class UpdateAuthorCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<UpdateAuthorCommand>
{
    public async Task Handle(UpdateAuthorCommand request, CancellationToken ct)
    {
        var author = await unitOfWork.Authors.GetByIdAsync(request.AuthorId, ct)
            ?? throw new NotFoundException(nameof(Author), request.AuthorId);
        author.Update(request.Name, request.Biography);
        await unitOfWork.Authors.UpdateAsync(author, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
