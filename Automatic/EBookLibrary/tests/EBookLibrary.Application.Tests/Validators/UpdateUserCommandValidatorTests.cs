using EBookLibrary.Application.Users.Commands.UpdateUser;
using FluentAssertions;

namespace EBookLibrary.Application.Tests.Validators;

public class UpdateUserCommandValidatorTests
{
    private readonly UpdateUserCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_ShouldPass()
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), "John", "Doe", "john@test.com", null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_EmptyUserId_ShouldFail()
    {
        var command = new UpdateUserCommand(Guid.Empty, null, null, "e@test.com", null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_EmptyEmail_ShouldFail()
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), null, null, "", null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Email");
    }

    [Fact]
    public void Validate_InvalidEmail_ShouldFail()
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), null, null, "not-an-email", null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("Strong@1234", true)]
    [InlineData("weak", false)]
    [InlineData("NoSpecial1", false)]
    [InlineData("nouppercase@1", false)]
    [InlineData("NOLOWER@1", false)]
    [InlineData("NoDigit@abc", false)]
    public void Validate_PasswordStrength_ShouldMatchExpected(string password, bool isValid)
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), null, null, "e@test.com", password);
        var result = _validator.Validate(command);
        result.IsValid.Should().Be(isValid);
    }

    [Fact]
    public void Validate_NullPassword_ShouldPassWithoutPasswordValidation()
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), "Alice", null, "alice@test.com", null);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }
}
