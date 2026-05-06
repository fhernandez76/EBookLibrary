import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { genresApi } from '../api/adminApi';

interface SearchBarProps {
  onSearch?: (filters: { title?: string; authorName?: string; genreName?: string; publicationYear?: number }) => void;
  inline?: boolean;
}

export default function SearchBar({ onSearch, inline }: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState(searchParams.get('title') ?? '');
  const [author, setAuthor] = useState(searchParams.get('authorName') ?? '');
  const [genre, setGenre] = useState(searchParams.get('genreName') ?? '');
  const [year, setYear] = useState(searchParams.get('publicationYear') ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const hasFilters = !!(author || genre || year);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters = {
      title: title || undefined,
      authorName: author || undefined,
      genreName: genre || undefined,
      publicationYear: year ? Number(year) : undefined,
    };
    if (onSearch) {
      onSearch(filters);
    } else {
      const params = new URLSearchParams();
      if (filters.title) params.set('title', filters.title);
      if (filters.authorName) params.set('authorName', filters.authorName);
      if (filters.genreName) params.set('genreName', filters.genreName);
      if (filters.publicationYear) params.set('publicationYear', String(filters.publicationYear));
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleClear = () => {
    setTitle('');
    setAuthor('');
    setGenre('');
    setYear('');
    if (onSearch) onSearch({});
  };

  return (
    <form onSubmit={handleSubmit} className={inline ? '' : 'w-full'}>
      {/* Main search row */}
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
        </div>
        <button type="submit" className="btn-primary whitespace-nowrap">
          {t('home.search_btn')}
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2.5 rounded-lg border transition-colors ${
            showAdvanced ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              className="input-field"
              placeholder="e.g. García Márquez"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('search.filter_genre')}</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="input-field bg-white"
            >
              <option value="">— {t('search.filter_genre')} —</option>
              {genres?.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('search.filter_year')}</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              className="input-field"
              placeholder="YYYY"
              min="1800"
              max={new Date().getFullYear()}
            />
          </div>

          {hasFilters && (
            <div className="sm:col-span-3 flex justify-end">
              <button type="button" onClick={handleClear} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
                {t('search.clear_filters')}
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
