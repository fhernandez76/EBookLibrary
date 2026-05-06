using EBookLibrary.Application.Genres.Commands.CreateGenre;
using EBookLibrary.Application.Genres.Commands.DeleteGenre;
using EBookLibrary.Application.Genres.Commands.UpdateGenre;
using EBookLibrary.Application.Genres.DTOs;
using EBookLibrary.Application.Genres.Queries.GetAllGenres;
using EBookLibrary.Application.Genres.Queries.GetGenreById;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Genres — browse and manage book genres</summary>
[Authorize]
public class GenresController : ApiControllerBase
{
    /// <summary>Get all genres ordered by name</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<GenreDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await Mediator.Send(new GetAllGenresQuery(), ct);
        return Ok(ApiResponse<IEnumerable<GenreDto>>.Ok(result));
    }

    /// <summary>Get genre details by ID</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<GenreDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await Mediator.Send(new GetGenreByIdQuery(id), ct);
        return Ok(ApiResponse<GenreDto>.Ok(result));
    }

    /// <summary>Create a new genre. Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ApiResponse<Guid>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateGenreCommand command, CancellationToken ct)
    {
        var id = await Mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id }, ApiResponse<Guid>.Ok(id));
    }

    /// <summary>Update a genre. Admin only.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGenreCommand command, CancellationToken ct)
    {
        await Mediator.Send(command with { GenreId = id }, ct);
        return NoContent();
    }

    /// <summary>Soft-delete a genre. Admin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await Mediator.Send(new DeleteGenreCommand(id), ct);
        return NoContent();
    }
}
