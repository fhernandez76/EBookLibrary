using EBookLibrary.Application.Auth.DTOs;
using EBookLibrary.Application.Users.DTOs;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using EBookLibrary.Infrastructure.Persistence;
using EBookLibrary.WebApi.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace EBookLibrary.WebApi.Tests.Controllers;

public class UsersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private const string AdminEmail = "admin@ebooklibrary.com";
    private const string AdminPassword = "Admin@12345";

    public UsersControllerTests(WebApplicationFactory<Program> factory)
    {
        var dbName = "UsersTestDb_" + Guid.NewGuid();
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Test");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor is not null) services.Remove(descriptor);

                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(dbName));
            });
        });
    }

    private async Task<string> GetAdminTokenAsync()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { email = AdminEmail, password = AdminPassword });
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        return body!.Data!.Token;
    }

    private async Task<Guid> CreateTestUserAsync()
    {
        var email = $"testuser_{Guid.NewGuid():N}@test.com";
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "Test@1234", confirmPassword = "Test@1234" });
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<AuthResponseDto>>();
        return body!.Data!.UserId;
    }

    // ─── GET /api/users ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/users");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUsers_AsAdmin_Returns200()
    {
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ─── PATCH /api/users/{id}/status ───────────────────────────────────────

    [Fact]
    public async Task ToggleStatus_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PatchAsync($"/api/users/{Guid.NewGuid()}/status", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ToggleStatus_AsAdmin_OnAnotherUser_Returns204()
    {
        var userId = await CreateTestUserAsync();
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PatchAsync($"/api/users/{userId}/status", null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ToggleStatus_OnNonExistentUser_Returns404()
    {
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PatchAsync($"/api/users/{Guid.NewGuid()}/status", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── PUT /api/users/{id} ────────────────────────────────────────────────

    [Fact]
    public async Task UpdateUser_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}",
            new { email = "e@test.com" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateUser_AsAdmin_WithValidData_Returns200()
    {
        var userId = await CreateTestUserAsync();
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var newEmail = $"updated_{Guid.NewGuid():N}@test.com";
        var response = await client.PutAsJsonAsync($"/api/users/{userId}",
            new { firstName = "Updated", lastName = "User", email = newEmail, newPassword = (string?)null });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<UserDto>>();
        body!.Data!.Email.Should().Be(newEmail);
        body.Data.FirstName.Should().Be("Updated");
    }

    [Fact]
    public async Task UpdateUser_WithInvalidEmail_Returns400()
    {
        var userId = await CreateTestUserAsync();
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PutAsJsonAsync($"/api/users/{userId}",
            new { email = "not-valid" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateUser_OnNonExistentUser_Returns404()
    {
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}",
            new { email = "e@test.com" });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ─── DELETE /api/users/{id} ─────────────────────────────────────────────

    [Fact]
    public async Task DeleteUser_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.DeleteAsync($"/api/users/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteUser_AsAdmin_OnAnotherUser_Returns204()
    {
        var userId = await CreateTestUserAsync();
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.DeleteAsync($"/api/users/{userId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteUser_OnNonExistentUser_Returns404()
    {
        var token = await GetAdminTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.DeleteAsync($"/api/users/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
