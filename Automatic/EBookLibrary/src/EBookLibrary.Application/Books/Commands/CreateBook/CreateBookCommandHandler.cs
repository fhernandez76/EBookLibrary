using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Commands.CreateBook;

public class CreateBookCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<CreateBookCommand, Guid>
{
    public async Task<Guid> Handle(CreateBookCommand request, CancellationToken ct)
    {
        var language = Enum.Parse<BookLanguage>(request.Language, true);
        var book = Book.Create(request.Title, request.Pages, language);
        book.Update(request.Title, request.Pages, request.PublicationYear,
            request.Isbn, request.Description, language);

        foreach (var authorId in request.AuthorIds)
        {
            _ = await unitOfWork.Authors.GetByIdAsync(authorId, ct)
                ?? throw new NotFoundException(nameof(Author), authorId);
            book.BookAuthors.Add(BookAuthor.Create(book.Id, authorId, request.AuthorIds.IndexOf(authorId) == 0));
        }

        foreach (var genreId in request.GenreIds)
        {
            _ = await unitOfWork.Genres.GetByIdAsync(genreId, ct)
                ?? throw new NotFoundException(nameof(Genre), genreId);
            book.BookGenres.Add(BookGenre.Create(book.Id, genreId));
        }

        await unitOfWork.Books.AddAsync(book, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return book.Id;
    }
}
