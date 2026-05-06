# EBook Library â€” API Testing Guide

Complete reference for every endpoint in the EBook Library REST API, including request/response shapes, authentication requirements, validation rules, and test cases.

**Base URL:** `http://localhost:5000/api`  
**Scalar UI:** `http://localhost:5000/scalar/v1`  
**OpenAPI Schema:** `http://localhost:5000/openapi/v1.json`  
**Authentication:** JWT Bearer â€” `Authorization: Bearer <token>`

---

## Conventions

### Standard Response Envelope

Every endpoint returns a consistent `ApiResponse<T>` wrapper:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": { /* T â€” the actual response payload */ }
}
```

Error responses follow the same shape with `"success": false` and `"data": null`.

### HTTP Status Codes Used

| Code | Meaning |
|---|---|
| `200 OK` | Successful read or update |
| `201 Created` | Resource created successfully |
| `204 No Content` | Successful delete or update (no body) |
| `400 Bad Request` | Validation error or invalid input |
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | Valid token but insufficient role |
| `404 Not Found` | Resource does not exist (or soft-deleted) |
| `429 Too Many Requests` | Auth rate limit exceeded (10/min) |
| `500 Internal Server Error` | Unhandled server exception |

### Obtaining a Token

All test cases that require authentication assume you first call `POST /api/auth/login` and capture the `token` field from the response, then pass it as `Authorization: Bearer <token>` in subsequent requests.

---

## 1. Authentication Endpoints (`/api/auth`)

Rate limit: **10 requests per minute** per IP on all auth endpoints.

---

### 1.1 `POST /api/auth/register`

Register a new user account. Returns a JWT token on success.

**Auth required:** None (anonymous)

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "MyPass@123",
  "confirmPassword": "MyPass@123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email format, unique |
| `password` | string | Yes | Min 8 chars, must contain uppercase, lowercase, digit, special char |
| `confirmPassword` | string | Yes | Must match `password` |
| `firstName` | string | No | Max 100 chars |
| `lastName` | string | No | Max 100 chars |

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "Regular",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-03-30T14:00:00Z"
  }
}
```

**Test cases:**

| # | Scenario | Input | Expected |
|---|---|---|---|
| TC-AUTH-01 | Successful registration | Valid all fields | `201`, token returned |
| TC-AUTH-02 | Successful registration (minimal) | Only email + password + confirmPassword | `201`, firstName/lastName null |
| TC-AUTH-03 | Password mismatch | `confirmPassword` different from `password` | `400`, validation error |
| TC-AUTH-04 | Weak password | `password: "12345"` | `400`, validation error |
| TC-AUTH-05 | Invalid email | `email: "notanemail"` | `400`, validation error |
| TC-AUTH-06 | Duplicate email | Register with already-used email | `400`, conflict error |
| TC-AUTH-07 | Empty body | `{}` | `400`, validation errors on all required fields |
| TC-AUTH-08 | Rate limit | 11 requests within 1 minute | 11th request returns `429` |

---

### 1.2 `POST /api/auth/login`

Authenticate with email and password. Returns a JWT token on success.

**Auth required:** None (anonymous)

**Request body:**

```json
{
  "email": "admin@ebooklibrary.com",
  "password": "Admin@12345"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Not empty |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "admin@ebooklibrary.com",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "Admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-03-30T14:00:00Z"
  }
}
```

**Test cases:**

| # | Scenario | Input | Expected |
|---|---|---|---|
| TC-AUTH-09 | Admin login | Seeded admin credentials | `200`, role = "Admin" |
| TC-AUTH-10 | Regular user login | Credentials from TC-AUTH-01 | `200`, role = "Regular" |
| TC-AUTH-11 | Wrong password | Correct email, wrong password | `400`, invalid credentials |
| TC-AUTH-12 | Non-existent email | Unknown email | `400`, invalid credentials |
| TC-AUTH-13 | Empty body | `{}` | `400`, validation errors |
| TC-AUTH-14 | Rate limit | 11 requests within 1 minute | 11th returns `429` |

---

## 2. Books Endpoints (`/api/books`)

---

