using EBookLibrary.Domain.ValueObjects;
using FluentAssertions;

namespace EBookLibrary.Domain.Tests.ValueObjects;

public class EmailValueObjectTests
{
    [Theory]
    [InlineData("user@example.com")]
    [InlineData("USER@EXAMPLE.COM")]
    [InlineData("user+tag@domain.co.uk")]
    public void Create_WithValidEmail_ShouldSucceed(string email)
    {
        var result = Email.Create(email);
        result.Value.Should().Be(email.Trim().ToLowerInvariant());
    }

    [Theory]
    [InlineData("notanemail")]
    [InlineData("@nodomain")]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithInvalidEmail_ShouldThrowArgumentException(string email)
    {
        var act = () => Email.Create(email);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithNullEmail_ShouldThrowArgumentException()
    {
        var act = () => Email.Create(null!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void TwoEmailsWithSameValue_ShouldBeEqual()
    {
        var email1 = Email.Create("user@test.com");
        var email2 = Email.Create("USER@TEST.COM");
        email1.Should().Be(email2);
    }

    [Fact]
    public void TwoEmailsWithDifferentValues_ShouldNotBeEqual()
    {
        var email1 = Email.Create("a@test.com");
        var email2 = Email.Create("b@test.com");
        email1.Should().NotBe(email2);
    }

    [Fact]
    public void ImplicitStringConversion_ShouldReturnValue()
    {
        var email = Email.Create("user@test.com");
        string str = email;
        str.Should().Be("user@test.com");
    }
}
