using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Application.Users.Commands.UpdateUser;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Users;

public class UpdateUserCommandHandlerTests
{
    [Fact]
    public async Task Handle_ValidUpdate_ShouldUpdateUserAndReturnDto()
    {
        var user = UserBuilder.CreateRegular("old@test.com");
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        userRepo.Setup(r => r.EmailExistsAsync("new@test.com", default)).ReturnsAsync(false);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var passwordHash = TestMockFactory.CreatePasswordHashService();

        var handler = new UpdateUserCommandHandler(uow.Object, passwordHash.Object);
        var result = await handler.Handle(
            new UpdateUserCommand(user.Id, "John", "Doe", "new@test.com", null), default);

        result.Email.Should().Be("new@test.com");
        result.FirstName.Should().Be("John");
        result.LastName.Should().Be("Doe");
        userRepo.Verify(r => r.UpdateAsync(user, default), Times.Once);
        uow.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_SameEmail_ShouldNotCheckEmailUniqueness()
    {
        var user = UserBuilder.CreateRegular("same@test.com");
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new UpdateUserCommandHandler(uow.Object, TestMockFactory.CreatePasswordHashService().Object);
        await handler.Handle(new UpdateUserCommand(user.Id, null, null, "same@test.com", null), default);

        userRepo.Verify(r => r.EmailExistsAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task Handle_DuplicateEmail_ShouldThrowApplicationValidationException()
    {
        var user = UserBuilder.CreateRegular("old@test.com");
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        userRepo.Setup(r => r.EmailExistsAsync("taken@test.com", default)).ReturnsAsync(true);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new UpdateUserCommandHandler(uow.Object, TestMockFactory.CreatePasswordHashService().Object);
        var act = async () => await handler.Handle(
            new UpdateUserCommand(user.Id, null, null, "taken@test.com", null), default);

        await act.Should().ThrowAsync<ApplicationValidationException>()
            .Where(e => e.Errors.ContainsKey("Email"));
    }

    [Fact]
    public async Task Handle_WithNewPassword_ShouldHashAndResetPassword()
    {
        var user = UserBuilder.CreateRegular();
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(false);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);
        var passwordHash = TestMockFactory.CreatePasswordHashService(hashedPassword: "new-hashed-pw");

        var handler = new UpdateUserCommandHandler(uow.Object, passwordHash.Object);
        await handler.Handle(new UpdateUserCommand(user.Id, null, null, user.Email, "NewPass@1234"), default);

        passwordHash.Verify(s => s.HashPassword("NewPass@1234"), Times.Once);
        user.PasswordHash.Should().Be("new-hashed-pw");
    }

    [Fact]
    public async Task Handle_UserNotFound_ShouldThrowNotFoundException()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Domain.Entities.User?)null);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new UpdateUserCommandHandler(uow.Object, TestMockFactory.CreatePasswordHashService().Object);
        var act = async () => await handler.Handle(
            new UpdateUserCommand(Guid.NewGuid(), null, null, "e@test.com", null), default);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
