import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SearchBar from '../components/SearchBar';
import BookCard from '../components/BookCard';
import Pagination from '../components/Pagination';
import { useSearchBooks } from '../hooks/useBooks';
import type { BookSearchFilter } from '../types/api';

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<BookSearchFilter>({
    title: searchParams.get('title') ?? undefined,
    authorName: searchParams.get('authorName') ?? undefined,
    genreName: searchParams.get('genreName') ?? undefined,
    publicationYear: searchParams.get('publicationYear') ? Number(searchParams.get('publicationYear')) : undefined,
    pageNumber: 1,
    pageSize: 24,
  });

  // Sync URL → filter on param changes
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      title: searchParams.get('title') ?? undefined,
      authorName: searchParams.get('authorName') ?? undefined,
      genreName: searchParams.get('genreName') ?? undefined,
      publicationYear: searchParams.get('publicationYear') ? Number(searchParams.get('publicationYear')) : undefined,
      pageNumber: 1,
    }));
  }, [searchParams]);

  const { data, isFetching } = useSearchBooks(filter);

  const handleSearch = (filters: Partial<BookSearchFilter>) => {
    const params = new URLSearchParams();
    if (filters.title) params.set('title', filters.title);
    if (filters.authorName) params.set('authorName', filters.authorName);
    if (filters.genreName) params.set('genreName', filters.genreName);
    if (filters.publicationYear) params.set('publicationYear', String(filters.publicationYear));
    setSearchParams(params);
    setFilter({ ...filter, ...filters, pageNumber: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilter(prev => ({ ...prev, pageNumber: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('search.title')}</h1>

      {/* Search bar */}
      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Results count */}
      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {t('search.results_count', { count: data.totalCount.toLocaleString() })}
        </p>
      )}

      {/* Results grid */}
      {isFetching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">{t('search.no_results')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data?.items.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={filter.pageNumber ?? 1}
          totalPages={data.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
