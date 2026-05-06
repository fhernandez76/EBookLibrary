using EBookLibrary.Application.Auth.Commands.LoginUser;
using EBookLibrary.Application.Auth.Commands.RegisterUser;
using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Authentication — Register and Login</summary>
[AllowAnonymous]
[EnableRateLimiting("auth")]
public class AuthController : ApiControllerBase
{
    /// <summary>Register a new user account</summary>
    /// <response code="201">User registered successfully. Returns JWT token.</response>
    /// <response code="400">Validation errors (invalid email, weak password, etc.)</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<AuthResponseDto>.Ok(result, "User registered successfully."));
    }

    /// <summary>Authenticate with email and password</summary>
    /// <response code="200">Login successful. Returns JWT token.</response>
    /// <response code="400">Invalid credentials</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginUserCommand command, CancellationToken ct)
    {
        var result = await Mediator.Send(command, ct);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result));
    }
}
