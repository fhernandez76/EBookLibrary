using EBookLibrary.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EBookLibrary.Infrastructure.Persistence.Configurations;

public class BookDownloadConfiguration : IEntityTypeConfiguration<BookDownload>
{
    public void Configure(EntityTypeBuilder<BookDownload> builder)
    {
        builder.ToTable("BookDownloads");
        builder.HasKey(d => d.Id);

        builder.HasOne(d => d.User)
            .WithMany(u => u.Downloads)
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Book)
            .WithMany(b => b.Downloads)
            .HasForeignKey(d => d.BookId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(d => d.IpAddress).HasMaxLength(45); // IPv6 max length
        builder.HasIndex(d => d.UserId);
        builder.HasIndex(d => d.BookId);
        builder.HasIndex(d => d.DownloadedAt);
    }
}