### 2.1 `GET /api/books/search`

Search the book catalog with optional filters. Fully anonymous.

**Auth required:** None

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | null | Partial title match (case-insensitive) |
| `authorName` | string | null | Partial author name match |
| `genreName` | string | null | Exact genre name match |
| `publicationYear` | int | null | Exact year filter |
| `pageNumber` | int | 1 | Page number (1-based) |
| `pageSize` | int | 20 | Results per page (max 100) |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "title": "Cien aÃ±os de soledad",
        "pages": 417,
        "publicationYear": 1967,
        "coverImageUrl": null,
        "status": "Available",
        "hasFile": true,
        "primaryAuthor": "Gabriel GarcÃ­a MÃ¡rquez",
        "primaryGenre": "Novela"
      }
    ],
    "totalCount": 42,
    "pageNumber": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

**Test cases:**

| # | Scenario | Query | Expected |
|---|---|---|---|
| TC-BOOK-01 | No filters | (none) | `200`, first page of all books |
| TC-BOOK-02 | Filter by title | `?title=cien` | Books containing "cien" in title |
| TC-BOOK-03 | Filter by author | `?authorName=garcia` | Books with matching author |
| TC-BOOK-04 | Filter by genre | `?genreName=Novela` | Books in that genre |
| TC-BOOK-05 | Filter by year | `?publicationYear=1967` | Books from 1967 |
| TC-BOOK-06 | Combined filters | `?title=amor&genreName=Novela` | Books matching both |
| TC-BOOK-07 | Pagination | `?pageSize=5&pageNumber=2` | 5 items, page 2 |
| TC-BOOK-08 | No results | `?title=xyznotexist` | `200`, empty items array |

---

### 2.2 `GET /api/books/{id}`

Get full details of a single book by its GUID.

**Auth required:** None

