import { useQuery, useMutation } from '@tanstack/react-query';
import { booksApi } from '../api/booksApi';
import type { BookSearchFilter } from '../types/api';

export const BOOKS_QUERY_KEY = 'books';

export function useSearchBooks(filter: BookSearchFilter) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, 'search', filter],
    queryFn: () => booksApi.search(filter),
    placeholderData: (prev) => prev, // smooth pagination (v5 equivalent of keepPreviousData)
  });
}

export function useBookDetail(id: string) {
  return useQuery({
    queryKey: [BOOKS_QUERY_KEY, id],
    queryFn: () => booksApi.getById(id),
    enabled: !!id,
  });
}

export function useDownloadBook() {
  return useMutation({
    mutationFn: async (bookId: string) => {
      const blob = await booksApi.download(bookId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-${bookId}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
