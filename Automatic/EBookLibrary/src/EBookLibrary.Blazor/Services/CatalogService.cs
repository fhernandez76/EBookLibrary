using EBookLibrary.Blazor.Models;
using System.Net.Http.Json;

namespace EBookLibrary.Blazor.Services;

public class CatalogService
{
    private readonly HttpClient _httpClient;

    public CatalogService(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<List<GenreModel>> GetGenresAsync()
    {
        var response = await _httpClient.GetFromJsonAsync<ApiResponse<List<GenreModel>>>("genres");
        return response?.Data ?? [];
    }

    public async Task<PagedResult<AuthorModel>?> GetAuthorsAsync(int pageNumber = 1, int pageSize = 20)
    {
        var response = await _httpClient
            .GetFromJsonAsync<ApiResponse<PagedResult<AuthorModel>>>(
                $"authors?pageNumber={pageNumber}&pageSize={pageSize}");
        return response?.Data;
    }

    public async Task<PagedResult<UserModel>?> GetUsersAsync(int pageNumber = 1, int pageSize = 20)
    {
        var response = await _httpClient
            .GetFromJsonAsync<ApiResponse<PagedResult<UserModel>>>(
                $"users?pageNumber={pageNumber}&pageSize={pageSize}");
        return response?.Data;
    }
}
