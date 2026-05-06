namespace EBookLibrary.Blazor.Models;

public record AuthorModel(string Id, string Name, string? Biography, int BookCount);
public record GenreModel(string Id, string Name, string? Description, int BookCount);
public record UserModel(string Id, string Email, string? FirstName, string? LastName,
    string Role, bool IsActive, DateTime CreatedAt);
