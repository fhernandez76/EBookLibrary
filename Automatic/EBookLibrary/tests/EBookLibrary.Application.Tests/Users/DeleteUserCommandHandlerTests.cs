using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Application.Users.Commands.DeleteUser;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Users;

public class DeleteUserCommandHandlerTests
{
    [Fact]
    public async Task Handle_ValidRequest_ShouldDeleteUser()
    {
        var user = UserBuilder.CreateRegular();
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(user.Id, default)).ReturnsAsync(user);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new DeleteUserCommandHandler(uow.Object);
        await handler.Handle(new DeleteUserCommand(user.Id, Guid.NewGuid()), default);

        userRepo.Verify(r => r.DeleteAsync(user, default), Times.Once);
        uow.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task Handle_UserNotFound_ShouldThrowNotFoundException()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), default)).ReturnsAsync((Domain.Entities.User?)null);
        var uow = TestMockFactory.CreateUnitOfWork(users: userRepo);

        var handler = new DeleteUserCommandHandler(uow.Object);
        var act = async () => await handler.Handle(new DeleteUserCommand(Guid.NewGuid(), Guid.NewGuid()), default);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
