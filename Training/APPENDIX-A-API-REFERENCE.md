# Appendix A — API Reference

> Full endpoint reference for the EBook Library REST API.

**Base URL:** `http://localhost:5149/api`  
**API Docs (Scalar):** `http://localhost:5149/scalar`  
**Authentication:** `Authorization: Bearer <jwt_token>`

---

## Standard Response Envelope

All endpoints return `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { }
}
```

Error responses use `"success": false` with `"data": null`.

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200 OK` | Successful read/update |
| `201 Created` | Resource created |
| `204 No Content` | Successful delete/update (no body) |
| `400 Bad Request` | Validation error |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Valid token, insufficient role |
| `404 Not Found` | Resource not found (or soft-deleted) |
| `429 Too Many Requests` | Auth rate limit (10 req/min) |
| `500 Internal Server Error` | Unhandled server exception |

---

## Auth Endpoints (`/api/auth`)

### POST `/api/auth/register`

Register a new user. No auth required.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "MyPass@123",
  "confirmPassword": "MyPass@123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

| Field | Required | Rules |
|---|---|---|
| `email` | Yes | Valid email, unique |
| `password` | Yes | Min 8 chars, uppercase + lowercase + digit + special char |
| `confirmPassword` | Yes | Must match `password` |
| `firstName` | No | Max 100 chars |
| `lastName` | No | Max 100 chars |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "userId": "3fa85f64-...",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "Regular",
    "token": "eyJhbGci...",
    "expiresAt": "2026-01-01T14:00:00Z"
  }
}
```

**curl example:**
```bash
curl -X POST http://localhost:5149/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"MyPass@123","confirmPassword":"MyPass@123"}'
```

---

### POST `/api/auth/login`

Authenticate and get JWT token. No auth required.

**Request:**
```json
{ "email": "admin@ebooklibrary.com", "password": "Admin@12345" }
```

**Response `200 OK`:** Same structure as register response.

**curl example:**
```bash
curl -X POST http://localhost:5149/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ebooklibrary.com","password":"Admin@12345"}'
```

> **Note:** Login returns the same error message whether the email is not found or the password is wrong. This is intentional — prevents user enumeration attacks.

---

## Books Endpoints (`/api/books`)

### GET `/api/books/search`

Search the book catalog. Anonymous access allowed.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `title` | string | null | Partial title match (case-insensitive) |
| `authorName` | string | null | Partial author name match |
| `genreName` | string | null | Exact genre name match |
| `publicationYear` | int | null | Exact year |
| `pageNumber` | int | 1 | 1-based page number |
| `pageSize` | int | 20 | Max 100 per page |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "3fa85f64-...",
        "title": "Cien años de soledad",
        "pages": 417,
        "publicationYear": 1967,
        "coverImageUrl": null,
        "status": "Available",
        "hasFile": true,
        "primaryAuthor": "Gabriel García Márquez",
        "primaryGenre": "Novela"
      }
    ],
    "totalCount": 42,
    "pageNumber": 1,
    "pageSize": 20,
    "totalPages": 3,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

**curl example:**
```bash
curl "http://localhost:5149/api/books/search?title=quijote&pageSize=5"
```

---

### GET `/api/books/{id}`

Get full book details. Anonymous access allowed.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-...",
    "title": "Cien años de soledad",
    "pages": 417,
    "publicationYear": 1967,
    "isbn": "978-0-06-088328-7",
    "description": "A landmark of magical realism...",
    "language": "Spanish",
    "status": "Available",
    "hasFile": true,
    "authors": ["Gabriel García Márquez"],
    "genres": ["Novela", "Realismo mágico"]
  }
}
```

**curl example:**
```bash
curl http://localhost:5149/api/books/3fa85f64-5717-4562-b3fc-2c963f66afa6
```

---

### GET `/api/books/{id}/download`

Download the `.epub` file. **Auth required (any role).**

**Response `200 OK`:**
- `Content-Type: application/epub+zip`
- `Content-Disposition: attachment; filename="book-title.epub"`
- Body: binary file

**curl example:**
```bash
curl -X GET http://localhost:5149/api/books/{id}/download \
  -H "Authorization: Bearer $TOKEN" \
  --output "book.epub"
