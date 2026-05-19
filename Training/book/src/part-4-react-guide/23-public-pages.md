# Chapter 23 — Public Pages: Home, Search, and Book Detail

> *"The reader comes for the books. Every design decision should
> get out of the way and let the catalog speak."*

---

## What you will learn

- How to build three shared UI components: `BookCard`, `Pagination`,
  and `SearchBar`.
- How the `HomePage` fetches featured books and genres and displays
  a hero section.
- How `SearchPage` uses URL search parameters as the single source
  of truth for filter state so the back button and direct links work.
- How `BookDetailPage` streams a binary file download using a hidden
  `<a>` element.

**Expected result:** Searching for "cervantes" returns a paginated
list of books. Clicking a book opens the detail page. An authenticated
user can click Download and receive the file.

---

## 23.1 BookCard component

`BookCard` is the atomic unit of the catalog — it appears on the Home
page, the Search results page, and indirectly in the admin list. It
accepts a `BookSummary` and a download mutation hook.

**File:** `src/components/BookCard.tsx`

```tsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDownloadBook } from '../hooks/useBooks';
import type { BookSummary } from '../types/api';

const GENRE_COLORS: Record<string, string> = {
  default:  'bg-blue-100 text-blue-700',
  Fiction:  'bg-purple-100 text-purple-700',
  History:  'bg-amber-100 text-amber-700',
  Science:  'bg-green-100 text-green-700',
  Romance:  'bg-pink-100 text-pink-700',
  Mystery:  'bg-gray-100 text-gray-700',
};

interface BookCardProps {
  book: BookSummary;
}

export default function BookCard({ book }: BookCardProps) {
  const { t }  = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { mutate: download, isPending } = useDownloadBook();

  const genreColor = GENRE_COLORS[book.primaryGenre] ?? GENRE_COLORS.default;
  const isAvailable = book.status === 'Available';

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();         // stop the Link from navigating
    e.stopPropagation();
    if (isAuthenticated && book.hasFile) {
      download(book.id);
    } else if (!isAuthenticated) {
      window.location.href = '/login';
    }
  };

  return (
    <Link to={`/books/${book.id}`} className="book-card flex flex-col overflow-hidden group">

      {/* Cover image */}
      <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 h-44 flex items-center justify-center overflow-hidden">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className="w-16 h-16 text-white/60" />
        )}
        {/* Availability dot */}
        <div className="absolute top-2 right-2">
          {isAvailable
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <XCircle    className="w-4 h-4 text-gray-400" />
          }
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${genreColor}`}>
          {book.primaryGenre}
        </span>
        <h3 className="font-serif text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">{book.primaryAuthor}</p>

        {/* Footer: page count + download button */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{t('book.pages', { count: book.pages })}</span>
          {isAvailable && book.hasFile && (
            <button
              onClick={handleDownload}
              disabled={isPending}
              className="p-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white
                         transition-colors disabled:opacity-50"
              title={t('book.download')}
            >
              {isAuthenticated
                ? <Download className="w-3 h-3" />
                : <Lock     className="w-3 h-3" />
              }
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
```

The `handleDownload` function calls `e.preventDefault()` to stop the
`<Link>` from navigating. It calls `e.stopPropagation()` to prevent
the click from bubbling up to the card's `onClick` listener. Without
these two calls, clicking the download button would navigate to the
book detail page instead.

---

## 23.2 Pagination component

**File:** `src/components/Pagination.tsx`

```tsx
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages:  number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  // Build a condensed page list with ellipsis for large ranges
  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    const start = Math.max(2, currentPage - 2);
    const end   = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2)           pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {getPages().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-3 py-1.5 text-sm text-gray-500">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="ml-3 text-xs text-gray-400">
        {t('common.page_of', { current: currentPage, total: totalPages })}
      </span>
    </div>
  );
}
```

The `getPages()` function always shows pages 1 and `totalPages`, and
up to two pages either side of the current page, with `'...'` ellipsis
for gaps. For a catalog with hundreds of pages this keeps the
pagination control short.

---

## 23.3 SearchBar component

`SearchBar` is used both on the `HomePage` (where it navigates to
`/search`) and on `SearchPage` itself (where it updates the search
parameters in place).

**File:** `src/components/SearchBar.tsx`

```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { genresApi } from '../api/adminApi';

interface SearchBarProps {
  onSearch?: (filters: {
    title?: string;
    authorName?: string;
    genreName?: string;
    publicationYear?: number;
  }) => void;
  inline?: boolean;   // larger height variant used on the hero section
}

export default function SearchBar({ onSearch, inline }: SearchBarProps) {
  const { t }   = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title,        setTitle]        = useState(searchParams.get('title') ?? '');
  const [author,       setAuthor]       = useState(searchParams.get('authorName') ?? '');
  const [genre,        setGenre]        = useState(searchParams.get('genreName') ?? '');
  const [year,         setYear]         = useState(searchParams.get('publicationYear') ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters = {
      title:             title || undefined,
      authorName:        author || undefined,
      genreName:         genre || undefined,
      publicationYear:   year ? Number(year) : undefined,
    };
    if (onSearch) {
      onSearch(filters);
    } else {
      const params = new URLSearchParams();
      if (filters.title)           params.set('title',           filters.title);
      if (filters.authorName)      params.set('authorName',      filters.authorName);
      if (filters.genreName)       params.set('genreName',       filters.genreName);
      if (filters.publicationYear) params.set('publicationYear', String(filters.publicationYear));
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleClear = () => {
    setTitle(''); setAuthor(''); setGenre(''); setYear('');
    if (onSearch) onSearch({});
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Main row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('home.search_placeholder')}
            className={`input-field pl-10 ${inline ? 'h-12 text-base' : ''}`}
          />
          {title && (
            <button type="button" onClick={() => setTitle('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary whitespace-nowrap">
          {t('home.search_btn')}
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2.5 rounded-lg border transition-colors ${
            showAdvanced
              ? 'bg-primary-500 text-white border-primary-500'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title={t('search.filters')}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('search.filter_author')}</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)}
              className="input-field" placeholder="e.g. García Márquez" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('search.filter_genre')}</label>
            <select value={genre} onChange={e => setGenre(e.target.value)} className="input-field">
              <option value="">All genres</option>
              {genres?.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('search.filter_year')}</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="input-field" placeholder="e.g. 1605" min="1400" max="2030" />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="button" onClick={handleClear}
              className="text-xs text-gray-500 hover:text-gray-700 underline">
              {t('search.clear_filters')}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
```

---

## 23.4 HomePage

**File:** `src/pages/HomePage.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import BookCard from '../components/BookCard';
import { booksApi } from '../api/booksApi';
import { genresApi } from '../api/adminApi';

const GENRE_COLORS = [
  'from-purple-500 to-purple-700', 'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',   'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',     'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700', 'from-orange-500 to-orange-700',
];

export default function HomePage() {
  const { t }    = useTranslation();
  const navigate = useNavigate();

  const { data: featuredBooks } = useQuery({
    queryKey: ['books', 'home', 'featured'],
    queryFn: () => booksApi.search({ pageSize: 12 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const topGenres = genres?.slice(0, 8) ?? [];

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-14 h-14 text-white/80" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-white">
            {t('home.hero_title')}
          </h1>
          <p className="text-lg text-primary-100 mb-10">
            {t('home.hero_subtitle')}
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar inline />
          </div>
        </div>
      </section>

      {/* ── Genre chips ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
          {t('home.featured_genres')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {topGenres.map((genre, idx) => (
            <button
              key={genre.id}
              onClick={() => navigate(`/search?genreName=${encodeURIComponent(genre.name)}`)}
              className={`bg-gradient-to-br ${GENRE_COLORS[idx % GENRE_COLORS.length]}
                text-white rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}
            >
              <p className="font-serif font-semibold text-sm">{genre.name}</p>
              <p className="text-xs text-white/70 mt-1">{genre.bookCount.toLocaleString()} books</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured books ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
          {t('home.new_arrivals')}
        </h2>
        {featuredBooks ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featuredBooks.items.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          /* Loading skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        )}
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div className="bg-primary-50 border-t border-primary-100 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-primary-700 font-semibold text-lg">
            76,000+ eBooks available · Free to browse · ePub downloads
          </p>
        </div>
      </div>
    </div>
  );
}
```

The loading skeleton (the `Array.from({ length: 12 })` block) renders
while the `featuredBooks` query is pending. It shows twelve grey
rectangles of the same dimensions as real book cards. This technique —
known as a *skeleton screen* — is preferable to a spinner because it
communicates the shape of the incoming content.

---

## 23.5 SearchPage

**File:** `src/pages/SearchPage.tsx`

```tsx
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

  // Initialise filter from URL so direct links and back button work
  const [filter, setFilter] = useState<BookSearchFilter>({
    title:           searchParams.get('title')           ?? undefined,
    authorName:      searchParams.get('authorName')      ?? undefined,
    genreName:       searchParams.get('genreName')       ?? undefined,
    publicationYear: searchParams.get('publicationYear') ?
      Number(searchParams.get('publicationYear')) : undefined,
    pageNumber: 1,
    pageSize:   24,
  });

  // Keep filter in sync when URL params change (e.g. browser back/forward)
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      title:           searchParams.get('title')           ?? undefined,
      authorName:      searchParams.get('authorName')      ?? undefined,
      genreName:       searchParams.get('genreName')       ?? undefined,
      publicationYear: searchParams.get('publicationYear') ?
        Number(searchParams.get('publicationYear')) : undefined,
      pageNumber: 1,
    }));
  }, [searchParams]);

  const { data, isFetching } = useSearchBooks(filter);

  const handleSearch = (filters: Partial<BookSearchFilter>) => {
    const params = new URLSearchParams();
    if (filters.title)           params.set('title',           filters.title);
    if (filters.authorName)      params.set('authorName',      filters.authorName);
    if (filters.genreName)       params.set('genreName',       filters.genreName);
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

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {t('search.results_count', { count: data.totalCount.toLocaleString() })}
        </p>
      )}

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
          {data?.items.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}

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
```

The URL is the source of truth for the filter state. When
`setSearchParams(params)` is called, the URL updates. The `useEffect`
listens for URL changes and syncs the filter. This means:
- Sharing a URL like `/search?genreName=Historia` opens the same
  search results for anyone.
- Pressing the browser Back button restores the previous search.
- Refreshing the page does not lose the search.

---

## 23.6 BookDetailPage

**File:** `src/pages/BookDetailPage.tsx`

```tsx
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, Lock, ArrowLeft, Calendar, FileText, Globe } from 'lucide-react';
import { useBookDetail, useDownloadBook } from '../hooks/useBooks';
import { useAuthStore } from '../stores/authStore';

const STATUS_STYLES: Record<string, string> = {
  Available:   'bg-green-100 text-green-700',
  Unavailable: 'bg-gray-100 text-gray-600',
  Removed:     'bg-red-100 text-red-600',
};

export default function BookDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { data: book, isLoading, isError } = useBookDetail(id!);
  const { mutate: download, isPending }    = useDownloadBook();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-8">
            <div className="w-48 h-64 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">
        <p>{t('common.error')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn-primary">Go Back</button>
      </div>
    );
  }

  const isAvailable = book.status === 'Available';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/"       className="hover:text-primary-500 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/search" className="hover:text-primary-500 transition-colors">Books</Link>
        <span>/</span>
        <span className="text-gray-700 truncate max-w-xs">{book.title}</span>
      </nav>

      {/* Hero: cover + metadata */}
      <div className="flex flex-col sm:flex-row gap-8 mb-10">

        {/* Cover */}
        <div className="flex-none">
          <div className="w-40 h-56 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl
                          flex items-center justify-center shadow-lg">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={book.title}
                   className="w-full h-full object-cover rounded-xl" />
            ) : (
              <BookOpen className="w-16 h-16 text-white/60" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 mb-3">
            {book.genres.map(g => (
              <span key={g} className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {g}
              </span>
            ))}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              STATUS_STYLES[book.status] ?? STATUS_STYLES.Unavailable
            }`}>
              {book.status}
            </span>
          </div>

          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{book.title}</h1>
          <p className="text-gray-500 text-sm mb-4">{book.authors.join(', ')}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {t('book.pages', { count: book.pages })}
            </span>
            {book.publicationYear && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {t('book.year', { year: book.publicationYear })}
              </span>
            )}
            {book.language && (
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                {book.language}
              </span>
            )}
          </div>

          {/* Download / login prompt */}
          {isAvailable && book.hasFile ? (
            isAuthenticated ? (
              <button
                onClick={() => download(book.id)}
                disabled={isPending}
                className="btn-accent flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isPending ? t('common.loading') : t('book.download')}
              </button>
            ) : (
              <Link to="/login" className="btn-primary flex items-center gap-2 w-fit">
                <Lock className="w-4 h-4" />
                {t('book.login_to_download')}
              </Link>
            )
          ) : (
            <span className="text-sm text-gray-400">{t('book.unavailable')}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="mb-8">
          <h2 className="text-xl font-serif font-semibold text-gray-900 mb-3">About this book</h2>
          <p className="text-gray-600 leading-relaxed">{book.description}</p>
        </div>
      )}

      {/* Author links */}
      {book.authors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('book.authors')}</h3>
          <div className="flex flex-wrap gap-2">
            {book.authors.map(a => (
              <Link
                key={a}
                to={`/search?authorName=${encodeURIComponent(a)}`}
                className="text-sm text-primary-500 hover:underline"
              >
                {a}
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500 transition-colors mt-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
    </div>
  );
}
```

### The blob download pattern

The `useDownloadBook` mutation (defined in `src/hooks/useBooks.ts` in
Chapter 20) handles the binary download. The pattern it uses:

```typescript
const url = window.URL.createObjectURL(blob);
const a   = document.createElement('a');
a.href     = url;
a.download = `book-${bookId}.epub`;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);   // release memory immediately
document.body.removeChild(a);
```

:::warning
**Always call `URL.revokeObjectURL()` after the click.**
The browser holds the Blob in memory until either the URL is revoked
or the tab closes. For a file of several megabytes, forgetting to
revoke on a search page with dozens of books creates a significant
memory leak. Revoke immediately after the synthetic click.
:::

---

## Chapter 23 checkpoint

1. Navigate to `http://localhost:5173` — the hero section and genre
   chips render.
2. Type "cervantes" in the search bar and submit — you reach
   `/search?title=cervantes` and see a grid of books.
3. Paginate to page 2 — the URL updates to reflect the page change,
   the grid updates smoothly (previous page shows briefly while the
   next loads).
4. Copy the URL, open a new tab, and paste — the same results appear.
5. Click a book — the detail page renders with title, authors, and
   metadata.
6. If logged in: click Download — the browser downloads a `.epub` file.
7. If not logged in: the Download button says "Login to Download".
   Clicking it navigates to `/login`.

---

## Key takeaways

- URL search parameters are the correct location for filter state —
  they survive refresh, copy-paste, and browser history.
- `placeholderData: (prev) => prev` in `useSearchBooks` makes
  pagination feel instant by displaying the previous page during
  the next fetch.
- The blob download pattern (create `<a>`, click, revoke) is ugly
  but is the only cross-browser way to trigger a file save.
- Always call `URL.revokeObjectURL()` immediately after use to
  prevent memory leaks.
- Skeleton screens (grey animated rectangles of the correct size)
  are better than spinners because they communicate layout.
