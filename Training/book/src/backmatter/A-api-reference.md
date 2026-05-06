# Appendix A — API Reference

This appendix is the complete catalog of HTTP endpoints exposed by
`EBookLibrary.WebApi`. It is the human-readable companion to the
OpenAPI document served at `/openapi/v1.json` and the Scalar UI at
`/scalar/v1`.

Conventions used throughout:

- All endpoints are rooted at `/api/`.
- All responses are `application/json` wrapped in
  `ApiResponse<T>` (§ 7.2): `{ success, data, errors }`.
- All authenticated endpoints require `Authorization: Bearer <jwt>`.
- Admin-only endpoints additionally require the `Admin` role claim.
- `204 No Content` is used for successful mutations that return no
  body.
- `pageNumber` is 1-based; `pageSize` defaults to 20, max 100.

---

## A.1 Authentication

### `POST /api/auth/register`

Register a new reader account.

| Status | Meaning                           |
|--------|-----------------------------------|
| 201    | Created. Body contains JWT.       |
| 400    | Validation failure.               |
| 409    | Email already registered.         |

**Request.**

```json
{
  "email":     "reader@example.com",
  "password":  "Str0ng-P4ss!",
  "firstName": "Ada",
  "lastName":  "Lovelace"
}
```

**Response (201).**

```json
{
  "success": true,
  "data": {
    "token":     "eyJhbGciOi…",
    "expiresAt": "2026-01-15T12:34:56Z",
    "user":      { "id": "…", "email": "reader@example.com", "role": "Reader" }
  },
  "errors": []
}
```

### `POST /api/auth/login`

| Status | Meaning                                    |
|--------|--------------------------------------------|
| 200    | Authenticated. Body contains JWT.          |
| 401    | Invalid credentials. (Generic error — § 5.5)|

**Request.**

```json
{ "email": "admin@ebooklibrary.dev", "password": "Admin#2026!" }
```

**Response (200).** Same shape as register.

---

## A.2 Books

### `GET /api/books/search`

Anonymous. Searches the catalog with optional filters.

| Query parameter | Type    | Default | Description                          |
|-----------------|---------|---------|--------------------------------------|
| `title`         | string  | —       | Substring match on title.            |
| `authorName`    | string  | —       | Substring match on any linked author.|
| `genreName`     | string  | —       | Substring match on any linked genre. |
| `pageNumber`    | int     | 1       | 1-based page index.                  |
| `pageSize`      | int     | 20      | 1–100.                               |

**Response (200).**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "…", "title": "Don Quixote", "isbn": "978-…",
        "authors": [{ "id": "…", "name": "Miguel de Cervantes" }],
        "genres":  [{ "id": "…", "name": "Classic" }],
        "status":  "Published"
      }
    ],
    "pageNumber": 1, "pageSize": 20, "totalCount": 1
  },
  "errors": []
}
```

### `GET /api/books/{id}`

Anonymous. Returns a single book with authors, genres, and full
description.

| Status | Meaning                  |
|--------|--------------------------|
| 200    | Found.                   |
| 404    | Not found / soft-deleted.|

### `GET /api/books/{id}/download`

Authenticated. Streams the book file as `application/octet-stream`
with `Content-Disposition: attachment; filename="…"`. Records a
`BookDownload` row.

| Status | Meaning                        |
|--------|--------------------------------|
| 200    | Streaming. Binary body.        |
| 401    | Unauthenticated.               |
| 404    | Book or file missing.          |

### `POST /api/books`

Admin only. Creates a new book.

**Request.**

```json
{
  "title":       "New Title",
  "isbn":        "978-1-234567-89-0",
  "description": "…",
  "language":    "Spanish",
  "authorIds":   ["…"],
  "genreIds":    ["…"]
}
```

| Status | Meaning                                |
|--------|----------------------------------------|
| 201    | Created. Body contains the new book.   |
| 400    | Validation failure.                    |
| 403    | Forbidden (not Admin).                 |
| 409    | ISBN already exists.                   |

### `PUT /api/books/{id}` — Admin only

Updates title, ISBN, description, language, authors, and genres of an
existing book.

| Status | Meaning |
|--------|---------|
| 200    | Updated.|
| 400    | Validation failure. |
| 403    | Forbidden. |
| 404    | Not found. |

### `DELETE /api/books/{id}` — Admin only

Soft-deletes the book (`IsDeleted = true`).

| Status | Meaning |
|--------|---------|
| 204    | Deleted.|
| 403    | Forbidden. |
| 404    | Not found. |

---

## A.3 Authors

| Method | Path                       | Auth      | Purpose                      |
|--------|----------------------------|-----------|------------------------------|
| GET    | `/api/authors`             | Anonymous | List authors (paged).        |
| GET    | `/api/authors/{id}`        | Anonymous | Get author with bio.         |
| GET    | `/api/authors/{id}/books`  | Anonymous | Books for an author.         |
| POST   | `/api/authors`             | Admin     | Create author.               |
| PUT    | `/api/authors/{id}`        | Admin     | Update author.               |
| DELETE | `/api/authors/{id}`        | Admin     | Soft-delete author.          |

---

## A.4 Genres

| Method | Path                      | Auth      | Purpose                      |
|--------|---------------------------|-----------|------------------------------|
| GET    | `/api/genres`             | Anonymous | List genres (paged).         |
| GET    | `/api/genres/{id}`        | Anonymous | Get one genre.               |
| GET    | `/api/genres/{id}/books`  | Anonymous | Books in a genre.            |
| POST   | `/api/genres`             | Admin     | Create genre.                |
| PUT    | `/api/genres/{id}`        | Admin     | Update genre.                |
| DELETE | `/api/genres/{id}`        | Admin     | Soft-delete genre.           |

---

## A.5 Users (admin-only)

| Method | Path                         | Purpose                                   |
|--------|------------------------------|-------------------------------------------|
| GET    | `/api/users`                 | List users (paged).                       |
| GET    | `/api/users/{id}`            | Get user.                                 |
| PUT    | `/api/users/{id}/role`       | Promote / demote between Reader and Admin.|
| PUT    | `/api/users/{id}/status`     | Activate / deactivate.                    |
| DELETE | `/api/users/{id}`            | Soft-delete user.                         |

---

## A.6 Downloads (current user)

| Method | Path                        | Auth          | Purpose                                |
|--------|-----------------------------|---------------|----------------------------------------|
| GET    | `/api/downloads/me`         | Authenticated | Current user's download history (paged).|

---

## A.7 Health

| Method | Path             | Auth      | Purpose                       |
|--------|------------------|-----------|-------------------------------|
| GET    | `/health/live`   | Anonymous | Liveness probe (§ 15.3).      |
| GET    | `/health/ready`  | Anonymous | Readiness probe (§ 15.3).     |

---

## A.8 Error envelope

Failures return the envelope with `success: false` and a non-empty
`errors` array.

```json
{
  "success": false,
  "data": null,
  "errors": [
    "Title is required.",
    "ISBN must be in the form 978-N-NNNNNN-NN-N."
  ]
}
```

The HTTP status code is the *primary* signal; the `errors` strings
are end-user-safe and never echo internals (§ 7.4).
