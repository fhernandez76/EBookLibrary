import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Download, Lock, ArrowLeft, Calendar, FileText, Globe } from 'lucide-react';
import { useBookDetail, useDownloadBook } from '../hooks/useBooks';
import { useAuthStore } from '../stores/authStore';

const STATUS_STYLES: Record<string, string> = {
  Available: 'bg-green-100 text-green-700',
  Unavailable: 'bg-gray-100 text-gray-600',
  Removed: 'bg-red-100 text-red-600',
};

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { data: book, isLoading, isError } = useBookDetail(id!);
  const { mutate: download, isPending } = useDownloadBook();

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
        <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/search" className="hover:text-primary-500 transition-colors">Books</Link>
        <span>/</span>
        <span className="text-gray-700 truncate max-w-xs">{book.title}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="flex-none">
          <div className="w-40 h-56 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-xl" />
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
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[book.status] ?? STATUS_STYLES.Unavailable}`}>
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

          {/* Download */}
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

      {/* Authors */}
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

      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500 transition-colors mt-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
    </div>
  );
}
