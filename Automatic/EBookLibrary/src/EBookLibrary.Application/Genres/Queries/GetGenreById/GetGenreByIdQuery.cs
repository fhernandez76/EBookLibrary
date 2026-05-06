using AutoMapper;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Genres.DTOs;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Genres.Queries.GetGenreById;

public record GetGenreByIdQuery(Guid GenreId) : IRequest<GenreDto>;

public class GetGenreByIdQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetGenreByIdQuery, GenreDto>
{
    public async Task<GenreDto> Handle(GetGenreByIdQuery request, CancellationToken ct)
    {
        var genre = await unitOfWork.Genres.GetByIdAsync(request.GenreId, ct)
            ?? throw new NotFoundException(nameof(Genre), request.GenreId);
        return mapper.Map<GenreDto>(genre);
    }
}
