---
applyTo: "**/EBookLibrary.Domain/**"
---

# Domain layer

This layer expresses the business — and **nothing else**. It is referenced by
Application, Infrastructure, and indirectly by WebApi, but it references **no
project**.

## Allowed dependencies

- BCL only (`System.*`).
- No EF Core, no MediatR, no FluentValidation, no ASP.NET Core, no AutoMapper.

If you feel you need an outward dependency, the abstraction belongs in
`Application/Common/Interfaces/` and the implementation in `Infrastructure/`.

## Entities

- Sealed `class` (not record), all properties have **private setters**.
- Constructor is private; expose a static factory:

  ```csharp
  public static User Create(string email, string passwordHash) { ... }
  ```

- Mutate state through intent-revealing methods (`user.ChangeEmail(...)`),
  not by setting properties from outside.
- Inherit from `BaseEntity` (provides `Id`, `CreatedAt`, `UpdatedAt`, `IsDeleted`
  and `AddDomainEvent(...)`).

## Value objects

- `record` types, immutable.
- Validate in the constructor; throw `ArgumentException` for invariant violations.

## Domain events

- Implement `IDomainEvent`.
- Raised from inside the aggregate via `AddDomainEvent(...)`.
- Consumed by handlers in the Application layer.

## Soft delete

- The `IsDeleted` flag lives on `BaseEntity`.
- The global EF query filter (Infrastructure) hides soft-deleted rows.
- Use `entity.SoftDelete()` — never set the flag from outside.

## What does **not** belong here

- DTOs, requests, responses → Application.
- Mapping logic → handlers in Application.
- Validation messages with HTTP semantics → Application validators.
- Database concerns → Infrastructure.
