import { apiClient } from './apiClient';
import type { Author, Genre, User, PagedResult, ApiResponse } from '../types/api';

// ── Authors ────────────────────────────────────────────────────────────────
export const authorsApi = {
  getAll: (pageNumber = 1, pageSize = 20) =>
    apiClient.get<ApiResponse<PagedResult<Author>>>('/authors', { params: { pageNumber, pageSize } })
      .then(r => r.data.data!),

  create: (data: { name: string; biography?: string }) =>
    apiClient.post<ApiResponse<string>>('/authors', data).then(r => r.data),

  update: (id: string, data: { name: string; biography?: string }) =>
    apiClient.put(`/authors/${id}`, { authorId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/authors/${id}`),
};

// ── Genres ─────────────────────────────────────────────────────────────────
export const genresApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Genre[]>>('/genres').then(r => r.data.data!),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<ApiResponse<string>>('/genres', data).then(r => r.data),

  update: (id: string, data: { name: string; description?: string }) =>
    apiClient.put(`/genres/${id}`, { genreId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/genres/${id}`),
};

// ── Users ──────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (pageNumber = 1, pageSize = 20) =>
    apiClient.get<ApiResponse<PagedResult<User>>>('/users', { params: { pageNumber, pageSize } })
      .then(r => r.data.data!),

  updateRole: (id: string, newRole: string) =>
    apiClient.patch(`/users/${id}/role`, { newRole }),

  updateStatus: (id: string) =>
    apiClient.patch(`/users/${id}/status`, null),

  updateUser: (id: string, data: import('../types/api').UpdateUserRequest) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data).then(r => r.data.data!),

  deleteUser: (id: string) =>
    apiClient.delete(`/users/${id}`),
};

// ── Books admin ────────────────────────────────────────────────────────────
export interface CreateBookPayload {
  title: string;
  pages: number;
  publicationYear?: number;
  isbn?: string;
  description?: string;
  language: string;
  authorIds: string[];
  genreIds: string[];
}

export interface UpdateBookPayload {
  title: string;
  pages: number;
  publicationYear?: number;
  isbn?: string;
  description?: string;
  language: string;
}

export const adminBooksApi = {
  create: (data: CreateBookPayload) =>
    apiClient.post<ApiResponse<string>>('/books', data).then(r => r.data),

  update: (id: string, data: UpdateBookPayload) =>
    apiClient.put(`/books/${id}`, { bookId: id, ...data }),

  delete: (id: string) =>
    apiClient.delete(`/books/${id}`),
};
