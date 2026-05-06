namespace EBookLibrary.Application.Auth.DTOs;

public record AuthResponseDto(
    Guid UserId,
    string Email,
    string? FirstName,
    string? LastName,
    string Role,
    string Token,
    DateTime ExpiresAt
);
