// Auth
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  email: string; password: string; confirmPassword: string;
  firstName?: string; lastName?: string;
}
export interface AuthResponse {
  userId: string; email: string; firstName?: string; lastName?: string;
  role: 'Regular' | 'Admin'; token: string; expiresAt: string;
}

// Books
export interface BookSummary {
  id: string; title: string; pages: number; publicationYear?: number;
  coverImageUrl?: string; status: 'Available' | 'Unavailable' | 'Removed';
  hasFile: boolean; primaryAuthor: string; primaryGenre: string;
}
export interface BookDetail {
  id: string; title: string; pages: number; publicationYear?: number;
  isbn?: string; description?: string; coverImageUrl?: string;
  language: string; status: string; hasFile: boolean;
  authors: string[]; genres: string[];
}
export interface BookSearchFilter {
  title?: string; authorName?: string; genreName?: string;
  publicationYear?: number; pageNumber?: number; pageSize?: number;
}

// Paged result
export interface PagedResult<T> {
  items: T[]; totalCount: number; pageNumber: number; pageSize: number;
  totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean;
}

// API response envelope
export interface ApiResponse<T> { success: boolean; data?: T; message?: string; errors?: string[]; }

// Authors, Genres
export interface Author { id: string; name: string; biography?: string; bookCount: number; }
export interface Genre { id: string; name: string; description?: string; bookCount: number; }

// Users (Admin)
export interface User {
  id: string; email: string; firstName?: string; lastName?: string;
  role: string; isActive: boolean; createdAt: string;
}
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email: string;
  newPassword?: string;
}
