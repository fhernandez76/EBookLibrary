using EBookLibrary.Domain.Interfaces.Repositories;
using FluentValidation;
using MediatR;

namespace EBookLibrary.Application.Genres.Commands.CreateGenre;

public record CreateGenreCommand(string Name, string? Description) : IRequest<Guid>;

public class CreateGenreCommandValidator : FluentValidation.AbstractValidator<CreateGenreCommand>
{
    public CreateGenreCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(500).When(x => x.Description is not null);
    }
}

public class CreateGenreCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<CreateGenreCommand, Guid>
{
    public async Task<Guid> Handle(CreateGenreCommand request, CancellationToken ct)
    {
        var genre = EBookLibrary.Domain.Entities.Genre.Create(request.Name, request.Description);
        await unitOfWork.Genres.AddAsync(genre, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return genre.Id;
    }
}
