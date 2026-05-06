using EBookLibrary.Application.Auth.Commands.LoginUser;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Auth;

public class LoginUserCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCredentials_ShouldReturnAuthResponseDto()
    {
        var user = UserBuilder.CreateRegular("user@test.com", "hashed");
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("user@test.com", default)).ReturnsAsync(user);

        var passwordHash = TestMockFactory.CreatePasswordHashService(verifyResult: true);
        var jwtService = TestMockFactory.CreateJwtService("test-token");
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new LoginUserCommandHandler(uow.Object, passwordHash.Object, jwtService.Object);

        var result = await handler.Handle(new LoginUserCommand("user@test.com", "Test@1234"), default);

        result.Token.Should().Be("test-token");
        result.Email.Should().Be("user@test.com");
        result.Role.Should().Be("Regular");
    }

    [Fact]
    public async Task Handle_WithWrongPassword_ShouldThrowApplicationValidationException()
    {
        var user = UserBuilder.CreateRegular();
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync(user);

        var passwordHash = TestMockFactory.CreatePasswordHashService(verifyResult: false);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object, passwordHash.Object,
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("u@t.com", "wrong"), default);
        await act.Should().ThrowAsync<ApplicationValidationException>();
    }

    [Fact]
    public async Task Handle_WithUnknownEmail_ShouldThrowApplicationValidationException()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default))
            .ReturnsAsync((Domain.Entities.User?)null);

        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object,
            TestMockFactory.CreatePasswordHashService().Object,
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("nobody@test.com", "pass"), default);
        await act.Should().ThrowAsync<ApplicationValidationException>();
    }

    [Fact]
    public async Task Handle_WithDeactivatedAccount_ShouldThrowForbiddenAccessException()
    {
        var user = UserBuilder.CreateRegular();
        user.Deactivate();

        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), default)).ReturnsAsync(user);

        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var handler = new LoginUserCommandHandler(uow.Object,
            TestMockFactory.CreatePasswordHashService(verifyResult: true).Object,
            TestMockFactory.CreateJwtService().Object);

        var act = async () => await handler.Handle(new LoginUserCommand("u@t.com", "pass"), default);
        await act.Should().ThrowAsync<ForbiddenAccessException>();
    }
}
