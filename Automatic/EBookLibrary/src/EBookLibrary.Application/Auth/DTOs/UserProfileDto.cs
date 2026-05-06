namespace EBookLibrary.Application.Auth.DTOs;

public record UserProfileDto(
    Guid Id,
    string Email,
    string? FirstName,
    string? LastName,
    string Role,
    bool IsActive,
    DateTime CreatedAt
);
