# Component 10 — Unit Tests (xUnit)

## AI Prompt Instructions

> **Purpose:** Use this file as input to GitHub Copilot (Claude Sonnet 4.6) to generate the complete unit test suite for EBook Library.
> **Session goal:** Generate xUnit tests covering Domain, Application (CQRS handlers), and API (controllers) layers with Moq for mocking and FluentAssertions for readable assertions.
> **Projects:** `tests/EBookLibrary.Application.Tests/`, `tests/EBookLibrary.Domain.Tests/`, `tests/EBookLibrary.WebApi.Tests/`
> **Prerequisites:** All source projects (Components 02–05) must be complete.

---

## Context

Testing strategy:
- **Domain Tests:** Pure unit tests — no mocks, test entity logic and value objects
- **Application Tests:** Unit tests using Moq to mock repositories/services, test CQRS handlers
- **WebApi Tests:** Controller integration tests using `WebApplicationFactory<Program>` and in-memory SQLite
- **Coverage target:** >80% on Application layer handlers
- **Tools:** xUnit, Moq 4.x, FluentAssertions, Microsoft.EntityFrameworkCore.InMemory

---

## Task 1 — Test Infrastructure

### File: `EBookLibrary.Application.Tests/TestHelpers/MockFactory.cs`

```csharp
using Moq;

namespace EBookLibrary.Application.Tests.TestHelpers;

/// <summary>Factory for creating mock IUnitOfWork with all sub-repositories</summary>
public static class TestMockFactory
{
    public static Mock<IUnitOfWork> CreateUnitOfWork(
        Mock<IBookRepository>? books = null,
        Mock<IAuthorRepository>? authors = null,
        Mock<IGenreRepository>? genres = null,
        Mock<IUserRepository>? users = null,
        Mock<IBookDownloadRepository>? downloads = null)
    {
        books ??= new Mock<IBookRepository>();
        authors ??= new Mock<IAuthorRepository>();
        genres ??= new Mock<IGenreRepository>();
        users ??= new Mock<IUserRepository>();
        downloads ??= new Mock<IBookDownloadRepository>();

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.Books).Returns(books.Object);
        uow.Setup(u => u.Authors).Returns(authors.Object);
        uow.Setup(u => u.Genres).Returns(genres.Object);
        uow.Setup(u => u.Users).Returns(users.Object);
        uow.Setup(u => u.BookDownloads).Returns(downloads.Object);
        uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        return uow;
    }

    public static Mock<IJwtTokenService> CreateJwtService(
        string returnToken = "mock-jwt-token")
    {
        var mock = new Mock<IJwtTokenService>();
        mock.Setup(s => s.GenerateToken(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(returnToken);
        return mock;
    }

    public static Mock<IPasswordHashService> CreatePasswordHashService(
        string hashedPassword = "hashed-password",
        bool verifyResult = true)
    {
        var mock = new Mock<IPasswordHashService>();
        mock.Setup(s => s.HashPassword(It.IsAny<string>())).Returns(hashedPassword);
        mock.Setup(s => s.VerifyPassword(It.IsAny<string>(), It.IsAny<string>())).Returns(verifyResult);
        return mock;
    }

    public static Mock<ICurrentUserService> CreateCurrentUserService(
        Guid? userId = null, string role = "Regular", bool isAuthenticated = true)
    {
        var id = userId ?? Guid.NewGuid();
        var mock = new Mock<ICurrentUserService>();
        mock.Setup(s => s.UserId).Returns(id);
        mock.Setup(s => s.Role).Returns(role);
        mock.Setup(s => s.IsAuthenticated).Returns(isAuthenticated);
        mock.Setup(s => s.IsAdmin).Returns(role == "Admin");
        return mock;
    }
}
```

### File: `EBookLibrary.Application.Tests/TestHelpers/EntityBuilders.cs`

