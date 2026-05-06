using EBookLibrary.Application.Authors.Commands.CreateAuthor;
using EBookLibrary.Application.Authors.Commands.DeleteAuthor;
using EBookLibrary.Application.Authors.Commands.UpdateAuthor;
using EBookLibrary.Application.Authors.DTOs;
using EBookLibrary.Application.Authors.Queries.GetAuthorById;
using EBookLibrary.Application.Authors.Queries.GetAuthorsPaged;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Authors — browse and manage book authors</summary>
[Authorize]
public class AuthorsController : ApiControllerBase
{
    /// <summary>Get paged list of authors</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AuthorDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await Mediator.Send(new GetAuthorsPagedQuery(pageNumber, pageSize), ct);
        return Ok(ApiResponse<PagedResult<AuthorDto>>.Ok(result));
    }

    /// <summary>Get author details by ID</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthorDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new GetAuthorByIdQuery(id), ct);
        return Ok(ApiResponse<AuthorDto>.Ok(result));
    }

    /// <summary>Create a new author. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateAuthorCommand command, CancellationToken ct)
    {
        var id = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Guid>.Ok(id));
    }

    /// <summary>Update an author. Admin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAuthorCommand command, CancellationToken ct)
    {
        await Mediator.Send(command with { AuthorId = id }, ct);
        return NoContent();
    }

    /// <summary>Soft-delete an author. Admin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new DeleteAuthorCommand(id), ct);
        return NoContent();
    }
}
