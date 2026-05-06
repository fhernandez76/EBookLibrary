using EBookLibrary.Blazor.Models;
using Microsoft.JSInterop;
using System.Net.Http.Json;

namespace EBookLibrary.Blazor.Services;

public class BookService(HttpClient httpClient, IJSRuntime jsRuntime)
{
    public async Task<PagedResult<BookSummary>?> SearchAsync(BookSearchFilter filter)
    {
        var query = $"books/search?pageNumber={filter.PageNumber}&pageSize={filter.PageSize}";
        if (!string.IsNullOrWhiteSpace(filter.Title))
            query += $"&title={Uri.EscapeDataString(filter.Title)}";
        if (!string.IsNullOrWhiteSpace(filter.AuthorName))
            query += $"&authorName={Uri.EscapeDataString(filter.AuthorName)}";
        if (!string.IsNullOrWhiteSpace(filter.GenreName))
            query += $"&genreName={Uri.EscapeDataString(filter.GenreName)}";
        if (filter.PublicationYear.HasValue)
            query += $"&publicationYear={filter.PublicationYear}";

        var response = await httpClient.GetFromJsonAsync<ApiResponse<PagedResult<BookSummary>>>(query);
        return response?.Data;
    }

    public async Task<BookDetail?> GetByIdAsync(string id)
    {
        var response = await httpClient.GetFromJsonAsync<ApiResponse<BookDetail>>($"books/{id}");
        return response?.Data;
    }

    public async Task DownloadAsync(string bookId, string fileName)
    {
        var response = await httpClient.GetAsync($"books/{bookId}/download");
        if (!response.IsSuccessStatusCode) return;

        var bytes = await response.Content.ReadAsByteArrayAsync();
        await jsRuntime.InvokeVoidAsync("downloadFileFromBytes", fileName, "application/epub+zip", bytes);
    }
}
