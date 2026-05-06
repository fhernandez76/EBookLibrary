using EBookLibrary.Infrastructure.Persistence;
using EBookLibrary.WebApi.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;

namespace EBookLibrary.WebApi.Tests.Controllers;

/// <summary>
/// Integration tests using WebApplicationFactory with in-memory database.
/// Tests the full HTTP pipeline: routing, serialization, auth middleware.
/// </summary>
public class BooksControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public BooksControllerTests(WebApplicationFactory<Program> factory)
    {
        var dbName = "BooksTestDb_" + Guid.NewGuid();
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

    [Fact]
    public async Task SearchBooks_WithNoFilter_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/books/search");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBookById_WithNonExistentId_Returns404()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync($"/api/books/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Download_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        var response = await client.GetAsync($"/api/books/{Guid.NewGuid()}/download");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateBook_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/books",
            new
            {
                title = "Test",
                pages = 100,
                language = "Spanish",
                authorIds = Array.Empty<Guid>(),
                genreIds = Array.Empty<Guid>()
            });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
