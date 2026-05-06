using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Genres.Commands.UpdateGenre;

public record UpdateGenreCommand(Guid GenreId, string Name, string? Description) : IRequest;

public class UpdateGenreCommandValidator : FluentValidation.AbstractValidator<UpdateGenreCommand>
{
    public UpdateGenreCommandValidator()
    {
        RuleFor(x => x.GenreId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500).When(x => x.Description is not null);
    }
}

public class UpdateGenreCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<UpdateGenreCommand>
{
    public async Task Handle(UpdateGenreCommand request, CancellationToken ct)
    {
        var genre = await unitOfWork.Genres.GetByIdAsync(request.GenreId, ct)
            ?? throw new NotFoundException(nameof(Genre), request.GenreId);
        genre.Update(request.Name, request.Description);
        await unitOfWork.Genres.UpdateAsync(genre, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
