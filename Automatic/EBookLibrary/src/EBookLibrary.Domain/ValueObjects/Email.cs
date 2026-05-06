namespace EBookLibrary.Domain.ValueObjects;

/// <summary>Immutable value object representing a validated email address</summary>
public sealed class Email : IEquatable<Email>
{
    public string Value { get; }

    private Email(string value) => Value = value;

    public static Email Create(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        email = email.Trim().ToLowerInvariant();

        if (email.Length > 256)
            throw new ArgumentException("Email address is too long.", nameof(email));

        if (!email.Contains('@') || !email.Contains('.'))
            throw new ArgumentException("Email address format is invalid.", nameof(email));

        return new Email(email);
    }

    public bool Equals(Email? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => obj is Email other && Equals(other);
    public override int GetHashCode() => Value.GetHashCode();
    public override string ToString() => Value;
    public static implicit operator string(Email email) => email.Value;
}
