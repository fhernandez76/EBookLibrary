using EBookLibrary.Application.Common.Interfaces;

namespace EBookLibrary.Infrastructure.Services;

public class PasswordHashService : IPasswordHashService
{
    public string HashPassword(string plainText)
        => BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: 12);

    public bool VerifyPassword(string plainText, string hash)
        => BCrypt.Net.BCrypt.Verify(plainText, hash);
}