```csharp
namespace EBookLibrary.Application.Tests.TestHelpers;

/// <summary>Fluent builders for creating test entities</summary>
public static class BookBuilder
{
    public static Book CreateValid(
        string title = "Test Book",
        int pages = 200,
        BookLanguage language = BookLanguage.Spanish)
    {
        var book = Book.Create(title, pages, language);
        return book;
    }

    public static Book CreateWithFile(string filePath = "books/test/book.epub")
    {
        var book = CreateValid();
        book.SetFilePath(filePath);
        return book;
    }
}

public static class AuthorBuilder
{
    public static Author CreateValid(string name = "Test Author")
        => Author.Create(name, "Test biography");
}

public static class UserBuilder
{
    public static User CreateRegular(
        string email = "user@test.com",
        string passwordHash = "hashed-password")
        => User.Create(email, passwordHash);

    public static User CreateAdmin(
        string email = "admin@test.com",
        string passwordHash = "hashed-password")
    {
        var user = User.Create(email, passwordHash);
        user.ChangeRole(UserRole.Admin);
        return user;
    }
}
```

---

## Task 2 — Domain Tests

### File: `EBookLibrary.Domain.Tests/Entities/BookEntityTests.cs`

```csharp
using FluentAssertions;
using Xunit;

namespace EBookLibrary.Domain.Tests.Entities;

public class BookEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateBook()
    {
        // Arrange & Act
        var book = Book.Create("Clean Code", 464, BookLanguage.English);

        // Assert
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
    [InlineData(null)]
    public void Create_WithInvalidTitle_ShouldThrowArgumentException(string? title)
    {
        // Act
        var act = () => Book.Create(title!, 100);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetFilePath_WithValidPath_ShouldUpdateStatusToAvailable()
    {
        // Arrange
        var book = Book.Create("Test", 100);

        // Act
        book.SetFilePath("books/test/test.epub");

        // Assert
        book.FilePath.Should().Be("books/test/test.epub");
        book.Status.Should().Be(BookStatus.Available);
        book.HasFile.Should().BeTrue();
        book.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public void SoftDelete_ShouldSetIsDeletedToTrue()
    {
        // Arrange
        var book = Book.Create("Test", 100);

        // Act
        book.SoftDelete();

        // Assert
        book.IsDeleted.Should().BeTrue();
        book.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public void Update_ShouldUpdateAllFields()
    {
        // Arrange
        var book = Book.Create("Old Title", 100);
        var updateTime = DateTime.UtcNow;

        // Act
        book.Update("New Title", 250, 2023, "978-3-16-148410-0", "A great book", BookLanguage.English);

        // Assert
        book.Title.Should().Be("New Title");
        book.Pages.Should().Be(250);
        book.PublicationYear.Should().Be(2023);
        book.Isbn.Should().Be("978-3-16-148410-0");
        book.Language.Should().Be(BookLanguage.English);
    }
}
```

### File: `EBookLibrary.Domain.Tests/Entities/UserEntityTests.cs`

```csharp
public class UserEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateRegularUser()
    {
        var user = User.Create("user@test.com", "hashedpassword");

        user.Email.Should().Be("user@test.com");
        user.Role.Should().Be(UserRole.Regular);
        user.IsActive.Should().BeTrue();
        user.Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void Create_WithMixedCaseEmail_ShouldNormalizeToLowercase()
    {
        var user = User.Create("USER@TEST.COM", "hash");
        user.Email.Should().Be("user@test.com");
    }

    [Fact]
    public void ChangeRole_ToAdmin_ShouldUpdateRole()
    {
        var user = User.Create("user@test.com", "hash");
        user.ChangeRole(UserRole.Admin);
        user.Role.Should().Be(UserRole.Admin);
    }

    [Fact]
    public void Deactivate_ShouldSetIsActiveFalse()
    {
        var user = User.Create("user@test.com", "hash");
        user.Deactivate();
        user.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData("", "hash")]
    [InlineData("user@test.com", "")]
    public void Create_WithInvalidData_ShouldThrow(string email, string hash)
    {
        // Note: User.Create validates only for empty/whitespace — it does NOT validate email format
        var act = () => User.Create(email, hash);
        act.Should().Throw<Exception>();
    }

    [Fact]
    public void FullName_WhenBothNamesPresentShouldReturnFullName()
    {
        var user = User.Create("u@t.com", "hash");
        user.UpdateProfile("John", "Doe");
        user.FullName.Should().Be("John Doe");
    }
}
```

### File: `EBookLibrary.Domain.Tests/ValueObjects/EmailValueObjectTests.cs`

