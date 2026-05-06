using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Commands.UploadBookFile;

public record UploadBookFileCommand(Guid BookId, Stream FileStream, string FileName) : IRequest;

public class UploadBookFileCommandHandler(IUnitOfWork unitOfWork, IFileStorageService fileStorage)
    : IRequestHandler<UploadBookFileCommand>
{
    public async Task Handle(UploadBookFileCommand request, CancellationToken ct)
    {
        var book = await unitOfWork.Books.GetWithDetailsAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);

        var genreName = book.BookGenres.FirstOrDefault()?.Genre?.Name ?? "general";
        var relativePath = await fileStorage.SaveBookFileAsync(request.FileStream, request.FileName, genreName, ct);

        book.SetFilePath(relativePath);
        await unitOfWork.Books.UpdateAsync(book, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }
}
