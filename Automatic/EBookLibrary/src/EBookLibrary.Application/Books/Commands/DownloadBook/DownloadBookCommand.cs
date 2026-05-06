using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Commands.DownloadBook;

public record DownloadBookCommand(Guid BookId) : IRequest<DownloadBookResult>;

public record DownloadBookResult(string AbsoluteFilePath, string FileName);

public class DownloadBookCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IFileStorageService fileStorage)
    : IRequestHandler<DownloadBookCommand, DownloadBookResult>
{
    public async Task<DownloadBookResult> Handle(DownloadBookCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new ForbiddenAccessException("Authentication required to download books.");

        var book = await unitOfWork.Books.GetByIdAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);

        if (!book.HasFile)
            throw new NotFoundException("Book file", request.BookId);

        var download = BookDownload.Create(currentUser.UserId!.Value, book.Id);
        await unitOfWork.BookDownloads.AddAsync(download, ct);
        await unitOfWork.SaveChangesAsync(ct);

        var absolutePath = fileStorage.GetAbsolutePath(book.FilePath!);
        var fileName = Path.GetFileName(absolutePath);
        return new DownloadBookResult(absolutePath, fileName);
    }
}
