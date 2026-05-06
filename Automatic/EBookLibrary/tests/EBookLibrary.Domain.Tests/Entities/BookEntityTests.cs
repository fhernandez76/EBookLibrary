using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using FluentAssertions;

namespace EBookLibrary.Domain.Tests.Entities;

public class BookEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateBook()
    {
        var book = Book.Create("Clean Code", 464, BookLanguage.English);

        book.Id.Should().NotBe(Guid.Empty);
        book.Title.Should().Be("Clean Code");
        book.Pages.Should().Be(464);
        book.Language.Should().Be(BookLanguage.English);
        book.Status.Should().Be(BookStatus.Unavailable);
        book.HasFile.Should().BeFalse();
        book.IsDeleted.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithEmptyOrWhitespaceTitle_ShouldThrowArgumentException(string title)
    {
        var act = () => Book.Create(title, 100);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithNullTitle_ShouldThrowArgumentException()
    {
        var act = () => Book.Create(null!, 100);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetFilePath_WithValidPath_ShouldUpdateStatusToAvailable()
    {
        var book = Book.Create("Test", 100);

        book.SetFilePath("books/test/test.epub");

        book.FilePath.Should().Be("books/test/test.epub");
        book.Status.Should().Be(BookStatus.Available);
        book.HasFile.Should().BeTrue();
        book.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public void SoftDelete_ShouldSetIsDeletedToTrue()
    {
        var book = Book.Create("Test", 100);

        book.SoftDelete();

        book.IsDeleted.Should().BeTrue();
        book.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public void Update_ShouldUpdateAllFields()
    {
        var book = Book.Create("Old Title", 100);

        book.Update("New Title", 250, 2023, "978-3-16-148410-0", "A great book", BookLanguage.English);

        book.Title.Should().Be("New Title");
        book.Pages.Should().Be(250);
        book.PublicationYear.Should().Be(2023);
        book.Isbn.Should().Be("978-3-16-148410-0");
        book.Language.Should().Be(BookLanguage.English);
    }

    [Fact]
    public void HasFile_WithoutFilePath_ShouldBeFalse()
    {
        var book = Book.Create("Test", 100);
        book.HasFile.Should().BeFalse();
    }

    [Fact]
    public void MarkAsUnavailable_ShouldSetStatusUnavailable()
    {
        var book = Book.Create("Test", 100);
        book.SetFilePath("books/test.epub");
        book.Status.Should().Be(BookStatus.Available);

        book.MarkAsUnavailable();

        book.Status.Should().Be(BookStatus.Unavailable);
    }
}
