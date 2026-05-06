import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authorsApi } from '../../api/adminApi';
import Pagination from '../../components/Pagination';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { Author } from '../../types/api';

interface AuthorForm { name: string; biography: string; }
const empty = (): AuthorForm => ({ name: '', biography: '' });

export default function AuthorsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'authors', page],
    queryFn: () => authorsApi.getAll(page, 20),
    placeholderData: (prev) => prev,
  });

  const [modal, setModal] = useState<{ open: boolean; editAuthor: Author | null }>({ open: false, editAuthor: null });
  const [form, setForm] = useState<AuthorForm>(empty());
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);
  const [modalError, setModalError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => modal.editAuthor
      ? authorsApi.update(modal.editAuthor.id, { name: form.name, biography: form.biography || undefined })
      : authorsApi.create({ name: form.name, biography: form.biography || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'authors'] }); setModal({ open: false, editAuthor: null }); },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authorsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'authors'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setForm(empty()); setModalError(''); setModal({ open: true, editAuthor: null }); };
  const openEdit = (a: Author) => { setForm({ name: a.name, biography: a.biography ?? '' }); setModalError(''); setModal({ open: true, editAuthor: a }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">{t('admin.authors')}</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> {t('common.add')}</button>
      </div>

      {data && <p className="text-sm text-gray-500 mb-3">{t('search.results_count', { count: data.totalCount.toLocaleString() })}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name','Books',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isFetching ? Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50"><td colSpan={3} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : data?.items.map(author => (
              <tr key={author.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{author.name}</td>
                <td className="px-4 py-3 text-gray-500">{author.bookCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(author)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteTarget(author)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">{modal.editAuthor ? t('common.edit') : t('common.add')} — {t('admin.authors')}</h2>
              <button onClick={() => setModal({ open: false, editAuthor: null })} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{modalError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
                <textarea rows={4} className="input-field" value={form.biography} onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, editAuthor: null })} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
                {saveMutation.isPending ? '...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="font-serif font-bold text-lg text-red-600 mb-3">{t('common.delete')}</h2>
              <p className="text-gray-600 mb-1">{t('common.confirm_delete')}</p>
              <p className="font-semibold">{deleteTarget.name}</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
