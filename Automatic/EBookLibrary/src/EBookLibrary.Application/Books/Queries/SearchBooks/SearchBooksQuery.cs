using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Common.Models;
using MediatR;

namespace EBookLibrary.Application.Books.Queries.SearchBooks;

public record SearchBooksQuery(BookSearchFilterDto Filter) : IRequest<PagedResult<BookSummaryDto>>;
