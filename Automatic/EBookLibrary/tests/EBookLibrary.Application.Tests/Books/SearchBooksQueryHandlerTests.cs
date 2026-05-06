using AutoMapper;
using EBookLibrary.Application.Books.Queries.SearchBooks;
using EBookLibrary.Application.Books.DTOs;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Books;

public class SearchBooksQueryHandlerTests
{
    private static IMapper CreateMapper()
    {
        // Mock the mapper to avoid the AutoMapper record constructor limitation in unit tests
        // (Navigation properties are null in unit test entity builders)
        var mapper = new Mock<IMapper>();
        mapper.Setup(m => m.Map<IEnumerable<BookSummaryDto>>(It.IsAny<IEnumerable<Domain.Entities.Book>>()))
            .Returns<IEnumerable<Domain.Entities.Book>>(books => books.Select(b =>
                new BookSummaryDto(b.Id, b.Title, b.Pages, b.PublicationYear, null, b.Status.ToString(), b.HasFile, "Unknown", "Unknown")));
        return mapper.Object;
    }

    [Fact]
    public async Task Handle_WithMatchingBooks_ShouldReturnPagedResult()
    {
        var books = Enumerable.Range(1, 5)
            .Select(i => BookBuilder.CreateValid($"Book {i}"))
            .ToList();

        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.SearchAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((books.AsEnumerable(), 25));

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new SearchBooksQueryHandler(uow.Object, CreateMapper());
        var filter = new BookSearchFilterDto("test", null, null, null, 1, 5);

        var result = await handler.Handle(new SearchBooksQuery(filter), default);

        result.Should().NotBeNull();
        result.Items.Should().HaveCount(5);
        result.TotalCount.Should().Be(25);
        result.TotalPages.Should().Be(5);
        result.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WithEmptyResults_ShouldReturnEmptyPagedResult()
    {
        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.SearchAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Enumerable.Empty<Domain.Entities.Book>(), 0));

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new SearchBooksQueryHandler(uow.Object, CreateMapper());

        var result = await handler.Handle(
            new SearchBooksQuery(new BookSearchFilterDto()), default);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_SecondPage_ShouldHavePreviousPage()
    {
        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.SearchAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Enumerable.Empty<Domain.Entities.Book>(), 50));

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new SearchBooksQueryHandler(uow.Object, CreateMapper());
        var filter = new BookSearchFilterDto(PageNumber: 2, PageSize: 20);

        var result = await handler.Handle(new SearchBooksQuery(filter), default);

        result.HasPreviousPage.Should().BeTrue();
        result.PageNumber.Should().Be(2);
    }
}
