namespace EBookLibrary.Domain.Events;

public record BookDownloadedEvent(Guid BookId, Guid UserId) : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
