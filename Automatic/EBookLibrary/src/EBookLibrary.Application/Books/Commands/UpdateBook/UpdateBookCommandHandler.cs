using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Commands.UpdateBook;

public class UpdateBookCommandHandler(IUnitOfWork unitOfWork) : IRequestHandler<UpdateBookCommand>
{
    public async Task Handle(UpdateBookCommand request, CancellationToken ct)
    {
        var book = await unitOfWork.Books.GetWithDetailsAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);

        var language = Enum.Parse<BookLanguage>(request.Language, true);
        book.Update(request.Title, request.Pages, request.PublicationYear,
            request.Isbn, request.Description, language);

        await unitOfWork.Books.UpdateAsync(book, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
