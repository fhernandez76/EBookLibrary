---
applyTo: "**/EBookLibrary.Application/**"
---

# Application layer

Use cases, orchestrated through MediatR. Knows about `Domain` only.

## Allowed dependencies

- `EBookLibrary.Domain`
- MediatR, FluentValidation
- BCL

**Never** reference `Infrastructure` or `WebApi`. Cross the boundary through
interfaces declared here (`Common/Interfaces/`).

## Use case shape

Every use case is a triple of files:

```
Features/<Aggregate>/<Verb><Aggregate>/
  <Verb><Aggregate>Command.cs        ← record  : IRequest<Result<TResponse>>
  <Verb><Aggregate>Handler.cs        ← sealed class : IRequestHandler<...>
  <Verb><Aggregate>Validator.cs      ← AbstractValidator<<Verb><Aggregate>Command>
```

Queries use `Query` instead of `Command` and live under `Queries/`.

## Handler rules

- `sealed class`, constructor-injected dependencies (`IUnitOfWork`,
  repositories, `IPasswordHashService`, `IJwtService`, etc.).
- Return `Result<T>` (or `Result` for void). Never throw for control flow —
  validation failures, not-found, conflicts → return a failure result.
- Throw only for genuine bugs (null reference of an invariant).
- Map entity → DTO inside the handler. No AutoMapper.
- Persist via `IUnitOfWork.SaveChangesAsync(ct)` exactly once per handler.

## Validation

- Add `Validator` for every command/query that has user input.
- The `ValidationBehavior` MediatR pipeline runs validators automatically and
  throws `ApplicationValidationException` (caught by the API exception
  middleware) — handlers never need to re-validate.

## DTOs

- `record` types under `Features/<Aggregate>/Dtos/`.
- Returned from handlers; never expose `Domain` entities to the API surface.

## Common patterns

- `Result<T>.Success(value)` / `Result<T>.Failure(error)`.
- `IUnitOfWork` exposes one `Repository<T>` getter per aggregate.
- Pagination: `PagedResult<T>` (Items, Page, PageSize, TotalCount).
- Authorization data needed by handlers comes via `ICurrentUserService`
  (claims-based wrapper around `IHttpContextAccessor`).
