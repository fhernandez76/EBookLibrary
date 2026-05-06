using EBookLibrary.Application.Common.Exceptions;
using System.Net;
using System.Text.Json;

namespace EBookLibrary.WebApi.Middleware;

public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex, env.IsDevelopment());
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, bool isDevelopment)
    {
        var (statusCode, message, errors) = exception switch
        {
            NotFoundException notFound => (HttpStatusCode.NotFound, notFound.Message, (IEnumerable<string>?)null),
            ApplicationValidationException validation => (HttpStatusCode.BadRequest, "Validation failed.",
                (IEnumerable<string>?)validation.Errors.SelectMany(e => e.Value)),
            ForbiddenAccessException forbidden => (HttpStatusCode.Forbidden, forbidden.Message, null),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Authentication required.", null),
            // Only expose exception details in Development — never in Production
            _ => isDevelopment
                ? (HttpStatusCode.InternalServerError, exception.Message, null)
                : (HttpStatusCode.InternalServerError, "An unexpected error occurred.", null)
        };

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            message,
            errors = errors ?? Array.Empty<string>()
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
