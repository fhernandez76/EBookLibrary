namespace EBookLibrary.Application.Authors.DTOs;

public record AuthorDto(Guid Id, string Name, string? Biography, int BookCount);
