using EBookLibrary.Application.Auth.Commands.RegisterUser;
using EBookLibrary.Application.Common.Exceptions;
using EBookLibrary.Application.Tests.TestHelpers;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Interfaces.Repositories;
using FluentAssertions;
using Moq;

namespace EBookLibrary.Application.Tests.Auth;

public class RegisterUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<EBookLibrary.Application.Common.Interfaces.IJwtTokenService> _jwtService;
    private readonly Mock<EBookLibrary.Application.Common.Interfaces.IPasswordHashService> _passwordHash;
    private readonly RegisterUserCommandHandler _handler;

    public RegisterUserCommandHandlerTests()
    {
        _jwtService = TestMockFactory.CreateJwtService();
        _passwordHash = TestMockFactory.CreatePasswordHashService();

        var uow = TestMockFactory.CreateUnitOfWork(users: _userRepo);
        _handler = new RegisterUserCommandHandler(uow.Object, _passwordHash.Object, _jwtService.Object);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldReturnAuthResponseDto()
    {
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>(), default)).Returns(Task.CompletedTask);

        var command = new RegisterUserCommand(
            "test@example.com", "Test@1234", "Test@1234", "John", "Doe");

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.Email.Should().Be("test@example.com");
        result.Role.Should().Be("Regular");
        result.Token.Should().Be("mock-jwt-token");
        _passwordHash.Verify(p => p.HashPassword("Test@1234"), Times.Once);
        _userRepo.Verify(r => r.AddAsync(It.Is<User>(u => u.Email == "test@example.com"), default), Times.Once);
    }

    [Fact]
    public async Task Handle_WithDuplicateEmail_ShouldThrowApplicationValidationException()
    {
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(true);

        var command = new RegisterUserCommand(
            "existing@test.com", "Test@1234", "Test@1234", null, null);

        var act = async () => await _handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<ApplicationValidationException>()
            .Where(ex => ex.Errors.ContainsKey("Email"));
    }

    [Fact]
    public async Task Handle_ShouldHashPasswordBeforeStoring()
    {
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), default)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>(), default)).Returns(Task.CompletedTask);

        var command = new RegisterUserCommand(
            "new@test.com", "MyPassword@1", "MyPassword@1", null, null);

        await _handler.Handle(command, CancellationToken.None);

        _userRepo.Verify(r => r.AddAsync(
            It.Is<User>(u => u.PasswordHash == "hashed-password"), default), Times.Once);
    }
}
