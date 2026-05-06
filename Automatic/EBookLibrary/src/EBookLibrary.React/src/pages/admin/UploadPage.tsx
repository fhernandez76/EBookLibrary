import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const { t } = useTranslation();
  const [bookId, setBookId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { mutate: upload, isPending, isSuccess, isError, reset } = useMutation({
    mutationFn: async () => {
      if (!file || !bookId) throw new Error('Book ID and file required');
      const form = new FormData();
      form.append('file', file);
      await apiClient.post(`/files/books/${bookId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setBookId('');
      setFile(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith('.epub')) {
      setFile(selected);
      reset();
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('admin.upload')}</h1>

      <div className="max-w-lg bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book ID</label>
            <input
              type="text"
              value={bookId}
              onChange={e => setBookId(e.target.value)}
              placeholder="Enter book UUID"
              className="input-field"
            />
          </div>

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
              File uploaded successfully
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4" />
              Upload failed. Please check Book ID and try again.
            </div>
          )}

          <button
            onClick={() => upload()}
            disabled={isPending || !bookId || !file}
            className="w-full btn-primary disabled:opacity-50"
          >
            {isPending ? t('common.loading') : t('admin.upload')}
          </button>
        </div>
      </div>
    </div>
  );
}
