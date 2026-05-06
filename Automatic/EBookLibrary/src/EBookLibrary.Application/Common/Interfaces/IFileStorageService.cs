namespace EBookLibrary.Application.Common.Interfaces;

public interface IFileStorageService
{
    /// <summary>Saves an ePub file stream and returns the relative path stored in the DB.</summary>
    Task<string> SaveBookFileAsync(Stream fileStream, string originalFileName, string genreName, CancellationToken ct = default);

    /// <summary>Returns the absolute path for a book so the controller can stream it.</summary>
    string GetAbsolutePath(string relativePath);

    bool FileExists(string relativePath);
    Task DeleteFileAsync(string relativePath, CancellationToken ct = default);
}
