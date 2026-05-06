import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDownloadBook } from '../hooks/useBooks';
import type { BookSummary } from '../types/api';

const GENRE_COLORS: Record<string, string> = {
  default: 'bg-blue-100 text-blue-700',
  Fiction: 'bg-purple-100 text-purple-700',
  History: 'bg-amber-100 text-amber-700',
  Science: 'bg-green-100 text-green-700',
  Romance: 'bg-pink-100 text-pink-700',
  Mystery: 'bg-gray-100 text-gray-700',
};

interface BookCardProps {
  book: BookSummary;
}

export default function BookCard({ book }: BookCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { mutate: download, isPending } = useDownloadBook();

  const genreColor = GENRE_COLORS[book.primaryGenre] ?? GENRE_COLORS.default;
  const isAvailable = book.status === 'Available';

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated && book.hasFile) {
      download(book.id);
    } else if (!isAuthenticated) {
      window.location.href = '/login';
    }
  };

  return (
    <Link to={`/books/${book.id}`} className="book-card flex flex-col overflow-hidden group">
      {/* Cover */}
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
        {/* Status dot */}
        <div className="absolute top-2 right-2">
          {isAvailable ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Genre badge */}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${genreColor}`}>
          {book.primaryGenre}
        </span>

        {/* Title */}
        <h3 className="font-serif text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-gray-500 truncate">{book.primaryAuthor}</p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{t('book.pages', { count: book.pages })}</span>

          {book.hasFile && isAvailable ? (
            <button
              onClick={handleDownload}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-medium text-accent-500 hover:text-accent-600 transition-colors disabled:opacity-50"
            >
              {isAuthenticated ? (
                <Download className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              {isAuthenticated ? t('book.download') : t('book.login_to_download')}
            </button>
          ) : (
            <span className="text-xs text-gray-400">{t('book.unavailable')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
