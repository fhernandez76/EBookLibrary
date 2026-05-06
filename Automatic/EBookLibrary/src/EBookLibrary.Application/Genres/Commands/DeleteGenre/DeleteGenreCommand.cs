using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Genres.Commands.DeleteGenre;

public record DeleteGenreCommand(Guid GenreId) : IRequest;

public class DeleteGenreCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<DeleteGenreCommand>
{
    public async Task Handle(DeleteGenreCommand request, CancellationToken ct)
    {
        var genre = await unitOfWork.Genres.GetByIdAsync(request.GenreId, ct)
            ?? throw new NotFoundException(nameof(Genre), request.GenreId);
        genre.SoftDelete();
        await unitOfWork.Genres.UpdateAsync(genre, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
