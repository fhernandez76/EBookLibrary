using AutoMapper;
using EBookLibrary.Application.Authors.DTOs;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Authors.Queries.GetAuthorById;

public record GetAuthorByIdQuery(Guid AuthorId) : IRequest<AuthorDto>;

public class GetAuthorByIdQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    : IRequestHandler<GetAuthorByIdQuery, AuthorDto>
{
    public async Task<AuthorDto> Handle(GetAuthorByIdQuery request, CancellationToken ct)
    {
        var author = await unitOfWork.Authors.GetByIdAsync(request.AuthorId, ct)
            ?? throw new NotFoundException(nameof(Author), request.AuthorId);
        return mapper.Map<AuthorDto>(author);
    }
}
