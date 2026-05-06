using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;

namespace EBookLibrary.Application.Tests.TestHelpers;

/// <summary>Builders for creating test entities with sensible defaults</summary>
public static class BookBuilder
{
    public static Book CreateValid(
        string title = "Test Book",
        int pages = 200,
        BookLanguage language = BookLanguage.Spanish)
        => Book.Create(title, pages, language);

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
