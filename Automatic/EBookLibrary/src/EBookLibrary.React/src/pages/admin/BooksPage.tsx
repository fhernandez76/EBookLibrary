import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchBooks } from '../../hooks/useBooks';
import Pagination from '../../components/Pagination';
import { CheckCircle, XCircle, Pencil, Trash2, Plus, Copy, Check, X } from 'lucide-react';
import type { BookSearchFilter, BookSummary } from '../../types/api';
import { adminBooksApi, type UpdateBookPayload } from '../../api/adminApi';

const STATUS_STYLES: Record<string, string> = {
  Available: 'bg-green-100 text-green-700',
  Unavailable: 'bg-gray-100 text-gray-600',
  Removed: 'bg-red-100 text-red-600',
};

interface BookForm {
  title: string; pages: number; publicationYear: string;
  isbn: string; description: string; language: string;
  authorIds: string; genreIds: string;
}

const emptyForm = (): BookForm => ({
  title: '', pages: 1, publicationYear: '', isbn: '',
  description: '', language: 'English', authorIds: '', genreIds: '',
});

export default function BooksPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<BookSearchFilter>({ pageNumber: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const { data, isFetching } = useSearchBooks(filter);

  const [modal, setModal] = useState<{ open: boolean; editBook: BookSummary | null }>({ open: false, editBook: null });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<BookSummary | null>(null);
  const [modalError, setModalError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal.editBook) {
        const payload: UpdateBookPayload = {
          title: form.title, pages: form.pages,
          publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
          isbn: form.isbn || undefined, description: form.description || undefined,
          language: form.language,
        };
        await adminBooksApi.update(modal.editBook.id, payload);
      } else {
        await adminBooksApi.create({
          title: form.title, pages: form.pages,
          publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
          isbn: form.isbn || undefined, description: form.description || undefined,
          language: form.language,
          authorIds: parseIds(form.authorIds),
          genreIds: parseIds(form.genreIds),
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); closeModal(); },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminBooksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setForm(emptyForm()); setModalError(''); setModal({ open: true, editBook: null }); };
  const openEdit = (b: BookSummary) => {
    setForm({ title: b.title, pages: b.pages, publicationYear: b.publicationYear?.toString() ?? '',
      isbn: '', description: '', language: 'English', authorIds: '', genreIds: '' });
    setModalError(''); setModal({ open: true, editBook: b });
  };
  const closeModal = () => setModal({ open: false, editBook: null });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">{t('admin.books')}</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('common.add')}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setFilter(p => ({ ...p, title: search || undefined, pageNumber: 1 }))}
          placeholder={t('search.filter_title')} className="input-field max-w-xs" />
        <button onClick={() => setFilter(p => ({ ...p, title: search || undefined, pageNumber: 1 }))} className="btn-primary">
          {t('home.search_btn')}
        </button>
      </div>

      {data && <p className="text-sm text-gray-500 mb-3">{t('search.results_count', { count: data.totalCount.toLocaleString() })}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Title','Author','Genre','Pages','Status','File',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching ? Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                </tr>
              )) : data?.items.map(book => (
                <tr key={book.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-xs"><p className="font-medium text-gray-900 truncate">{book.title}</p></td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{book.primaryAuthor}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{book.primaryGenre}</span></td>
                  <td className="px-4 py-3 text-gray-500">{book.pages}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[book.status] ?? STATUS_STYLES.Unavailable}`}>{book.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {book.hasFile ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => copyId(book.id)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" title="Copy Book ID">
                        {copiedId === book.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(book)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title={t('common.edit')}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(book)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination currentPage={filter.pageNumber ?? 1} totalPages={data.totalPages}
          onPageChange={p => setFilter(prev => ({ ...prev, pageNumber: p }))} />
      )}

      {/* Create / Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">{modal.editBook ? t('common.edit') : t('common.add')} — {t('admin.books')}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{modalError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pages *</label>
                  <input type="number" min={1} className="input-field" value={form.pages} onChange={e => setForm(f => ({ ...f, pages: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
                  <input className="input-field" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" className="input-field" value={form.publicationYear} onChange={e => setForm(f => ({ ...f, publicationYear: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                  <input className="input-field" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {!modal.editBook && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Author IDs (comma-separated)</label>
                    <input className="input-field font-mono text-xs" value={form.authorIds} onChange={e => setForm(f => ({ ...f, authorIds: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre IDs (comma-separated)</label>
                    <input className="input-field font-mono text-xs" value={form.genreIds} onChange={e => setForm(f => ({ ...f, genreIds: e.target.value }))} />
                  </div>
                </>)}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={closeModal} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
                {saveMutation.isPending ? '...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="font-serif font-bold text-lg text-red-600 mb-3">{t('common.delete')}</h2>
              <p className="text-gray-600 mb-1">{t('common.confirm_delete')}</p>
              <p className="font-semibold">{deleteTarget.title}</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseIds(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

