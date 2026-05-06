# Appendix B — Exercises

> *Practice is how knowledge becomes skill.*

Each section contains exercises tagged **Easy**, **Medium**, or **Hard** that extend the EBook Library project. Work through them after completing each chapter.

---

## Chapter 02 — Solution Setup

### E02-1 — Easy: Add a `.gitignore`
Create a `.gitignore` at the solution root that excludes: `bin/`, `obj/`, `.env`, `appsettings.*.json` (except Development), `*.user`, `node_modules/`, `dist/`, `.playwright/`.

### E02-2 — Medium: Custom Directory.Build.props
Add a `Directory.Build.props` rule that enforces `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` only in Release builds. Verify with `dotnet build -c Release`.

### E02-3 — Hard: GitHub Actions CI Pipeline
Create `.github/workflows/ci.yml` that:
- Triggers on push to `main` and every PR
- Runs `dotnet build`, `dotnet test` (unit tests only)
- Runs `npm run build` for the React project
- Fails the pipeline if any step fails

---

## Chapter 03 — Domain Layer

### E03-1 — Easy: Add BookRating Entity
Add a `BookRating` entity:
- Properties: `BookId`, `UserId`, `Rating` (1–5), `Comment?`, `CreatedAt`
- Validate: rating must be 1–5
- Add `IBookRatingRepository` with `GetByBookIdAsync` and `GetAverageRatingAsync`

### E03-2 — Medium: Average Rating on Book
Extend `Book` with a computed aggregate property `AverageRating` that returns the average of its `BookRatings` collection. Update the `BookDetail` DTO to include it.

### E03-3 — Hard: Domain Event for Download
Create a `BookDownloadedDomainEvent` that fires when a book is downloaded. Implement a handler that increments a `DownloadCount` property on the `Book` entity. Use MediatR's `INotification` for domain events.

---

## Chapter 04 — Application Layer

### E04-1 — Easy: GetBookByIdQuery
Add a `GetBookByIdQuery` that returns `BookDetailDto`. Include the author list and genre list in the response.

### E04-2 — Medium: UpdateBookCommand
Add an `UpdateBookCommand` with a FluentValidation validator. The handler should load the existing book, update its properties, and save. Return `Result.Success()` or `Result.Failure(...)`.

### E04-3 — Hard: RateBookCommand with Duplicate Prevention
Add a `RateBookCommand` that:
- Requires authentication (check `ICurrentUserService.IsAuthenticated`)
- Prevents a user from rating the same book twice
- Returns the new average rating in the response

---

## Chapter 05 — Infrastructure Layer

### E05-1 — Easy: BookRatingRepository
Implement `BookRatingRepository : GenericRepository<BookRating>` with:
- `GetByBookIdAsync` returning all ratings for a book
- `GetAverageRatingAsync` returning `double?` (null if no ratings)
- Register in `DependencyInjection.cs`

### E05-2 — Medium: Audit Log Table
Add an `AuditLog` entity with `EntityName`, `Action`, `UserId`, `Timestamp`, `OldValue?`, `NewValue?`. Create an `AuditBehavior<TRequest, TResponse>` MediatR pipeline behavior that logs every `ICommand` execution to the audit table.

### E05-3 — Hard: Caching with IMemoryCache
Add a `CachedBookRepository` decorator over `BookRepository` that:
- Caches `GetByIdAsync` results for 5 minutes in `IMemoryCache`
- Invalidates the cache entry when a book is updated or deleted
- Register with a conditional in `DependencyInjection.cs` (only in Production)

---

## Chapter 06 — Web API Layer

### E06-1 — Easy: RatingsController
Add `RatingsController` with:
- `POST /api/books/{id}/ratings` — create rating (authenticated)
- `GET /api/books/{id}/ratings` — get all ratings for a book (anonymous)

### E06-2 — Medium: Health Check Endpoint
Register `AddHealthChecks()` in `Program.cs`. Add a check for SQL Server connectivity. Expose at `/health`. Return JSON format.

### E06-3 — Hard: API Versioning
Add API versioning via URL segments (`/api/v1/books`). Keep the existing routes working as v1. Create a `/api/v2/books/search` that returns an additional `averageRating` field in the response.

---

## Chapter 07 — Authentication

### E07-1 — Easy: Token Expiry Header
Add a custom response header `X-Token-Expires-At` to every authenticated response (in the `ExceptionHandlingMiddleware` or a custom middleware). Value: the JWT expiry timestamp.

### E07-2 — Medium: Change Password Endpoint
Add `POST /api/users/me/change-password` with:
- Request: `{ currentPassword, newPassword, confirmNewPassword }`
- Validates current password before allowing the change
- Returns `400` if current password is wrong (same message — no enumeration)

