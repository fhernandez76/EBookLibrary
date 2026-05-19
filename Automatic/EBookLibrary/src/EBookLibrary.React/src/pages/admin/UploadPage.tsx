import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
import { booksApi } from '../../api/booksApi';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { BookSummary } from '../../types/api';

export default function UploadPage() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['books', 'upload-search', searchText],
    queryFn: () => booksApi.search({ title: searchText, pageSize: 10 }),
    enabled: searchText.trim().length >= 2,
    staleTime: 30_000,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { mutate: upload, isPending, isSuccess, isError, reset } = useMutation({
    mutationFn: async () => {
      if (!file || !selectedBook) throw new Error('Book and file required');
      const form = new FormData();
      form.append('file', file);
      await apiClient.post(`/files/books/${selectedBook.id}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setSelectedBook(null);
      setSearchText('');
      setFile(null);
      setShowDropdown(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith('.epub')) {
      setFile(selected);
      reset();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setSelectedBook(null);
    setShowDropdown(true);
    reset();
  };

  const selectBook = (book: BookSummary) => {
    setSelectedBook(book);
    setSearchText('');
    setShowDropdown(false);
  };

  const clearBook = () => {
    setSelectedBook(null);
    setSearchText('');
    reset();
  };

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('admin.upload')}</h1>

      <div className="max-w-lg bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-4">

          {/* Book search / select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>

            {selectedBook ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedBook.title}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedBook.primaryAuthor}</p>
                </div>
                <button onClick={clearBook} className="ml-2 shrink-0 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={searchText}
                  onChange={handleSearchChange}
                  onFocus={() => searchText.trim().length >= 2 && setShowDropdown(true)}
                  placeholder="Type a title to search..."
                  className="input-field"
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching…</span>
                )}
                {showDropdown && searchResults && searchResults.items.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
                    {searchResults.items.map(book => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => selectBook(book)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                        <p className="text-xs text-gray-500">{book.primaryAuthor}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchText.trim().length >= 2 && !isSearching && searchResults?.items.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg px-4 py-3 text-sm text-gray-500">
                    No books found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ePub File</label>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">
                {file ? file.name : 'Click to select .epub file'}
              </span>
              <input type="file" accept=".epub" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          {isSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 text-sm">
              <CheckCircle className="w-4 h-4" />
              File uploaded successfully.
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4" />
              Upload failed. Please check your selection and try again.
            </div>
          )}

          <button
            onClick={() => upload()}
            disabled={isPending || !selectedBook || !file}
            className="w-full btn-primary disabled:opacity-50"
          >
            {isPending ? t('common.loading') : t('admin.upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

