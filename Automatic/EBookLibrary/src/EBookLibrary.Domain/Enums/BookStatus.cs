namespace EBookLibrary.Domain.Enums;

public enum BookStatus
{
    Available = 1,      // ePub file exists on disk
    Unavailable = 2,    // File not yet uploaded
    Removed = 3         // Soft-deleted
}
