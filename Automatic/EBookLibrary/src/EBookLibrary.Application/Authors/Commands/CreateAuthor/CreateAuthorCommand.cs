using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Authors.Commands.CreateAuthor;

public record CreateAuthorCommand(string Name, string? Biography) : IRequest<Guid>;

public class CreateAuthorCommandValidator : FluentValidation.AbstractValidator<CreateAuthorCommand>
{
    public CreateAuthorCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Biography).MaximumLength(2000).When(x => x.Biography is not null);
    }
}

public class CreateAuthorCommandHandler(EBookLibrary.Domain.Interfaces.Repositories.IUnitOfWork unitOfWork)
    : IRequestHandler<CreateAuthorCommand, Guid>
{
    public async Task<Guid> Handle(CreateAuthorCommand request, CancellationToken ct)
    {
        var author = EBookLibrary.Domain.Entities.Author.Create(request.Name, request.Biography);
        await unitOfWork.Authors.AddAsync(author, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return author.Id;
    }
}
