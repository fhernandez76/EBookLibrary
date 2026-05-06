import { apiClient } from './apiClient';
import type { BookDetail, BookSearchFilter, BookSummary, PagedResult, ApiResponse } from '../types/api';

export const booksApi = {
  search: (filter: BookSearchFilter) =>
    apiClient.get<ApiResponse<PagedResult<BookSummary>>>('/books/search', { params: filter })
      .then(r => r.data.data!),

  getById: (id: string) =>
    apiClient.get<ApiResponse<BookDetail>>(`/books/${id}`).then(r => r.data.data!),

  download: (id: string) =>
    apiClient.get(`/books/${id}/download`, { responseType: 'blob' }).then(r => r.data),
};