**Route parameter:** `id` â€” GUID of the book

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Cien aÃ±os de soledad",
    "pages": 417,
    "publicationYear": 1967,
    "isbn": "978-0-06-088328-7",
    "description": "A landmark of magical realism...",
    "coverImageUrl": null,
    "language": "Spanish",
    "status": "Available",
    "hasFile": true,
    "authors": ["Gabriel GarcÃ­a MÃ¡rquez"],
    "genres": ["Novela", "Realismo mÃ¡gico"]
  }
}
```

**Test cases:**

| # | Scenario | Input | Expected |
|---|---|---|---|
| TC-BOOK-09 | Valid book ID | Existing GUID | `200`, full book details |
| TC-BOOK-10 | Non-existent ID | Random GUID | `404` Not Found |
| TC-BOOK-11 | Invalid GUID format | `?id=notguid` | `400` Bad Request |
| TC-BOOK-12 | Soft-deleted book | GUID of a deleted book | `404` Not Found |

---

### 2.3 `GET /api/books/{id}/download`

Download the `.epub` file for a book. Authenticated users only.

**Auth required:** Bearer token (any role)

**Route parameter:** `id` â€” GUID of the book

**Response `200 OK`:**
- Content-Type: `application/epub+zip`
- Content-Disposition: `attachment; filename="book-title.epub"`
- Body: binary file content

**Test cases:**

| # | Scenario | Auth | Input | Expected |
|---|---|---|---|---|
| TC-BOOK-13 | Authenticated download | Valid token | Book with file | `200`, file downloads |
| TC-BOOK-14 | Unauthenticated download | No token | Any book ID | `401` Unauthorized |
| TC-BOOK-15 | Book without epub | Valid token | Book where `hasFile=false` | `404` Not Found |
| TC-BOOK-16 | Non-existent book | Valid token | Random GUID | `404` Not Found |

---

### 2.4 `POST /api/books`

Create a new book record. **Admin role required.**

**Auth required:** Bearer token with `Admin` role

**Request body:**

```json
{
  "title": "El amor en los tiempos del cÃ³lera",
  "pages": 368,
  "publicationYear": 1985,
  "isbn": "978-0-14-028778-9",
  "description": "A novel about love and aging...",
  "language": "Spanish",
  "authorIds": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
  "genreIds": ["7c9e6679-7425-40de-944b-e07fc1f90ae7"]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | Yes | Not empty, max 500 chars |
| `pages` | int | Yes | Greater than 0 |
| `publicationYear` | int? | No | 1000â€“2100 if provided |
| `isbn` | string? | No | Valid ISBN-10 or ISBN-13 format if provided |
| `description` | string? | No | Max 2000 chars |
| `language` | string | Yes | `"Spanish"` or `"English"` |
| `authorIds` | Guid[] | Yes | At least one valid author GUID |
| `genreIds` | Guid[] | Yes | At least one valid genre GUID |

**Response `201 Created`:**

```json
{
  "success": true,
  "data": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

**Note:** New books are created with `Status = "Unavailable"` and `HasFile = false`. Upload a `.epub` file using `POST /api/files/books/{id}/upload` to activate the book.

**Test cases:**

| # | Scenario | Auth | Expected |
|---|---|---|---|
| TC-BOOK-17 | Create full book | Admin token | `201`, new GUID returned |
| TC-BOOK-18 | Create minimal book | Admin token, only required fields | `201` |
| TC-BOOK-19 | Invalid author ID | Admin token, non-existent authorId | `404` |
| TC-BOOK-20 | Invalid genre ID | Admin token, non-existent genreId | `404` |
| TC-BOOK-21 | Empty title | Admin token, `title: ""` | `400` validation error |
| TC-BOOK-22 | Zero pages | Admin token, `pages: 0` | `400` validation error |
| TC-BOOK-23 | No auth | No token | `401` Unauthorized |
| TC-BOOK-24 | Regular user | Regular user token | `403` Forbidden |

---

### 2.5 `PUT /api/books/{id}`

Update an existing book's metadata. **Admin role required.**

**Auth required:** Bearer token with `Admin` role

**Route parameter:** `id` â€” GUID of the book

**Request body:**

```json
{
  "title": "Updated Title",
  "pages": 420,
  "publicationYear": 1985,
  "isbn": "978-0-14-028778-9",
  "description": "Updated description",
  "language": "Spanish"
}
```

All fields have the same validation rules as `POST /api/books`. Note: `authorIds` and `genreIds` cannot be updated via this endpoint.

**Response `204 No Content`** (empty body on success)

**Test cases:**

| # | Scenario | Auth | Expected |
|---|---|---|---|
| TC-BOOK-25 | Update existing book | Admin token | `204` |
| TC-BOOK-26 | Non-existent book | Admin token | `404` |
| TC-BOOK-27 | Empty title | Admin token | `400` validation error |
| TC-BOOK-28 | No auth | No token | `401` |
| TC-BOOK-29 | Regular user | Regular user token | `403` |

---

### 2.6 `DELETE /api/books/{id}`

Soft-delete a book. The book is marked as deleted but not removed from the database. **Admin role required.**

**Auth required:** Bearer token with `Admin` role

**Route parameter:** `id` â€” GUID of the book

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Auth | Expected |
|---|---|---|---|
| TC-BOOK-30 | Delete existing book | Admin token | `204` |
| TC-BOOK-31 | Non-existent book | Admin token | `404` |
| TC-BOOK-32 | Already-deleted book | Admin token | `404` |
| TC-BOOK-33 | No auth | No token | `401` |
| TC-BOOK-34 | Regular user | Regular user token | `403` |

---

## 3. Authors Endpoints (`/api/authors`)

---

### 3.1 `GET /api/authors`

Get a paged list of all authors ordered by name.

**Auth required:** None

**Query parameters:** `pageNumber` (default 1), `pageSize` (default 20)

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "name": "Gabriel GarcÃ­a MÃ¡rquez",
        "biography": "Colombian novelist and Nobel Prize winner...",
        "bookCount": 3
      }
    ],
    "totalCount": 25,
    "pageNumber": 1,
    "pageSize": 20,
    "totalPages": 2
  }
}
```

**Test cases:**

| # | Scenario | Query | Expected |
|---|---|---|---|
| TC-AUTH-15 | Default page | (none) | `200`, 20 authors (or fewer if < 20 exist) |
| TC-AUTH-16 | Custom page size | `?pageSize=5` | `200`, 5 results |
| TC-AUTH-17 | Page 2 | `?pageNumber=2&pageSize=5` | `200`, next 5 results |

---

### 3.2 `GET /api/authors/{id}`

Get full details of a single author.

**Auth required:** None

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-AUT-18 | Valid author ID | `200`, author with bookCount |
| TC-AUT-19 | Non-existent ID | `404` |

---

### 3.3 `POST /api/authors`

Create a new author. **Admin role required.**

**Request body:**

```json
{
  "name": "Isabel Allende",
  "biography": "Chilean author known for her magical realist fiction..."
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Not empty, max 300 chars |
| `biography` | string? | No | Max 2000 chars |

**Response `201 Created`:** `{ "data": "<guid>" }`

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-AUT-20 | Create valid author | `201`, new GUID |
| TC-AUT-21 | Name too long (>300 chars) | `400` |
| TC-AUT-22 | Empty name | `400` |
| TC-AUT-23 | No auth | `401` |
| TC-AUT-24 | Regular user | `403` |

---

### 3.4 `PUT /api/authors/{id}`

Update an author's name or biography. **Admin role required.**

**Request body:** Same shape as `POST /api/authors`.

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-AUT-25 | Update existing author | `204` |
| TC-AUT-26 | Non-existent author | `404` |
| TC-AUT-27 | No auth | `401` |

---

### 3.5 `DELETE /api/authors/{id}`

Soft-delete an author. **Admin role required.**

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-AUT-28 | Delete existing author | `204` |
| TC-AUT-29 | Non-existent author | `404` |
| TC-AUT-30 | No auth | `401` |

---

## 4. Genres Endpoints (`/api/genres`)

---

### 4.1 `GET /api/genres`

Get all genres ordered by name (no pagination).

**Auth required:** None

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Novela",
      "description": "Long-form prose fiction",
      "bookCount": 12
    }
  ]
}
```

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-GEN-01 | Get all genres | `200`, full list (no pagination) |

---

### 4.2 `GET /api/genres/{id}`

Get a single genre by GUID.

**Auth required:** None

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-GEN-02 | Valid genre ID | `200`, genre with bookCount |
| TC-GEN-03 | Non-existent ID | `404` |

---

### 4.3 `POST /api/genres`

Create a new genre. **Admin role required.**

**Request body:**

```json
{
  "name": "Ciencia FicciÃ³n",
  "description": "Speculative fiction based on science and technology"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Not empty, max 100 chars |
| `description` | string? | No | Max 500 chars |

**Response `201 Created`:** `{ "data": "<guid>" }`

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-GEN-04 | Create valid genre | `201`, new GUID |
| TC-GEN-05 | Duplicate name | `400` (unique constraint) |
| TC-GEN-06 | Empty name | `400` |
| TC-GEN-07 | No auth | `401` |
| TC-GEN-08 | Regular user | `403` |

---

### 4.4 `PUT /api/genres/{id}`

Update a genre's name or description. **Admin role required.**

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-GEN-09 | Update existing genre | `204` |
| TC-GEN-10 | Non-existent genre | `404` |
| TC-GEN-11 | No auth | `401` |

---

### 4.5 `DELETE /api/genres/{id}`

Soft-delete a genre. **Admin role required.**

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Expected |
|---|---|---|
| TC-GEN-12 | Delete existing genre | `204` |
| TC-GEN-13 | Non-existent genre | `404` |
| TC-GEN-14 | No auth | `401` |

---

## 5. Users Endpoints (`/api/users`)

All users endpoints require `Admin` role.

---

### 5.1 `GET /api/users`

Get a paged list of all users.

**Auth required:** Bearer token with `Admin` role

**Query parameters:** `pageNumber` (default 1), `pageSize` (default 20)

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "email": "user@example.com",
        "firstName": "Jane",
        "lastName": "Doe",
        "role": "Regular",
        "isActive": true,
        "createdAt": "2026-03-01T10:00:00Z"
      }
    ],
    "totalCount": 5,
    "pageNumber": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

**Test cases:**

| # | Scenario | Auth | Expected |
|---|---|---|---|
| TC-USR-01 | Get users list | Admin token | `200`, paged user list |
| TC-USR-02 | No auth | No token | `401` |
| TC-USR-03 | Regular user | Regular user token | `403` |

---

### 5.2 `PATCH /api/users/{id}/role`

Change a user's role between `Regular` and `Admin`.

**Auth required:** Bearer token with `Admin` role

**Route parameter:** `id` â€” GUID of the user to update

**Request body:**

```json
{
  "newRole": "Admin"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `newRole` | string | Yes | `"Regular"` or `"Admin"` |

**Response `204 No Content`**

**Test cases:**

| # | Scenario | Auth | Input | Expected |
|---|---|---|---|---|
| TC-USR-04 | Promote to Admin | Admin token | `{"newRole": "Admin"}` | `204` |
| TC-USR-05 | Demote to Regular | Admin token | `{"newRole": "Regular"}` | `204` |
| TC-USR-06 | Non-existent user | Admin token | Random GUID | `404` |
| TC-USR-07 | Invalid role value | Admin token | `{"newRole": "SuperAdmin"}` | `400` |
| TC-USR-08 | No auth | No token | Any | `401` |
| TC-USR-09 | Regular user | Regular user token | Any | `403` |

---

## 6. Files Endpoints (`/api/files`)

---

### 6.1 `POST /api/files/books/{bookId}/upload`

Upload a `.epub` file and associate it with a book. **Admin role required.** Max file size: 100 MB.

**Auth required:** Bearer token with `Admin` role

**Route parameter:** `bookId` â€” GUID of the book to attach the file to

**Request:** `multipart/form-data`

| Field | Type | Required | Rules |
|---|---|---|---|
| `file` | file | Yes | `.epub` extension only, max 100 MB |

**Example using curl:**
```bash
curl -X POST "http://localhost:5000/api/files/books/{bookId}/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/book.epub"
```

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "File uploaded successfully.",
  "data": "File uploaded and associated with book."
}
```

**After upload:** The book's `HasFile` property becomes `true` and its `Status` remains `Available` (or updates to `Available` if the book was `Unavailable`).

**Test cases:**

| # | Scenario | Auth | Input | Expected |
|---|---|---|---|---|
| TC-FILE-01 | Upload valid .epub | Admin token | Valid .epub file | `200`, success message |
| TC-FILE-02 | Upload .pdf file | Admin token | .pdf file | `400`, only .epub accepted |
| TC-FILE-03 | Upload .txt file | Admin token | .txt file | `400` |
| TC-FILE-04 | No file attached | Admin token | Empty request | `400` |
| TC-FILE-05 | Non-existent bookId | Admin token | Random GUID | `404` |
| TC-FILE-06 | No auth | No token | Any | `401` |
| TC-FILE-07 | Regular user | Regular user token | Any | `403` |

---

## 7. Suggested Testing Order

Follow this sequence for a complete end-to-end test of all endpoints:

### Phase 1 â€” Setup Data

1. `POST /api/auth/login` â€” login as admin â†’ save token as `ADMIN_TOKEN`
2. `POST /api/genres` â€” create 2â€“3 genres â†’ save GUIDs as `GENRE_ID_1`, `GENRE_ID_2`
3. `POST /api/authors` â€” create 2â€“3 authors â†’ save GUIDs as `AUTHOR_ID_1`, `AUTHOR_ID_2`
4. `POST /api/books` â€” create 2 books using the genre and author IDs above â†’ save GUIDs
5. `POST /api/files/books/{id}/upload` â€” upload an `.epub` to one book

### Phase 2 â€” Anonymous Read Operations

6. `GET /api/books/search` â€” verify catalog is searchable
7. `GET /api/books/{id}` â€” verify book detail
8. `GET /api/authors` â€” verify author list
9. `GET /api/genres` â€” verify genre list

### Phase 3 â€” User Authentication & Features

10. `POST /api/auth/register` â€” register a regular user â†’ save token as `USER_TOKEN`
11. `GET /api/books/{id}/download` â€” download using `USER_TOKEN`
12. `GET /api/users` using `USER_TOKEN` â†’ expect `403`

### Phase 4 â€” Admin Management

13. `GET /api/users` using `ADMIN_TOKEN` â†’ see all users
14. `PATCH /api/users/{userId}/role` â†’ promote the regular user to Admin
15. `PUT /api/books/{id}` â€” update a book title
16. `DELETE /api/genres/{id}` â€” delete a genre
17. `DELETE /api/authors/{id}` â€” delete an author
18. `DELETE /api/books/{id}` â€” delete a book
19. `GET /api/books/{deletedId}` â†’ confirm `404`

### Phase 5 â€” Error Scenarios

20. Call any write endpoint without a token â†’ expect `401`
21. Call admin endpoint with `USER_TOKEN` â†’ expect `403`
22. Call 11 login requests in under 1 minute â†’ expect `429` on the 11th

---

## 8. Testing via Scalar UI

The Scalar UI at `http://localhost:5000/scalar/v1` supports authenticated requests.

> **Note:** Scalar's authentication UI differs from the old Swagger UI. There is no global "Authorize" dialog â€” authentication is set per-request via the **Authorization** field in the request panel. Scalar automatically prepends `Bearer ` when you select the Bearer scheme.

1. Call `POST /api/auth/login` from the Scalar UI.
2. Copy the `token` value from the response.
3. On any protected request, expand the **Authorization** section in the request panel.
4. Select **Bearer Token** and paste the token value (without the word "Bearer").
5. Send the request â€” Scalar injects `Authorization: Bearer <token>` automatically.

Alternatively, use the **OpenAPI schema** at `http://localhost:5000/openapi/v1.json` to import the API into Postman or any OpenAPI-compatible tool.

---

## 9. Environment Variables Reference

| Variable | Used By | Default Value |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | WebApi | `Server=localhost;Database=EBookLibraryDb;Trusted_Connection=True;TrustServerCertificate=True` |
| `JwtSettings__SecretKey` | WebApi | (must be set â€” min 64 chars) |
| `JwtSettings__Issuer` | WebApi | `EBookLibrary` |
| `JwtSettings__Audience` | WebApi | `EBookLibraryUsers` |
| `JwtSettings__ExpiryInMinutes` | WebApi | `60` |
| `FileStorageSettings__BasePath` | WebApi | `C:\EBookLibrary\Books` |
| `VITE_API_BASE_URL` | React | `http://localhost:5000/api` |
| `ApiBaseUrl` | Blazor (`appsettings.json`) | `http://localhost:5000/api` |

---

## 10. Quick Reference â€” All Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Anonymous | Register new user |
| POST | `/api/auth/login` | Anonymous | Login, get JWT token |
| GET | `/api/books/search` | Anonymous | Search book catalog |
| GET | `/api/books/{id}` | Anonymous | Get book by ID |
| GET | `/api/books/{id}/download` | Any authenticated | Download epub file |
| POST | `/api/books` | Admin | Create book |
| PUT | `/api/books/{id}` | Admin | Update book metadata |
| DELETE | `/api/books/{id}` | Admin | Soft-delete book |
| GET | `/api/authors` | Anonymous | List all authors (paged) |
| GET | `/api/authors/{id}` | Anonymous | Get author by ID |
| POST | `/api/authors` | Admin | Create author |
| PUT | `/api/authors/{id}` | Admin | Update author |
| DELETE | `/api/authors/{id}` | Admin | Soft-delete author |
| GET | `/api/genres` | Anonymous | List all genres |
| GET | `/api/genres/{id}` | Anonymous | Get genre by ID |
| POST | `/api/genres` | Admin | Create genre |
| PUT | `/api/genres/{id}` | Admin | Update genre |
| DELETE | `/api/genres/{id}` | Admin | Soft-delete genre |
| GET | `/api/users` | Admin | List all users (paged) |
| PATCH | `/api/users/{id}/role` | Admin | Change user role |
| POST | `/api/files/books/{id}/upload` | Admin | Upload epub file |
