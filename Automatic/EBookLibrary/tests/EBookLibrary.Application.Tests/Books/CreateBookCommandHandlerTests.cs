using EBookLibrary.Application.Books.Commands.CreateBook;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Books;

public class CreateBookCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_ShouldReturnNewBookId()
    {
        var author = AuthorBuilder.CreateValid();
        var genre = Genre.Create("Fiction");

        var bookRepo = new Mock<IBookRepository>();
        var authorRepo = new Mock<IAuthorRepository>();
        var genreRepo = new Mock<IGenreRepository>();

        authorRepo.Setup(r => r.GetByIdAsync(author.Id, default)).ReturnsAsync(author);
        genreRepo.Setup(r => r.GetByIdAsync(genre.Id, default)).ReturnsAsync(genre);
        bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>(), default)).Returns(Task.CompletedTask);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo, authors: authorRepo, genres: genreRepo);
        var handler = new CreateBookCommandHandler(uow.Object);

        var command = new CreateBookCommand(
            "Test Book", 300, 2023, "978-0-123456-78-9", "A description",
            "Spanish", new List<Guid> { author.Id }, new List<Guid> { genre.Id });

        var result = await handler.Handle(command, default);

        result.Should().NotBe(Guid.Empty);
        bookRepo.Verify(r => r.AddAsync(It.Is<Book>(b => b.Title == "Test Book"), default), Times.Once);
    }

    [Fact]
    public async Task Handle_WithInvalidAuthorId_ShouldThrowNotFoundException()
    {
        var authorRepo = new Mock<IAuthorRepository>();
        authorRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default))
            .ReturnsAsync((Author?)null);

        var uow = TestMockFactory.CreateUnitOfWork(authors: authorRepo);
        var handler = new CreateBookCommandHandler(uow.Object);

        var command = new CreateBookCommand(
            "Book", 100, null, null, null, "Spanish",
            new List<Guid> { Guid.NewGuid() }, new List<Guid>());

        var act = async () => await handler.Handle(command, default);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task Handle_WithMultipleAuthors_ShouldAddAllAuthors()
    {
        var author1 = AuthorBuilder.CreateValid("Author One");
        var author2 = AuthorBuilder.CreateValid("Author Two");
        var genre = Genre.Create("Genre");

        var bookRepo = new Mock<IBookRepository>();
        var authorRepo = new Mock<IAuthorRepository>();
        var genreRepo = new Mock<IGenreRepository>();

        authorRepo.Setup(r => r.GetByIdAsync(author1.Id, default)).ReturnsAsync(author1);
        authorRepo.Setup(r => r.GetByIdAsync(author2.Id, default)).ReturnsAsync(author2);
        genreRepo.Setup(r => r.GetByIdAsync(genre.Id, default)).ReturnsAsync(genre);

        Book? capturedBook = null;
        bookRepo.Setup(r => r.AddAsync(It.IsAny<Book>(), default))
            .Callback<Book, CancellationToken>((b, _) => capturedBook = b)
            .Returns(Task.CompletedTask);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo, authors: authorRepo, genres: genreRepo);
        var handler = new CreateBookCommandHandler(uow.Object);

        var command = new CreateBookCommand(
            "Multi-Author Book", 200, null, null, null, "English",
            new List<Guid> { author1.Id, author2.Id }, new List<Guid> { genre.Id });

        await handler.Handle(command, default);

        capturedBook!.BookAuthors.Should().HaveCount(2);
    }
}