```csharp
public class EmailValueObjectTests
{
    [Theory]
    [InlineData("user@example.com")]
    [InlineData("USER@EXAMPLE.COM")]
    [InlineData("user+tag@domain.co.uk")]
    public void Create_WithValidEmail_ShouldSucceed(string email)
    {
        var result = Email.Create(email);
        result.Value.Should().Be(email.Trim().ToLowerInvariant());
    }

    [Theory]
    [InlineData("notanemail")]
    [InlineData("@nodomain")]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithInvalidEmail_ShouldThrowArgumentException(string email)
    {
        var act = () => Email.Create(email);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void TwoEmailsWithSameValue_ShouldBeEqual()
    {
        var email1 = Email.Create("user@test.com");
        var email2 = Email.Create("USER@TEST.COM");
        email1.Should().Be(email2);
    }
}
```

---

## Task 3 — Application Layer Tests (Auth Handlers)

### File: `EBookLibrary.Application.Tests/Auth/RegisterUserCommandHandlerTests.cs`

```csharp
using EBookLibrary.Application.Auth.Commands.RegisterUser;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using FluentAssertions;
using Moq;
using Xunit;

namespace EBookLibrary.Application.Tests.Auth;

public class RegisterUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IJwtTokenService> _jwtService;
    private readonly Mock<IPasswordHashService> _passwordHash;
    private readonly RegisterUserCommandHandler _handler;

    public RegisterUserCommandHandlerTests()
    {
        _jwtService = TestMockFactory.CreateJwtService();
        _passwordHash = TestMockFactory.CreatePasswordHashService();

        var uow = TestMockFactory.CreateUnitOfWork(users: _userRepo);
        _handler = new RegisterUserCommandHandler(uow.Object, _passwordHash.Object, _jwtService.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldReturnAuthResponse()
    {
        // Arrange
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>(), default)).Returns(Task.CompletedTask);

        var command = new RegisterUserCommand(
            "test@example.com", "Test@1234", "Test@1234", "John", "Doe");

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be("test@example.com");
        result.Role.Should().Be("Regular");
        result.Token.Should().Be("mock-jwt-token");
        _passwordHash.Verify(p => p.HashPassword("Test@1234"), Times.Once);
        _userRepo.Verify(r => r.AddAsync(It.Is<User>(u => u.Email == "test@example.com"), default), Times.Once);
    }

    [Fact]
    public async Task Handle_WithDuplicateEmail_ShouldThrowValidationException()
    {
        // Arrange
        _userRepo.Setup(r => r.EmailExistsAsync("existing@test.com", default)).ReturnsAsync(true);

        var command = new RegisterUserCommand(
            "existing@test.com", "Test@1234", "Test@1234", null, null);

        // Act
        var act = async () => await _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<ApplicationValidationException>()
            .Where(ex => ex.Errors.ContainsKey("Email"));
    }
}
```

### File: `EBookLibrary.Application.Tests/Auth/LoginUserCommandHandlerTests.cs`

```csharp
public class LoginUserCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCredentials_ShouldReturnAuthResponse()
    {
        // Arrange
        var user = UserBuilder.CreateRegular("user@test.com", "hashed");
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("user@test.com", default)).ReturnsAsync(user);

        var passwordHash = TestMockFactory.CreatePasswordHashService(verifyResult: true);
        var jwtService = TestMockFactory.CreateJwtService("test-token");
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new LoginUserCommandHandler(uow.Object, passwordHash.Object, jwtService.Object);

        // Act
        var result = await handler.Handle(new LoginUserCommand("user@test.com", "Test@1234"), default);

        // Assert
        result.Token.Should().Be("test-token");
        result.Email.Should().Be("user@test.com");
    }

    [Fact]
    public async Task Handle_WithWrongPassword_ShouldThrowValidationException()
    {
        var user = UserBuilder.CreateRegular();
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync(user);

        var passwordHash = TestMockFactory.CreatePasswordHashService(verifyResult: false);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object, passwordHash.Object, 
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("u@t.com", "wrong"), default);
        await act.Should().ThrowAsync<ApplicationValidationException>();
    }

    [Fact]
    public async Task Handle_WithUnknownEmail_ShouldThrowValidationException()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync((User?)null);

        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object,
            TestMockFactory.CreatePasswordHashService().Object,
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("nobody@test.com", "pass"), default);
        await act.Should().ThrowAsync<ApplicationValidationException>();
    }

    [Fact]
    public async Task Handle_WithDeactivatedAccount_ShouldThrowForbiddenException()
    {
        var user = UserBuilder.CreateRegular();
        user.Deactivate();

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync(user);

        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object,
            TestMockFactory.CreatePasswordHashService(verifyResult: true).Object,
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("u@t.com", "pass"), default);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }
}
```

