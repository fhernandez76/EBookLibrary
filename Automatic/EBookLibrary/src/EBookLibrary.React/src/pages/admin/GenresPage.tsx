import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { genresApi } from '../../api/adminApi';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { Genre } from '../../types/api';

interface GenreForm { name: string; description: string; }
const empty = (): GenreForm => ({ name: '', description: '' });

export default function GenresPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ['genres'],
    queryFn: genresApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const [modal, setModal] = useState<{ open: boolean; editGenre: Genre | null }>({ open: false, editGenre: null });
  const [form, setForm] = useState<GenreForm>(empty());
  const [deleteTarget, setDeleteTarget] = useState<Genre | null>(null);
  const [modalError, setModalError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () => modal.editGenre
      ? genresApi.update(modal.editGenre.id, { name: form.name, description: form.description || undefined })
      : genresApi.create({ name: form.name, description: form.description || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['genres'] }); setModal({ open: false, editGenre: null }); },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => genresApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['genres'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setForm(empty()); setModalError(''); setModal({ open: true, editGenre: null }); };
  const openEdit = (g: Genre) => { setForm({ name: g.name, description: g.description ?? '' }); setModalError(''); setModal({ open: true, editGenre: g }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">{t('admin.genres')}</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> {t('common.add')}</button>
      </div>

      {data && <p className="text-sm text-gray-500 mb-3">{data.length} genres</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name','Books',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isFetching ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50"><td colSpan={3} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
            )) : data?.map(genre => (
              <tr key={genre.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{genre.name}</td>
                <td className="px-4 py-3 text-gray-500">{genre.bookCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(genre)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteTarget(genre)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">{modal.editGenre ? t('common.edit') : t('common.add')} — {t('admin.genres')}</h2>
              <button onClick={() => setModal({ open: false, editGenre: null })} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{modalError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, editGenre: null })} className="btn-secondary">{t('common.cancel')}</button>
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
