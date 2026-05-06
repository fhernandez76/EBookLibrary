using EBookLibrary.Domain.Common;
using EBookLibrary.Domain.Enums;

namespace EBookLibrary.Domain.Entities;

public sealed class User : BaseEntity
{
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string? FirstName { get; private set; }
    public string? LastName { get; private set; }
    public UserRole Role { get; private set; } = UserRole.Regular;
    public bool IsActive { get; private set; } = true;

    public ICollection<BookDownload> Downloads { get; private set; } = [];

    private User() { }

    public static User Create(string email, string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash, nameof(passwordHash));

        return new User
        {
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash
        };
    }

    public void UpdateProfile(string? firstName, string? lastName)
    {
        FirstName = firstName?.Trim();
        LastName = lastName?.Trim();
        MarkAsUpdated();
    }

    public void ChangeRole(UserRole newRole) { Role = newRole; MarkAsUpdated(); }
    public void Deactivate() { IsActive = false; MarkAsUpdated(); }
    public void Activate() { IsActive = true; MarkAsUpdated(); }

    public void UpdateEmail(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        Email = email.Trim().ToLowerInvariant();
        MarkAsUpdated();
    }

    public void ResetPassword(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash, nameof(passwordHash));
        PasswordHash = passwordHash;
        MarkAsUpdated();
    }

    public string FullName => string.Join(" ", new string?[] { FirstName, LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
