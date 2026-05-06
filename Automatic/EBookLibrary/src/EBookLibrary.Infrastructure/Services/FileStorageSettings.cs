namespace EBookLibrary.Infrastructure.Services;

public class FileStorageSettings
{
    public string BasePath { get; set; } = string.Empty;
    public List<string> AllowedExtensions { get; set; } = new() { ".epub" };
}
