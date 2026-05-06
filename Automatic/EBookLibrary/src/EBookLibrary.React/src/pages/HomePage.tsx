import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import BookCard from '../components/BookCard';
import { booksApi } from '../api/booksApi';
import { genresApi } from '../api/adminApi';

const GENRE_BG_COLORS = [
  'from-purple-500 to-purple-700',
  'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-teal-500 to-teal-700',
  'from-indigo-500 to-indigo-700',
  'from-orange-500 to-orange-700',
];

export default function HomePage() {
  const { t } = useTranslation();
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
      {/* Hero */}
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

      {/* Featured Genres */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('home.featured_genres')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {topGenres.map((genre, idx) => (
            <button
              key={genre.id}
              onClick={() => navigate(`/search?genreName=${encodeURIComponent(genre.name)}`)}
              className={`bg-gradient-to-br ${GENRE_BG_COLORS[idx % GENRE_BG_COLORS.length]} text-white rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}
            >
              <p className="font-serif font-semibold text-sm">{genre.name}</p>
              <p className="text-xs text-white/70 mt-1">{genre.bookCount.toLocaleString()} books</p>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('home.new_arrivals')}</h2>
        {featuredBooks ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featuredBooks.items.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        )}
      </section>

      {/* Stats bar */}
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
