using EBookLibrary.Application.Common.Interfaces;
using EBookLibrary.Domain.Entities;
using EBookLibrary.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace EBookLibrary.Infrastructure.Persistence;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context, IPasswordHashService passwordHash)
    {
        // Seed admin user if none exists
        if (!await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Role == UserRole.Admin))
        {
            // WARNING: Change this password before deploying to production!
            // Use dotnet user-secrets or environment variables for real credentials.
            const string adminEmail = "admin@ebooklibrary.com";
            const string adminPassword = "Admin@12345";

            var hash = passwordHash.HashPassword(adminPassword);
            var admin = User.Create(adminEmail, hash);
            admin.ChangeRole(UserRole.Admin);
            admin.UpdateProfile("System", "Administrator");
            context.Users.Add(admin);
        }

        await context.SaveChangesAsync();
    }
}
