using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Interfaces.Repositories;
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