---

## Task 4 — Application Layer Tests (Book Handlers)

### File: `EBookLibrary.Application.Tests/Books/SearchBooksQueryHandlerTests.cs`

```csharp
public class SearchBooksQueryHandlerTests
{
    [Fact]
    public async Task Handle_WithValidFilter_ShouldReturnPagedResult()
    {
        // Arrange
        var books = Enumerable.Range(1, 5)
            .Select(i => BookBuilder.CreateValid($"Book {i}"))
            .ToList();

        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.SearchAsync(
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<int?>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((books.AsEnumerable(), 25));

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);

        // Use Mock<IMapper> instead of MapperConfiguration:
        // AutoMapper 13 with positional record DTOs (BookSummaryDto) fails when
        // navigation properties are null during unit tests.
        var mapper = new Mock<IMapper>();
        mapper.Setup(m => m.Map<BookSummaryDto>(It.IsAny<Book>()))
              .Returns(new BookSummaryDto(Guid.NewGuid(), "Test", 0, BookLanguage.English,
                  BookStatus.Available, false, null, null));

        var handler = new SearchBooksQueryHandler(uow.Object, mapper.Object);
        var filter = new BookSearchFilterDto("test", null, null, null, 1, 5);

        // Act
        var result = await handler.Handle(new SearchBooksQuery(filter), default);

        // Assert
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
            .ReturnsAsync((Enumerable.Empty<Book>(), 0));

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var mapper = new Mock<IMapper>();
        var handler = new SearchBooksQueryHandler(uow.Object, mapper.Object);

        var result = await handler.Handle(
            new SearchBooksQuery(new BookSearchFilterDto()), default);

        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }
}
```

### File: `EBookLibrary.Application.Tests/Books/DownloadBookCommandHandlerTests.cs`

```csharp
public class DownloadBookCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithAvailableBook_ShouldReturnFilePath()
    {
        // Arrange
        var book = BookBuilder.CreateWithFile("books/test/book.epub");
        var userId = Guid.NewGuid();

        var bookRepo = new Mock<IBookRepository>();
        bookRepo.Setup(r => r.GetByIdAsync(book.Id, default)).ReturnsAsync(book);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var currentUser = TestMockFactory.CreateCurrentUserService(userId: userId);

        var fileStorage = new Mock<IFileStorageService>();
        fileStorage.Setup(f => f.GetAbsolutePath("books/test/book.epub"))
            .Returns(@"C:\books\test\book.epub");

        var handler = new DownloadBookCommandHandler(uow.Object, currentUser.Object, fileStorage.Object);

        // Act
        var result = await handler.Handle(new DownloadBookCommand(book.Id), default);

        // Assert
        result.Should().NotBeNull();
        result.AbsoluteFilePath.Should().Be(@"C:\books\test\book.epub");
        result.FileName.Should().Be("book.epub");
    }

    [Fact]
    public async Task Handle_WhenBookHasNoFile_ShouldThrowNotFoundException()
    {
        var book = BookBuilder.CreateValid(); // No file set
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
    public async Task Handle_WhenNotAuthenticated_ShouldThrowForbiddenException()
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
        bookRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Book?)null);

        var uow = TestMockFactory.CreateUnitOfWork(books: bookRepo);
        var handler = new DownloadBookCommandHandler(uow.Object,
            TestMockFactory.CreateCurrentUserService().Object,
            new Mock<IFileStorageService>().Object);

        var act = async () => await handler.Handle(new DownloadBookCommand(Guid.NewGuid()), default);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```

### File: `EBookLibrary.Application.Tests/Books/CreateBookCommandHandlerTests.cs`

```csharp
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
        authorRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Author?)null);

        var uow = TestMockFactory.CreateUnitOfWork(authors: authorRepo);
        var handler = new CreateBookCommandHandler(uow.Object);

        var command = new CreateBookCommand(
            "Book", 100, null, null, null, "Spanish",
            new List<Guid> { Guid.NewGuid() }, new List<Guid>());

        var act = async () => await handler.Handle(command, default);
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
```

---

## Task 5 — FluentValidation Tests

