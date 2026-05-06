using EBookLibrary.Application.Auth.Commands.RegisterUser;
using FluentAssertions;

namespace EBookLibrary.Application.Tests.Validators;

public class RegisterUserCommandValidatorTests
{
    private readonly RegisterUserCommandValidator _validator = new();

    [Theory]
    [InlineData("valid@email.com", "Strong@1234", "Strong@1234", true)]
    [InlineData("invalid-email", "Strong@1234", "Strong@1234", false)]
    [InlineData("valid@email.com", "weak", "weak", false)]
    [InlineData("valid@email.com", "Strong@1234", "Different@1234", false)]
    [InlineData("", "Strong@1234", "Strong@1234", false)]
    public void Validate_ShouldMatchExpectedResult(
        string email, string password, string confirm, bool isValid)
    {
        var command = new RegisterUserCommand(email, password, confirm, null, null);
        var result = _validator.Validate(command);
        result.IsValid.Should().Be(isValid);
    }

    [Fact]
    public void Validate_PasswordWithoutUppercase_ShouldFail()
    {
        var command = new RegisterUserCommand("u@t.com", "alllower@1", "alllower@1", null, null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage.Contains("uppercase"));
    }

    [Fact]
    public void Validate_PasswordWithoutSpecialChar_ShouldFail()
    {
        var command = new RegisterUserCommand("u@t.com", "NoSpecial1", "NoSpecial1", null, null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_MismatchedPasswords_ShouldFail()
    {
        var command = new RegisterUserCommand("u@t.com", "Strong@1234", "Different@5678", null, null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage.Contains("do not match"));
    }
}
