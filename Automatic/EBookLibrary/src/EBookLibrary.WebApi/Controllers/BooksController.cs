using EBookLibrary.Application.Books.Commands.CreateBook;
using EBookLibrary.Application.Books.Commands.DeleteBook;
using EBookLibrary.Application.Books.Commands.DownloadBook;
using EBookLibrary.Application.Books.Commands.UpdateBook;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Books.Queries.GetBookById;
using EBookLibrary.Application.Books.Queries.SearchBooks;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Books catalog — search, view details, and download eBooks</summary>
[Authorize]
public class BooksController : ApiControllerBase
{
    /// <summary>Search books by title, author, genre, or publication year</summary>
    [HttpGet("search")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BookSummaryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] BookSearchFilterDto filter, CancellationToken ct)
    {
        var result = await Mediator.Send(new SearchBooksQuery(filter), ct);
        return Ok(ApiResponse<PagedResult<BookSummaryDto>>.Ok(result));
    }

    /// <summary>Get full details of a book by ID</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<BookDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new GetBookByIdQuery(id), ct);
        return Ok(ApiResponse<BookDto>.Ok(result));
    }

    /// <summary>Download an ePub file. Requires authentication.</summary>
    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new DownloadBookCommand(id), ct);
        var fileBytes = await System.IO.File.ReadAllBytesAsync(result.AbsoluteFilePath, ct);
        return File(fileBytes, "application/epub+zip", result.FileName);
    }

    /// <summary>Create a new book record. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create([FromBody] CreateBookCommand command, CancellationToken ct)
    {
        var id = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Guid>.Ok(id));
    }

    /// <summary>Update a book record. Admin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBookCommand command, CancellationToken ct)
    {
        await Mediator.Send(command with { BookId = id }, ct);
        return NoContent();
    }

    /// <summary>Soft-delete a book. Admin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new DeleteBookCommand(id), ct);
        return NoContent();
    }
}
