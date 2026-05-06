using EBookLibrary.Application.Common.Interfaces;
using Microsoft.Extensions.Options;

namespace EBookLibrary.Infrastructure.Services;

public class FileStorageService(IOptions<FileStorageSettings> options) : IFileStorageService
{
    private readonly FileStorageSettings _settings = options.Value;

    public async Task<string> SaveBookFileAsync(Stream fileStream, string originalFileName,
        string genreName, CancellationToken ct = default)
    {
        var sanitizedName = SanitizeFileName(Path.GetFileNameWithoutExtension(originalFileName));
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();

        if (!_settings.AllowedExtensions.Contains(extension))
            throw new ArgumentException($"File extension '{extension}' is not allowed.");

        var sanitizedGenre = SanitizeFileName(genreName);
        var relativePath = Path.Combine("books", sanitizedGenre, $"{sanitizedName}{extension}");
        var absolutePath = Path.Combine(_settings.BasePath, relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using var fileOutput = new FileStream(absolutePath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(fileOutput, ct);

        return relativePath.Replace('\\', '/'); // Always store with forward slashes
    }

    public string GetAbsolutePath(string relativePath)
        => Path.Combine(_settings.BasePath, relativePath.Replace('/', Path.DirectorySeparatorChar));

    public bool FileExists(string relativePath)
        => File.Exists(GetAbsolutePath(relativePath));

    public async Task DeleteFileAsync(string relativePath, CancellationToken ct = default)
    {
        var absolutePath = GetAbsolutePath(relativePath);
        if (File.Exists(absolutePath))
            await Task.Run(() => File.Delete(absolutePath), ct);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name
            .ToLowerInvariant()
            .Replace(' ', '-')
            .Where(c => !invalid.Contains(c)));
    }
}
