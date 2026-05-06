using EBookLibrary.Application.Users.Commands.DeleteUser;
using FluentAssertions;

namespace EBookLibrary.Application.Tests.Validators;

public class DeleteUserCommandValidatorTests
{
    private readonly DeleteUserCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_ShouldPass()
    {
        var command = new DeleteUserCommand(Guid.NewGuid(), Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_EmptyUserId_ShouldFail()
    {
        var command = new DeleteUserCommand(Guid.Empty, Guid.NewGuid());
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "UserId");
    }

    [Fact]
    public void Validate_EmptyRequestingUserId_ShouldFail()
    {
        var command = new DeleteUserCommand(Guid.NewGuid(), Guid.Empty);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "RequestingUserId");
    }

    [Fact]
    public void Validate_SameUserIdAndRequestingUserId_ShouldFail()
    {
        var sameId = Guid.NewGuid();
        var command = new DeleteUserCommand(sameId, sameId);
        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorMessage.Contains("own account"));
    }
}
