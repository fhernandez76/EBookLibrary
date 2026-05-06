using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Common.Models;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.GetBooksPaged;

public record GetBooksPagedQuery(int PageNumber = 1, int PageSize = 20) : IRequest<PagedResult<BookSummaryDto>>;