### E07-3 — Hard: Refresh Token Support (v2 improvement)
Implement short-lived access tokens (15 min) + long-lived refresh tokens (7 days) stored in the database. Add `POST /api/auth/refresh` endpoint. Store refresh tokens in a new `RefreshTokens` table with `UserId`, `Token`, `ExpiresAt`, `RevokedAt?`.

---

## Chapter 08 — Database Migrations

### E08-1 — Easy: Add Index on Book.Title
Create a migration that adds a non-unique index on `Books.Title` to speed up `LIKE` queries. Apply it and verify in SQL Server Management Studio.

### E08-2 — Medium: Seed Admin User via Migration
Add a data migration (not the seeder script) that inserts the admin user record with a BCrypt-hashed password. The hash should be computed by a C# helper, not stored as plaintext.

### E08-3 — Hard: Full-Text Search Index
Enable SQL Server full-text search on `Books.Title` and `Books.Description`. Update `BookRepository.SearchAsync` to use `CONTAINS` instead of `LIKE` for better search performance.

---

## Chapter 09 — React Frontend

### E09-1 — Easy: Language Toggle Button
Add a language switcher button to the navbar that toggles between Spanish and English using `i18n.changeLanguage()`. Persist the choice in `localStorage`.

### E09-2 — Medium: Infinite Scroll on Search
Replace pagination on the search page with infinite scroll using React Query's `useInfiniteQuery`. Load 20 more books when the user scrolls to the bottom of the page.

### E09-3 — Hard: Book Rating Component
Add a `StarRating` component to the book detail page. Allow authenticated users to submit a rating (1–5 stars). Show the average rating and rating count for all users. Optimistic update the UI before the API call completes.

---

## Chapter 10 — Blazor Frontend

### E10-1 — Easy: Language Toggle in Blazor
Add a `LanguageSwitcher` Blazor component that calls `JSRuntime.InvokeVoidAsync` to reload the page with the selected language query parameter.

### E10-2 — Medium: Pagination Component
Extract a reusable `<Pagination>` Blazor component that takes `CurrentPage`, `TotalPages`, and an `EventCallback<int> OnPageChange` parameter. Use it in all list pages.

### E10-3 — Hard: Book Upload Form in Blazor
Add an `UploadBookFile.razor` admin page that uses `InputFile` to select an `.epub` file and calls `POST /api/files/books/{id}/upload` with `multipart/form-data`. Show a progress bar during upload.

---

## Chapter 11 — Unit Tests

### E11-1 — Easy: RegisterUserCommandHandler Tests
Add tests for `RegisterUserCommandHandler`:
- Successful registration returns `AuthResponseDto` with correct fields
- Duplicate email throws or returns a failure result
- Password is hashed before saving

### E11-2 — Medium: GetBookByIdQueryHandler Tests
Add tests for `GetBookByIdQueryHandler`:
- Existing book returns `BookDetailDto` with correct authors and genres
- Non-existent book throws `NotFoundException`
- Soft-deleted book throws `NotFoundException`

### E11-3 — Hard: Coverage Report and Target
Run `dotnet test` with coverage and generate an HTML report using `reportgenerator`. Identify the 3 Application handlers with the least coverage. Write tests to bring all handlers above 80%.

---

## Chapter 12 — End-to-End Tests

### E12-1 — Easy: React Regular User Flow
Add `ReactRegularUserFlowTests` with tests for:
- Login navigates to home page
- Profile page shows email
- Logout clears the nav

### E12-2 — Medium: Accessibility Check
Add a Playwright test that runs `axe-core` accessibility checks on the home page, search page, and login page. Fail the test if there are any critical accessibility violations.

### E12-3 — Hard: Parallel Browser Testing
Configure Playwright to run the same E2E test suite against both Chromium and Firefox. Update the `PlaywrightFixture` to parameterize the browser type. Run both in a GitHub Actions CI pipeline.

---

## Cross-Cutting Hard Challenges

These challenges span multiple chapters:

### XC-1 — Book Recommendations
Implement a `GET /api/books/{id}/recommendations` endpoint that returns 5 books from the same genre, excluding the current book. Add a "You might also like" section on the book detail page in React.

### XC-2 — Admin Dashboard with Charts
Add a stats endpoint `GET /api/admin/stats` that returns: total books, total users, books downloaded today, most downloaded book. Build an admin dashboard component in React using a charting library (recharts) to visualize the data.

### XC-3 — Full-Stack Feature: Reading Lists
Add a "Save to Reading List" feature end-to-end:
- Domain: `ReadingList` entity (User + Book many-to-many)
- Application: `AddToReadingListCommand`, `RemoveFromReadingListCommand`, `GetReadingListQuery`
- API: `POST /api/users/me/reading-list/{bookId}`, `DELETE`, `GET`
- React: heart/bookmark icon on book cards, dedicated "My List" page
- E2E: test add, view, and remove from reading list

---

**← Previous:** [Appendix A — API Reference](APPENDIX-A-API-REFERENCE.md)  
**Back to Contents →** [README](README.md)
