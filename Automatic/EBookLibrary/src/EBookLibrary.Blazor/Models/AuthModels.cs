namespace EBookLibrary.Blazor.Models;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(
    string Email, string Password, string ConfirmPassword,
    string? FirstName, string? LastName);

public record AuthResponse(
    string UserId, string Email, string? FirstName, string? LastName,
    string Role, string Token, DateTime ExpiresAt);

public record UserProfile(
    string Id, string Email, string? FirstName, string? LastName,
    string Role, bool IsActive, DateTime CreatedAt);
