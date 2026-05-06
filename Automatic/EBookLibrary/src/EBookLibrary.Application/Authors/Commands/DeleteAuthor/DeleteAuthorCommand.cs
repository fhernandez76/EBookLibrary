using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Authors.Commands.DeleteAuthor;

public record DeleteAuthorCommand(Guid AuthorId) : IRequest;

public class DeleteAuthorCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<DeleteAuthorCommand>
{
    public async Task Handle(DeleteAuthorCommand request, CancellationToken ct)
    {
        var author = await unitOfWork.Authors.GetByIdAsync(request.AuthorId, ct)
            ?? throw new NotFoundException(nameof(Author), request.AuthorId);
        author.SoftDelete();
        await unitOfWork.Authors.UpdateAsync(author, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
