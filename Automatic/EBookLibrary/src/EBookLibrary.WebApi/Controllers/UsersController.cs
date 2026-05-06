using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Application.Common.Models;
using EBookLibrary.Application.Users.Commands.DeleteUser;
using EBookLibrary.Application.Users.Commands.ToggleUserStatus;
using EBookLibrary.Application.Users.Commands.UpdateUser;
using EBookLibrary.Application.Users.Commands.UpdateUserRole;
using EBookLibrary.Application.Users.DTOs;
using EBookLibrary.Application.Users.Queries.GetUsersPaged;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>User management — Admin only</summary>
[Authorize(Roles = "Admin")]
public class UsersController(ICurrentUserService currentUser) : ApiControllerBase
{
    /// <summary>Get paged list of all users</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<UserDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await Mediator.Send(new GetUsersPagedQuery(pageNumber, pageSize), ct);
        return Ok(ApiResponse<PagedResult<UserDto>>.Ok(result));
    }

    /// <summary>Change a user's role (Regular ↔ Admin)</summary>
    [HttpPatch("{id:guid}/role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRole(
        Guid id,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken ct = default)
    {
        await Mediator.Send(new UpdateUserRoleCommand(id, request.NewRole), ct);
        return NoContent();
    }

    /// <summary>Toggle a user's active status (active ↔ inactive)</summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleStatus(Guid id, CancellationToken ct = default)
    {
        await Mediator.Send(new ToggleUserStatusCommand(id, currentUser.UserId ?? Guid.Empty), ct);
        return NoContent();
    }

    /// <summary>Update a user's profile (name, email, optional password)</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken ct = default)
    {
        var result = await Mediator.Send(
            new UpdateUserCommand(id, request.FirstName, request.LastName, request.Email, request.NewPassword), ct);
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    /// <summary>Delete a user permanently</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct = default)
    {
        await Mediator.Send(new DeleteUserCommand(id, currentUser.UserId ?? Guid.Empty), ct);
        return NoContent();
    }
}

public record UpdateUserRoleRequest(string NewRole);
public record UpdateUserRequest(string? FirstName, string? LastName, string Email, string? NewPassword);
