namespace EBookLibrary.Domain.Events;

public record BookCreatedEvent(Guid BookId) : IDomainEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
