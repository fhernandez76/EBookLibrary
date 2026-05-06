using EBookLibrary.Application;
using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Infrastructure;
using EBookLibrary.Infrastructure.Persistence;
using EBookLibrary.WebApi.Middleware;
using EBookLibrary.WebApi.OpenApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ────────────────────────────────────────────────────────────────

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontends", policy =>
        policy.WithOrigins(
                builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// JWT Bearer Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        // JWT short-form claim names ("role", "sub") are used by JwtSecurityTokenHandler.
        // Without explicit mapping the JsonWebTokenHandler (default in .NET 8+) leaves
        // them as-is, so [Authorize(Roles = ...)] would never match ClaimTypes.Role.
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = "sub"
    };
});

builder.Services.AddAuthorization();

// OpenAPI document generation (replaces Swashbuckle)
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, context, ct) =>
    {
        doc.Info = new()
        {
            Title = "EBook Library API",
            Version = "v1",
            Description = "REST API for the EBook Library application. Supports Spanish and English content.",
            Contact = new() { Name = "EBook Library Team" }
        };
        return Task.CompletedTask;
    });

    // Add JWT Bearer security scheme
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

// Rate limiting — protect auth endpoints from brute-force attacks
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", config =>
    {
        config.PermitLimit = 10;
        config.Window = TimeSpan.FromMinutes(1);
        config.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        config.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ─── Pipeline ────────────────────────────────────────────────────────────────

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

// Security headers — OWASP recommendations
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                          // serves /openapi/v1.json
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("EBook Library API");
        options.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });                                        // serves /scalar/v1
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontends");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-run migrations and seed data on startup (Development only)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHash = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
    await context.Database.MigrateAsync();
    await DataSeeder.SeedAsync(context, passwordHash);
}

app.Run();

// Make Program accessible for integration tests
public partial class Program { }
