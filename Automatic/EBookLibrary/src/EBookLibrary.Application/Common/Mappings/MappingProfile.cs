using AutoMapper;
using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Application.Authors.DTOs;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Genres.DTOs;
using EBookLibrary.Application.Users.DTOs;
using EBookLibrary.Domain.Entities;

namespace EBookLibrary.Application.Common.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Book → BookDto  (positional record — must use ForCtorParam throughout)
        CreateMap<Book, BookDto>()
            .ForCtorParam("CoverImageUrl", o => o.MapFrom(s => s.CoverImagePath))
            .ForCtorParam("Language",      o => o.MapFrom(s => s.Language.ToString()))
            .ForCtorParam("Status",        o => o.MapFrom(s => s.Status.ToString()))
            .ForCtorParam("Authors",       o => o.MapFrom(s => s.BookAuthors.Select(ba => ba.Author.Name)))
            .ForCtorParam("Genres",        o => o.MapFrom(s => s.BookGenres.Select(bg => bg.Genre.Name)));

        // Book → BookSummaryDto  (positional record — must use ForCtorParam throughout)
        CreateMap<Book, BookSummaryDto>()
            .ForCtorParam("CoverImageUrl",  o => o.MapFrom(s => s.CoverImagePath))
            .ForCtorParam("Status",         o => o.MapFrom(s => s.Status.ToString()))
            .ForCtorParam("PrimaryAuthor",  o => o.MapFrom(s =>
                s.BookAuthors.Where(ba => ba.IsPrimary).Select(ba => ba.Author.Name).FirstOrDefault() ?? "Unknown"))
            .ForCtorParam("PrimaryGenre",   o => o.MapFrom(s =>
                s.BookGenres.Select(bg => bg.Genre.Name).FirstOrDefault() ?? "Unknown"));

        // Author → AuthorDto
        CreateMap<Author, AuthorDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.BookAuthors.Count));

        // Genre → GenreDto
        CreateMap<Genre, GenreDto>()
            .ForCtorParam("BookCount", o => o.MapFrom(s => s.BookGenres.Count));

        // User → UserDto / UserProfileDto  (positional records — use ForCtorParam for Role)
        CreateMap<User, UserDto>()
            .ForCtorParam("Role", o => o.MapFrom(s => s.Role.ToString()));
        CreateMap<User, UserProfileDto>()
            .ForCtorParam("Role", o => o.MapFrom(s => s.Role.ToString()));
    }
}