### File: `EBookLibrary.Application.Tests/Validators/RegisterUserCommandValidatorTests.cs`

```csharp
public class RegisterUserCommandValidatorTests
{
    private readonly RegisterUserCommandValidator _validator = new();

    [Theory]
    [InlineData("valid@email.com", "Strong@1234", "Strong@1234", true)]
    [InlineData("invalid-email", "Strong@1234", "Strong@1234", false)]
    [InlineData("valid@email.com", "weak", "weak", false)]
    [InlineData("valid@email.com", "Strong@1234", "Different@1234", false)]
    [InlineData("", "Strong@1234", "Strong@1234", false)]
    public void Validate_ShouldMatchExpectedResult(
        string email, string password, string confirm, bool isValid)
    {
        var command = new RegisterUserCommand(email, password, confirm, null, null);
        var result = _validator.Validate(command);
        result.IsValid.Should().Be(isValid);
    }
}
```

### File: `EBookLibrary.Application.Tests/Validators/ToggleUserStatusCommandValidatorTests.cs`

Tests: valid command, same userId rejected, empty UserId rejected, empty RequestingUserId rejected.

```csharp
public class ToggleUserStatusCommandValidatorTests
{
    private readonly ToggleUserStatusCommandValidator _validator = new();

    [Fact]
    public void Validate_ShouldFail_WhenUserIdEqualsRequestingUserId()
    {
        var id = Guid.NewGuid();
        var result = _validator.Validate(new ToggleUserStatusCommand(id, id));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage.Contains("own account"));
    }

    [Fact]
    public void Validate_ShouldPass_WhenDifferentIds()
    {
        var result = _validator.Validate(new ToggleUserStatusCommand(Guid.NewGuid(), Guid.NewGuid()));
        result.IsValid.Should().BeTrue();
    }
}
```

### File: `EBookLibrary.Application.Tests/Validators/UpdateUserCommandValidatorTests.cs`

Tests: valid command, empty email, invalid email format, password too short, password missing uppercase, valid with no password.

### File: `EBookLibrary.Application.Tests/Validators/DeleteUserCommandValidatorTests.cs`

Tests: valid command, same userId rejected, empty UserId rejected, empty RequestingUserId rejected.

---

## Task 6 — WebApi Integration Tests

### File: `EBookLibrary.WebApi.Tests/Controllers/UsersControllerTests.cs`

Cover all three new admin endpoints using `WebApplicationFactory<Program>` with an in-memory database and an admin JWT. Tests include:

| Test | Expected |
|---|---|
| `ToggleStatus_WithoutAuth_Returns401` | 401 |
| `ToggleStatus_AsAdmin_Returns204` | 204 |
| `ToggleStatus_ForSelf_Returns400` | 400 |
| `ToggleStatus_ForUnknownUser_Returns404` | 404 |
| `UpdateUser_WithoutAuth_Returns401` | 401 |
| `UpdateUser_AsAdmin_Returns200WithDto` | 200 + UserDto |
| `UpdateUser_DuplicateEmail_Returns400` | 400 |
| `UpdateUser_ForUnknownUser_Returns404` | 404 |
| `DeleteUser_WithoutAuth_Returns401` | 401 |
| `DeleteUser_AsAdmin_Returns204` | 204 |
| `DeleteUser_ForSelf_Returns400` | 400 |
| `DeleteUser_ForUnknownUser_Returns404` | 404 |

### File: `EBookLibrary.WebApi.Tests/Controllers/BooksControllerTests.cs`

