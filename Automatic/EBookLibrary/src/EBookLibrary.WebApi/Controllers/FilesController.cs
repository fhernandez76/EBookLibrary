using EBookLibrary.Application.Books.Commands.UploadBookFile;
using EBookLibrary.WebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EBookLibrary.WebApi.Controllers;

/// <summary>Admin — Upload ePub files for books</summary>
[Authorize(Roles = "Admin")]
public class FilesController : ApiControllerBase
{
    /// <summary>Upload an ePub file and associate it with a book</summary>
    [HttpPost("books/{bookId:guid}/upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB limit
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadBookFile(
        Guid bookId,
        IFormFile file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("No file was provided."));

        if (!file.FileName.EndsWith(".epub", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<string>.Fail("Only ePub files are accepted."));

        await using var stream = file.OpenReadStream();
        await Mediator.Send(new UploadBookFileCommand(bookId, stream, file.FileName), ct);
        return Ok(ApiResponse<string>.Ok("File uploaded and associated with book.", "File uploaded successfully."));
    }
}
