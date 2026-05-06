using AutoMapper;
using EBookLibrary.Application.Genres.DTOs;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Genres.Queries.GetAllGenres;

public record GetAllGenresQuery : IRequest<IEnumerable<GenreDto>>;

public class GetAllGenresQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetAllGenresQuery, IEnumerable<GenreDto>>
{
    public async Task<IEnumerable<GenreDto>> Handle(GetAllGenresQuery request, CancellationToken ct)
    {
        var genres = await unitOfWork.Genres.GetAllOrderedAsync(ct);
        return mapper.Map<IEnumerable<GenreDto>>(genres);
    }
}