```csharp
using EBookLibrary.Infrastructure.Persistence;
using EBookLibrary.WebApi.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EBookLibrary.WebApi.Tests.Controllers;

/// <summary>
/// Integration tests using WebApplicationFactory with in-memory database.
/// Tests the full HTTP pipeline: routing, serialization, auth middleware.
/// </summary>
public class BooksControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BooksControllerTests(WebApplicationFactory<Program> factory)
    {
        // IMPORTANT: Capture dbName OUTSIDE the lambda so all requests share the same InMemory database.
        // If Guid.NewGuid() were inside the lambda, EF Core would evaluate it per DbContextOptions
        // creation (once per request), giving each HTTP request a different database.
        var dbName = "BooksTestDb_" + Guid.NewGuid();
        _factory = factory.WithWebHostBuilder(builder =>
        {
            // UseEnvironment("Test") prevents Program.cs from calling MigrateAsync()
            // inside the IsDevelopment() block — MigrateAsync() is relational-only and
            // throws "Relational-specific methods can only be used for relational database providers"
            // when the InMemory provider is active.
            builder.UseEnvironment("Test");
            builder.ConfigureServices(services =>
            {
                // Replace SQL Server with InMemory for testing
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(dbName));
            });
        });
    }

    [Fact]
    public async Task SearchBooks_WithNoFilter_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/books/search");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBookById_WithInvalidId_Returns404()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync($"/api/books/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Download_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync($"/api/books/{Guid.NewGuid()}/download");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateBook_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/books",
            new { title = "Test", pages = 100, language = "Spanish", authorIds = Array.Empty<Guid>(), genreIds = Array.Empty<Guid>() });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

### File: `EBookLibrary.WebApi.Tests/Controllers/AuthControllerTests.cs`

```csharp
using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Infrastructure.Persistence;
using EBookLibrary.WebApi.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;  // required for UseEnvironment on IWebHostBuilder
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace EBookLibrary.WebApi.Tests.Controllers;

