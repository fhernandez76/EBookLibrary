namespace EBookLibrary.Application.Common.Interfaces;

public interface IPasswordHashService
{
    string HashPassword(string plainText);
    bool VerifyPassword(string plainText, string hash);
}
