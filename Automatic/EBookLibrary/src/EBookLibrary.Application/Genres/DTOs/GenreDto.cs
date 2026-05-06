namespace EBookLibrary.Application.Genres.DTOs;

public record GenreDto(Guid Id, string Name, string? Description, int BookCount);
