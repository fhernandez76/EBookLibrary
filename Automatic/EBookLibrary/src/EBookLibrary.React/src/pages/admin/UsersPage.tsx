import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/adminApi';
import type { User, UpdateUserRequest } from '../../types/api';
import Pagination from '../../components/Pagination';
import { CheckCircle, XCircle, Power, Pencil, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

type EditState = { open: false } | { open: true; user: User };
type DeleteState = { open: false } | { open: true; user: User };

export default function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const currentUserId = useAuthStore(s => s.user?.userId);
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [togglingStatus, setTogglingStatus] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<EditState>({ open: false });
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false });
  const [modalError, setModalError] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateUserRequest>({ email: '', firstName: '', lastName: '', newPassword: '' });

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => usersApi.getAll(page, 20),
    placeholderData: (prev) => prev,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) => usersApi.updateRole(id, newRole),
    onSettled: (_d, _e, vars) => {
      setToggling(prev => { const next = new Set(prev); next.delete(vars.id); return next; });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (id: string) => usersApi.updateStatus(id),
    onSettled: (_d, _e, id) => {
      setTogglingStatus(prev => { const next = new Set(prev); next.delete(id); return next; });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      setEditState({ open: false });
      setModalError('');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setModalError(msg ?? 'Failed to update user.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      setDeleteState({ open: false });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const handleToggleRole = (id: string, currentRole: string) => {
    setToggling(prev => new Set(prev).add(id));
    roleMutation.mutate({ id, newRole: currentRole === 'Admin' ? 'Regular' : 'Admin' });
  };

  const handleToggleStatus = (id: string) => {
    setTogglingStatus(prev => new Set(prev).add(id));
    statusMutation.mutate(id);
  };

  const openEdit = (user: User) => {
    setEditForm({ email: user.email, firstName: user.firstName ?? '', lastName: user.lastName ?? '', newPassword: '' });
    setModalError('');
    setEditState({ open: true, user });
  };

  const handleEditSave = () => {
    if (!editState.open) return;
    editMutation.mutate({ id: editState.user.id, data: { ...editForm, newPassword: editForm.newPassword || undefined } });
  };

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('admin.users')}</h1>

      {data && (
        <p className="text-sm text-gray-500 mb-3">
          {t('search.results_count', { count: data.totalCount.toLocaleString() })}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Email','Name','Role','Active','Created',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    </tr>
                  ))
                : data?.items.map(user => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === 'Admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Role toggle */}
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            disabled={toggling.has(user.id) || user.id === currentUserId}
                            title={user.id === currentUserId ? 'Cannot change your own role' : user.role === 'Admin' ? '→ Regular' : '→ Admin'}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {toggling.has(user.id) ? '...' : user.role === 'Admin' ? '→ Regular' : '→ Admin'}
                          </button>

                          {/* Toggle active/inactive */}
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            disabled={togglingStatus.has(user.id) || user.id === currentUserId}
                            title={user.id === currentUserId ? 'Cannot change your own status' : user.isActive ? 'Deactivate user' : 'Activate user'}
                            className={`p-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.isActive
                                ? 'border-green-300 text-green-600 hover:bg-green-50'
                                : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                            }`}>
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit user */}
                          <button
                            onClick={() => openEdit(user)}
                            title="Edit user"
                            className="p-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete user */}
                          <button
                            onClick={() => setDeleteState({ open: true, user })}
                            disabled={user.id === currentUserId}
                            title={user.id === currentUserId ? 'Cannot delete your own account' : 'Delete user'}
                            className="p-1 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      {/* ── Edit User Modal ──────────────────────────────────────────────── */}
      {editState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">Edit User</h2>
              <button onClick={() => { setEditState({ open: false }); setModalError(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{modalError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password <span className="text-gray-400">(leave blank to keep current)</span></label>
                <input
                  type="password"
                  value={editForm.newPassword ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => { setEditState({ open: false }); setModalError(''); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEditSave}
                disabled={editMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {editMutation.isPending ? '...' : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="font-serif font-bold text-lg text-red-600">Delete User</h2>
              </div>
              <p className="text-gray-600 text-sm mb-1">This action is <strong>permanent</strong> and cannot be undone. The following user will be deleted:</p>
              <p className="font-semibold text-gray-900 mt-2 break-all">{deleteState.user.email}</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setDeleteState({ open: false })}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteState.open && deleteMutation.mutate(deleteState.user.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleteMutation.isPending ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