```

---

### POST `/api/books` — Admin only

Create a book record.

**Request:**
```json
{
  "title": "El amor en los tiempos del cólera",
  "pages": 368,
  "publicationYear": 1985,
  "isbn": "978-0-14-028778-9",
  "description": "A novel about love...",
  "language": "Spanish",
  "authorIds": ["guid-of-author"],
  "genreIds": ["guid-of-genre"]
}
```

**Response `201 Created`:** Returns the new book GUID in `data`.

> New books start with `status = "Unavailable"`. Upload an `.epub` with `POST /api/files/books/{id}/upload` to activate.

---

### PUT `/api/books/{id}` — Admin only

Update book metadata. **Response `204 No Content`.**

---

### DELETE `/api/books/{id}` — Admin only

Soft-delete a book. **Response `204 No Content`.**

---

## Authors Endpoints (`/api/authors`)

### GET `/api/authors`

List all authors (paginated). Anonymous access.

**Query:** `pageNumber`, `pageSize`, `name` (partial match)

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "items": [{ "id": "...", "name": "García Márquez", "bookCount": 5 }],
    "totalCount": 1200, "pageNumber": 1, "pageSize": 20, "totalPages": 60
  }
}
```

---

### GET `/api/authors/{id}`

Get a single author with book list. Anonymous access.

---

### POST `/api/authors` — Admin only

Create an author. **Request:** `{ "name": "...", "biography": "..." }`. **Response `201`.**

---

### PUT `/api/authors/{id}` — Admin only

Update author. **Response `204`.**

---

### DELETE `/api/authors/{id}` — Admin only

Soft-delete author. **Response `204`.**

---

## Genres Endpoints (`/api/genres`)

Identical structure to Authors endpoints.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/genres` | None | List all genres |
| GET | `/api/genres/{id}` | None | Get genre with books |
| POST | `/api/genres` | Admin | Create genre |
| PUT | `/api/genres/{id}` | Admin | Update genre |
| DELETE | `/api/genres/{id}` | Admin | Soft-delete genre |

---

## Users Endpoints (`/api/users`)

### GET `/api/users/me`

Get current authenticated user's profile. **Auth required.**

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "Regular",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "downloadHistory": [
      { "bookId": "...", "title": "Cien años de soledad", "downloadedAt": "2024-03-15T10:00:00Z" }
    ]
  }
}
```

**curl example:**
```bash
curl http://localhost:5149/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET `/api/users` — Admin only

List all users (paginated). **Query:** `pageNumber`, `pageSize`.

---

### PATCH `/api/users/{id}/role` — Admin only

Change a user's role. **Request:** `{ "newRole": "Admin" }`. **Response `204`.**

---

### PATCH `/api/users/{id}/status` — Admin only

Toggle a user's active status (active ↔ inactive). No body required.  
**Response `204 No Content`.** Returns `400 Bad Request` if the target is the requesting admin.

**curl example:**
```bash
curl -X PATCH http://localhost:5149/api/users/{id}/status \
  -H "Authorization: Bearer $TOKEN"
```

---

### PUT `/api/users/{id}` — Admin only

Update a user's profile. Optionally reset the password.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "newPassword": "NewPass@123"
}
```

`newPassword` is optional — omit it (or send `null`) to leave the password unchanged.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "Regular",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

Returns `400` if email is already taken by another user, or `404` if user not found.

---

### DELETE `/api/users/{id}` — Admin only

Permanently (hard) delete a user. **Response `204 No Content`.**  
Returns `400 Bad Request` if the target is the requesting admin.  
Returns `404 Not Found` if the user does not exist.

---

## Files Endpoints (`/api/files`)

### POST `/api/files/books/{id}/upload` — Admin only

Upload an `.epub` file for a book. Changes book status to `Available`.

**Content-Type:** `multipart/form-data`  
**Form field:** `file` — the `.epub` file

**Response `200 OK`:** Returns updated book with `status: "Available"`.

**curl example:**
```bash
curl -X POST http://localhost:5149/api/files/books/{id}/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/book.epub"
```

---

## Testing with `.http` File

Create `api-tests.http` in your editor to test all endpoints:

```http
@baseUrl = http://localhost:5149/api
@token = <paste token here after login>

### Register
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test@12345",
  "confirmPassword": "Test@12345"
}

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@ebooklibrary.com",
  "password": "Admin@12345"
}

### Search books
GET {{baseUrl}}/books/search?title=garcia&pageSize=5

### Get book by id
GET {{baseUrl}}/books/{replace-with-guid}

### Download book
GET {{baseUrl}}/books/{replace-with-guid}/download
Authorization: Bearer {{token}}

### Create book (admin only)
POST {{baseUrl}}/books
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "title": "Test Book",
  "pages": 200,
  "language": "Spanish",
  "authorIds": ["{author-guid}"],
  "genreIds": ["{genre-guid}"]
}
```

---

**← Previous:** [14 — Deployment Checklist](14-DEPLOYMENT-CHECKLIST.md)  
**Next →** [Appendix B — Exercises](APPENDIX-B-EXERCISES.md)