public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthControllerTests(WebApplicationFactory<Program> factory)
    {
        // IMPORTANT: Capture dbName OUTSIDE the lambda.
        // If Guid.NewGuid() is inside the AddDbContext lambda, EF Core evaluates it
        // per DbContextOptions creation (once per HTTP request), meaning each request
        // gets a different InMemory database — breaking any test that relies on
        // state persisted across requests (e.g. Register then Login).
        var dbName = "AuthTestDb_" + Guid.NewGuid();
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Test"); // skips IsDevelopment() → MigrateAsync() in Program.cs
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(dbName));
            });
        });
    }

    [Fact]
    public async Task Register_WithValidData_Returns201()
    {
        var client = _factory.CreateClient();
        var payload = new
        {
            email = $"test_{Guid.NewGuid():N}@test.com",
            password = "Test@1234",
            confirmPassword = "Test@1234",
            firstName = "Test",
            lastName = "User"
        };

        var response = await client.PostAsJsonAsync("/api/auth/register", payload);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        // Note: actual DTO type is AuthResponseDto (not AuthResponse)
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        body!.Success.Should().BeTrue();
        body.Data!.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Register_WithInvalidEmail_Returns400()
    {
        var client = _factory.CreateClient();
        var payload = new { email = "not-an-email", password = "Test@1234", confirmPassword = "Test@1234" };
        var response = await client.PostAsJsonAsync("/api/auth/register", payload);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithWeakPassword_Returns400()
    {
        var client = _factory.CreateClient();
        var payload = new { email = "weak@test.com", password = "weak", confirmPassword = "weak" };
        var response = await client.PostAsJsonAsync("/api/auth/register", payload);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_Returns400()
    {
        var client = _factory.CreateClient();
        var payload = new { email = "nobody@test.com", password = "Test@1234" };
        var response = await client.PostAsJsonAsync("/api/auth/login", payload);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_Returns400()
    {
        var client = _factory.CreateClient();
        var email = $"dup_{Guid.NewGuid():N}@test.com";
        var payload = new { email, password = "Test@1234", confirmPassword = "Test@1234" };

        // First register must succeed
        var first = await client.PostAsJsonAsync("/api/auth/register", payload);
        first.StatusCode.Should().Be(HttpStatusCode.Created);

        // Second register with same email must fail
        var second = await client.PostAsJsonAsync("/api/auth/register", payload);
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_AfterRegister_Returns200WithToken()
    {
        var client = _factory.CreateClient();
        var email = $"login_{Guid.NewGuid():N}@test.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "Test@1234",
            confirmPassword = "Test@1234"
        });
        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Test@1234"
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await loginResponse.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        body!.Success.Should().BeTrue();
        body.Data!.Token.Should().NotBeNullOrWhiteSpace();
    }
}
```

---

## Task 7 — Service Tests

### File: `EBookLibrary.Application.Tests/Services/JwtTokenServiceTests.cs`

Test this in the Infrastructure.Tests project (create if needed) or use a simple unit test:

```csharp
// Create EBookLibrary.Infrastructure.Tests project
// Add Microsoft.Extensions.Options.ConfigurationExtensions

public class JwtTokenServiceTests
{
    private JwtTokenService CreateService(string secretKey = "this-is-a-test-secret-key-for-unit-tests-64chars!!!!!!!!!")
    {
        var settings = Options.Create(new JwtSettings
        {
            SecretKey = secretKey,
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryInMinutes = 60
        });
        return new JwtTokenService(settings);
    }

    [Fact]
    public void GenerateToken_WithValidInputs_ShouldReturnNonEmptyString()
    {
        var service = CreateService();
        var token = service.GenerateToken(Guid.NewGuid(), "user@test.com", "Regular");
        token.Should().NotBeNullOrWhiteSpace();
        token.Split('.').Should().HaveCount(3); // JWT has 3 parts
    }

    [Fact]
    public void ValidateToken_WithValidToken_ShouldReturnTrueAndCorrectUserId()
    {
        var service = CreateService();
        var userId = Guid.NewGuid();
        var token = service.GenerateToken(userId, "user@test.com", "Regular");

        var isValid = service.ValidateToken(token, out var extractedUserId);

        isValid.Should().BeTrue();
        extractedUserId.Should().Be(userId);
    }

    [Fact]
    public void ValidateToken_WithExpiredToken_ShouldReturnFalse()
    {
        var settings = Options.Create(new JwtSettings
        {
            SecretKey = "this-is-a-test-secret-key-for-unit-tests-64chars!!!!!!!!!",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryInMinutes = -1 // Already expired
        });
        var service = new JwtTokenService(settings);
        var token = service.GenerateToken(Guid.NewGuid(), "user@test.com", "Regular");

        var isValid = service.ValidateToken(token, out _);
        isValid.Should().BeFalse();
    }
}
```

---

## Task 8 — Run All Tests

```bash
# From solution root
cd EBookLibrary

# Run all tests
dotnet test

# Run with coverage (requires coverlet)
dotnet tool install --global dotnet-coverage
dotnet test --collect:"XPlat Code Coverage"

# Generate HTML coverage report
dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage-report

# Run specific project
dotnet test tests/EBookLibrary.Application.Tests

# Run tests matching a pattern
dotnet test --filter "FullyQualifiedName~LoginUser"
```

---

## Deliverables Checklist

- [ ] `EBookLibrary.Application.Tests` project builds and runs
- [ ] `EBookLibrary.Domain.Tests` project builds and runs
- [ ] `EBookLibrary.WebApi.Tests` project builds and runs
- [ ] `MockFactory.cs` with helpers for all mock objects
- [ ] `EntityBuilders.cs` with fluent entity builders
- [ ] `BookEntityTests` — Create valid, invalid title, SetFilePath, SoftDelete, Update
- [ ] `UserEntityTests` — Create, email normalization, ChangeRole, Deactivate
- [ ] `EmailValueObjectTests` — valid formats, invalid formats, equality
- [ ] `RegisterUserCommandHandlerTests` — success, duplicate email
- [ ] `LoginUserCommandHandlerTests` — success, wrong password, unknown email, deactivated
- [ ] `SearchBooksQueryHandlerTests` — results, empty results
- [ ] `DownloadBookCommandHandlerTests` — success, no file, not authenticated, not found
- [ ] `CreateBookCommandHandlerTests` — success, invalid author
- [ ] `RegisterUserCommandValidatorTests` — multiple cases with Theory
- [ ] `ToggleUserStatusCommandValidatorTests` — self-target rejected
- [ ] `UpdateUserCommandValidatorTests` — email format, password strength
- [ ] `DeleteUserCommandValidatorTests` — self-target rejected
- [ ] `ToggleUserStatusCommandHandlerTests` — activate, deactivate, not found
- [ ] `UpdateUserCommandHandlerTests` — valid update, same email, duplicate email, password change, not found
- [ ] `DeleteUserCommandHandlerTests` — valid delete, not found
- [ ] `BooksControllerTests` — integration tests with WebApplicationFactory
- [ ] `AuthControllerTests` — register, login integration tests
- [ ] `UsersControllerTests` — 12 integration tests covering status toggle, edit, delete (auth + success + error cases)
- [ ] `JwtTokenServiceTests` — generate, validate, expired
- [ ] `dotnet test` passes with 0 failures
- [ ] Coverage report shows >80% on Application layer handlers

---

*Component 10 of 10 — EBook Library Project*
