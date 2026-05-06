using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Application.Users.Commands.ToggleUserStatus;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Users;

public class ToggleUserStatusCommandHandlerTests
{
    [Fact]
    public async Task Handle_ActiveUser_ShouldDeactivate()
    {
        var user = UserBuilder.CreateRegular();
        user.Activate(); // ensure active
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new ToggleUserStatusCommandHandler(uow.Object);
        await handler.Handle(new ToggleUserStatusCommand(user.Id, Guid.NewGuid()), default);

        user.IsActive.Should().BeFalse();
        userRepo.Verify(r => r.UpdateAsync(user, default), Times.Once);
        uow.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_InactiveUser_ShouldActivate()
    {
        var user = UserBuilder.CreateRegular();
        user.Deactivate(); // ensure inactive
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new ToggleUserStatusCommandHandler(uow.Object);
        await handler.Handle(new ToggleUserStatusCommand(user.Id, Guid.NewGuid()), default);

        user.IsActive.Should().BeTrue();
        userRepo.Verify(r => r.UpdateAsync(user, default), Times.Once);
    }

    [Fact]
    public async Task Handle_UserNotFound_ShouldThrowNotFoundException()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Domain.Entities.User?)null);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new ToggleUserStatusCommandHandler(uow.Object);
        var act = async () => await handler.Handle(new ToggleUserStatusCommand(Guid.NewGuid(), Guid.NewGuid()), default);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
