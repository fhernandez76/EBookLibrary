using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using FluentAssertions;

namespace EBookLibrary.Domain.Tests.Entities;

public class UserEntityTests
{
    [Fact]
    public void Create_WithValidData_ShouldCreateRegularUser()
    {
        var user = User.Create("user@test.com", "hashedpassword");

        user.Email.Should().Be("user@test.com");
        user.Role.Should().Be(UserRole.Regular);
        user.IsActive.Should().BeTrue();
        user.Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void Create_WithMixedCaseEmail_ShouldNormalizeToLowercase()
    {
        var user = User.Create("USER@TEST.COM", "hash");
        user.Email.Should().Be("user@test.com");
    }

    [Fact]
    public void ChangeRole_ToAdmin_ShouldUpdateRole()
    {
        var user = User.Create("user@test.com", "hash");
        user.ChangeRole(UserRole.Admin);
        user.Role.Should().Be(UserRole.Admin);
    }

    [Fact]
    public void Deactivate_ShouldSetIsActiveFalse()
    {
        var user = User.Create("user@test.com", "hash");
        user.Deactivate();
        user.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData("", "hash")]
    [InlineData("user@test.com", "")]
    public void Create_WithEmptyEmailOrHash_ShouldThrow(string email, string hash)
    {
        var act = () => User.Create(email, hash);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void FullName_WhenBothNamesPresentShouldReturnFullName()
    {
        var user = User.Create("u@t.com", "hash");
        user.UpdateProfile("John", "Doe");
        user.FullName.Should().Be("John Doe");
    }

    [Fact]
    public void FullName_WhenNamesNotSet_ShouldReturnEmptyString()
    {
        var user = User.Create("u@t.com", "hash");
        user.FullName.Should().BeEmpty();
    }

    [Fact]
    public void Activate_AfterDeactivate_ShouldSetIsActiveTrue()
    {
        var user = User.Create("u@t.com", "hash");
        user.Deactivate();
        user.Activate();
        user.IsActive.Should().BeTrue();
    }
}
