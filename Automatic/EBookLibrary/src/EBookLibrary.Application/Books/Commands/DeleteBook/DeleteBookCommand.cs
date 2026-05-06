using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using MediatR;

namespace EBookLibrary.Application.Books.Commands.DeleteBook;

public record DeleteBookCommand(Guid BookId) : IRequest;

public class DeleteBookCommandHandler : IRequestHandler<DeleteBookCommand>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteBookCommandHandler(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    public async Task Handle(DeleteBookCommand request, CancellationToken ct)
    {
        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId, ct)
            ?? throw new NotFoundException(nameof(Book), request.BookId);
        book.SoftDelete();
        await _unitOfWork.Books.UpdateAsync(book, ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
