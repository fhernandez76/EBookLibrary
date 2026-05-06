using EBookLibrary.Application.Books.Commands.DownloadBook;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Books;

public class DownloadBookCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithAvailableBook_ShouldReturnFilePath()
    {
        var book = BookBuilder.CreateWithFile("books/test/book.epub");
        var userId = Guid.NewGuid();

        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.GetByIdAsync(book.Id, default)).ReturnsAsync(book);

        var downloadsRepo = new Mock<IBookDownloadRepository>();
        downloadsRepo.Setup(r => r.AddAsync(It.IsAny<Domain.Entities.BookDownload>(), default))
            .Returns(Task.CompletedTask);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo, downloads: downloadsRepo);
        var currentUser = TestMockFactory.CreateCurrentUserService(userId: userId);

        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.GetAbsolutePath("books/test/book.epub"))
            .Returns(@"C:\books\test\book.epub");

        var handler = new DownloadBookCommandHandler(uow.Object, currentUser.Object, fileStorage.Object);

        var result = await handler.Handle(new DownloadBookCommand(book.Id), default);

        result.Should().NotBeNull();
        result.AbsoluteFilePath.Should().Be(@"C:\books\test\book.epub");
        result.FileName.Should().Be("book.epub");
    }

    [Fact]
    public async Task Handle_WhenBookHasNoFile_ShouldThrowNotFoundException()
    {
        var book = BookBuilder.CreateValid();
        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.GetByIdAsync(book.Id, default)).ReturnsAsync(book);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new DownloadBookCommandHandler(uow.Object,
            TestMockFactory.CreateCurrentUserService().Object,
            new Mock<IFileStorageService>().Object);

        var act = async () => await handler.Handle(new DownloadBookCommand(book.Id), default);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_WhenNotAuthenticated_ShouldThrowForbiddenAccessException()
    {
        var book = BookBuilder.CreateWithFile();
        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.GetByIdAsync(book.Id, default)).ReturnsAsync(book);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var currentUser = TestMockFactory.CreateCurrentUserService(isAuthenticated: false);

        var handler = new DownloadBookCommandHandler(uow.Object,
            currentUser.Object, new Mock<IFileStorageService>().Object);

        var act = async () => await handler.Handle(new DownloadBookCommand(book.Id), default);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }

    [Fact]
    public async Task Handle_WhenBookNotFound_ShouldThrowNotFoundException()
    {
        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default))
            .ReturnsAsync((Domain.Entities.Book?)null);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new DownloadBookCommandHandler(uow.Object,
            TestMockFactory.CreateCurrentUserService().Object,
            new Mock<IFileStorageService>().Object);

        var act = async () => await handler.Handle(new DownloadBookCommand(Guid.NewGuid()), default);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
