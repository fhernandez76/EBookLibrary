using EBookLibrary.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EBookLibrary.Infrastructure.Persistence.Configurations;

public class BookConfiguration : IEntityTypeConfiguration<Book>
{
    public void Configure(EntityTypeBuilder<Book> builder)
    {
        builder.ToTable("Books");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Title)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(b => b.Isbn)
            .HasMaxLength(20);

        builder.Property(b => b.Description)
            .HasMaxLength(4000);

        builder.Property(b => b.FilePath)
            .HasMaxLength(1000);

        builder.Property(b => b.CoverImagePath)
            .HasMaxLength(1000);

        builder.Property(b => b.Language)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(b => b.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Indexes
        builder.HasIndex(b => b.Title);
        builder.HasIndex(b => b.Status);
        builder.HasIndex(b => b.IsDeleted);
        builder.HasIndex(b => b.Isbn)
            .IsUnique()
            .HasFilter("[Isbn] IS NOT NULL");

        // Ignore domain events (not persisted)
        builder.Ignore(b => b.DomainEvents);
    }
}
