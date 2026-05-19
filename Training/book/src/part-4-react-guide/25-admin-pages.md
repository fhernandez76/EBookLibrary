# Chapter 25 — Admin Pages: Dashboard, CRUD, and File Upload

> *"Admin interfaces exist to serve the system's operators.
> Speed and clarity trump aesthetics. Get data in and out fast."*

---

## What you will learn

- The shared admin CRUD pattern: data table + modal form + delete
  confirmation. Defined once, applied to four entities.
- The `DashboardPage` stats grid.
- Full CRUD for Books (the most complex entity), Authors, and Genres.
- The Users management page: role toggle, activate/deactivate, and
  self-protection (you cannot modify your own account).
- How to add a **Copy ID** button per row using the Clipboard API
  with brief visual feedback — no UUID ever needs to be typed.
- The ePub file upload page with a **live book search** combo so the
  admin can find the target book by title without leaving the page.

**Expected result:** Creating a book in the admin panel and then
finding it in the public search page.

---

## 25.1 The admin CRUD pattern

Every admin CRUD page follows the same five-part structure. Learn it
once from the Authors page (the simplest example) and recognise it in
every subsequent page.

```
1. useQuery  — fetch the list, show loading skeleton
2. useMutation (save) — create or update depending on modal state
3. useMutation (delete) — delete the selected item
4. Data table — columns, loading skeletons, action buttons (Edit, Delete)
5. Modal — form fields with inline error, Save and Cancel buttons
   Delete confirmation — separate modal with name of item to be deleted
```

The two mutations call `queryClient.invalidateQueries()` in `onSuccess`
to refetch the list. The page never manually updates an array in
state — it always trusts TanStack Query to re-fetch the truth from the
server.

---

## 25.2 DashboardPage

**File:** `src/pages/admin/DashboardPage.tsx`

```tsx
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Tag, BookMarked } from 'lucide-react';
import { booksApi } from '../../api/booksApi';
import { usersApi } from '../../api/adminApi';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: booksData } = useQuery({
    queryKey: ['admin', 'books', 'count'],
    queryFn: () => booksApi.search({ pageSize: 1 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', 'count'],
    queryFn: () => usersApi.getAll(1, 1),
  });

  const stats = [
    {
      icon: BookMarked,
      label: t('admin.total_books'),
      value: booksData?.totalCount.toLocaleString() ?? '—',
      color: 'text-primary-500 bg-primary-50',
    },
    {
      icon: Users,
      label: t('admin.total_users'),
      value: usersData?.totalCount.toLocaleString() ?? '—',
      color: 'text-green-600 bg-green-50',
    },
    {
      icon: Tag,
      label: t('admin.genres'),
      value: '171',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: BookOpen,
      label: 'ePub Files',
      value: '—',
      color: 'text-accent-500 bg-accent-500/10',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        {t('admin.dashboard')}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

The stats widget fetches only the counts by requesting `pageSize: 1`
and reading `totalCount` from the paged result envelope. No extra
endpoint is needed.

---

## 25.3 AuthorsPage

Authors are the simplest entity — two fields, no relations.
Study this page fully before reading the Books page.

**File:** `src/pages/admin/AuthorsPage.tsx`

```tsx
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
  const qc    = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'authors', page],
    queryFn:  () => authorsApi.getAll(page, 20),
    placeholderData: (prev) => prev,
  });

  const [modal, setModal] = useState<{ open: boolean; editAuthor: Author | null }>({ open: false, editAuthor: null });
  const [form,  setForm]  = useState<AuthorForm>(empty());
  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);
  const [modalError,   setModalError]   = useState('');

  const saveMutation = useMutation({
    mutationFn: () => modal.editAuthor
      ? authorsApi.update(modal.editAuthor.id, { name: form.name, biography: form.biography || undefined })
      : authorsApi.create({ name: form.name, biography: form.biography || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'authors'] });
      setModal({ open: false, editAuthor: null });
    },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authorsApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['admin', 'authors'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => { setForm(empty()); setModalError(''); setModal({ open: true, editAuthor: null }); };
  const openEdit   = (a: Author) => {
    setForm({ name: a.name, biography: a.biography ?? '' });
    setModalError('');
    setModal({ open: true, editAuthor: a });
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">{t('admin.authors')}</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('common.add')}
        </button>
      </div>

      {data && <p className="text-sm text-gray-500 mb-3">{t('search.results_count', { count: data.totalCount.toLocaleString() })}</p>}

      {/* Data table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name', 'Books', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isFetching
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={3} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              : data?.items.map(author => (
                  <tr key={author.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{author.name}</td>
                    <td className="px-4 py-3 text-gray-500">{author.bookCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(author)} className="p-1 text-gray-400 hover:text-blue-600" title={t('common.edit')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(author)} className="p-1 text-gray-400 hover:text-red-600" title={t('common.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      {/* Create / Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">
                {modal.editAuthor ? t('common.edit') : t('common.add')} — {t('admin.authors')}
              </h2>
              <button onClick={() => setModal({ open: false, editAuthor: null })} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{modalError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
                <textarea rows={4} className="input-field" value={form.biography}
                  onChange={e => setForm(f => ({ ...f, biography: e.target.value }))} />
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

      {/* Delete confirmation Modal */}
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
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 25.4 GenresPage

Genres follow the identical pattern but target `genresApi` and fetch
a flat array (no pagination — there are only ~170 genres).

**File:** `src/pages/admin/GenresPage.tsx`

```tsx
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
  const qc    = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ['genres'],
    queryFn:  genresApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const [modal, setModal] = useState<{ open: boolean; editGenre: Genre | null }>({ open: false, editGenre: null });
  const [form,  setForm]  = useState<GenreForm>(empty());
  const [deleteTarget, setDeleteTarget] = useState<Genre | null>(null);
  const [modalError,   setModalError]   = useState('');

  const saveMutation = useMutation({
    mutationFn: () => modal.editGenre
      ? genresApi.update(modal.editGenre.id, { name: form.name, description: form.description || undefined })
      : genresApi.create({ name: form.name, description: form.description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['genres'] });
      setModal({ open: false, editGenre: null });
    },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => genresApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['genres'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => { setForm(empty()); setModalError(''); setModal({ open: true, editGenre: null }); };
  const openEdit   = (g: Genre) => {
    setForm({ name: g.name, description: g.description ?? '' });
    setModalError('');
    setModal({ open: true, editGenre: g });
  };

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
              {['Name', 'Books', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isFetching
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={3} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              : data?.map(genre => (
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
                ))
            }
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
```

---

## 25.5 BooksPage

Books are the most complex entity. The create form includes `authorIds`
and `genreIds` (comma-separated UUID lists). The edit form omits those
because author and genre associations are managed separately.

**File:** `src/pages/admin/BooksPage.tsx`

The full listing is long but follows the exact same structure as
`AuthorsPage`. The key differences are:

1. It uses `useSearchBooks(filter)` to list books (with a search
   input to filter by title).
2. The create payload includes `authorIds` and `genreIds` as comma-
   separated UUID strings that are parsed by a helper function.
3. The edit payload omits the IDs fields.
4. Each row includes a **Copy ID** button that copies the book UUID
   to the clipboard — useful when navigating to the Upload page.

### 25.5.1 Copy ID button

The Clipboard API is available in all modern browsers. The pattern
uses a short-lived state value to switch the icon from "copy" to a
green checkmark for 1.5 seconds, giving the admin clear feedback:

```tsx
import { Copy, Check, X } from 'lucide-react';

const [copiedId, setCopiedId] = useState<string | null>(null);

const copyId = (id: string) => {
  navigator.clipboard.writeText(id);
  setCopiedId(id);
  setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 1500);
};
```

In the row action cell:

```tsx
<button onClick={() => copyId(book.id)}
        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
        title="Copy Book ID">
  {copiedId === book.id
    ? <Check className="w-4 h-4 text-green-500" />
    : <Copy  className="w-4 h-4" />}
</button>
```

The `setTimeout` callback uses the functional form of `setCopiedId`
and re-checks the value before clearing it. This prevents a race
condition where a second click on a different book clears the wrong
highlight.

### 25.5.2 Modal encoding fix

The modal title uses a proper em-dash character (`—`) and a Lucide
`<X>` icon for the close button instead of raw Unicode escape
sequences, which can appear garbled depending on the file encoding
saved by the editor:

```tsx
<h2 className="font-serif font-bold text-lg">
  {modal.editBook ? t('common.edit') : t('common.add')} — {t('admin.books')}
</h2>
<button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
  <X className="w-5 h-5" />
</button>
```

### 25.5.3 Full imports

```tsx
import { CheckCircle, XCircle, Pencil, Trash2, Plus, Copy, Check, X } from 'lucide-react';
```

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchBooks } from '../../hooks/useBooks';
import Pagination from '../../components/Pagination';
import { CheckCircle, XCircle, Pencil, Trash2, Plus } from 'lucide-react';
import type { BookSearchFilter, BookSummary } from '../../types/api';
import { adminBooksApi, type UpdateBookPayload } from '../../api/adminApi';

const STATUS_STYLES: Record<string, string> = {
  Available:   'bg-green-100 text-green-700',
  Unavailable: 'bg-gray-100 text-gray-600',
  Removed:     'bg-red-100 text-red-600',
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

// Parse "id1, id2, id3" into ['id1', 'id2', 'id3']
const parseIds = (s: string): string[] =>
  s.split(',').map(x => x.trim()).filter(Boolean);

export default function BooksPage() {
  const { t }    = useTranslation();
  const qc       = useQueryClient();
  const [filter, setFilter] = useState<BookSearchFilter>({ pageNumber: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const { data, isFetching } = useSearchBooks(filter);

  const [modal, setModal]   = useState<{ open: boolean; editBook: BookSummary | null }>({ open: false, editBook: null });
  const [form,  setForm]    = useState<BookForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<BookSummary | null>(null);
  const [modalError,   setModalError]   = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal.editBook) {
        const payload: UpdateBookPayload = {
          title: form.title, pages: form.pages, language: form.language,
          publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
          isbn: form.isbn || undefined, description: form.description || undefined,
        };
        await adminBooksApi.update(modal.editBook.id, payload);
      } else {
        await adminBooksApi.create({
          title: form.title, pages: form.pages, language: form.language,
          publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
          isbn: form.isbn || undefined, description: form.description || undefined,
          authorIds: parseIds(form.authorIds),
          genreIds:  parseIds(form.genreIds),
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); closeModal(); },
    onError:   (e: Error) => setModalError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminBooksApi.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['books'] }); setDeleteTarget(null); },
  });

  const openCreate = () => { setForm(emptyForm()); setModalError(''); setModal({ open: true, editBook: null }); };
  const openEdit   = (b: BookSummary) => {
    setForm({ title: b.title, pages: b.pages, publicationYear: b.publicationYear?.toString() ?? '',
      isbn: '', description: '', language: 'English', authorIds: '', genreIds: '' });
    setModalError(''); setModal({ open: true, editBook: b });
  };
  const closeModal = () => setModal({ open: false, editBook: null });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">{t('admin.books')}</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" /> {t('common.add')}
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setFilter(p => ({ ...p, title: search || undefined, pageNumber: 1 }))}
          placeholder={t('search.filter_title')} className="input-field max-w-xs" />
        <button onClick={() => setFilter(p => ({ ...p, title: search || undefined, pageNumber: 1 }))} className="btn-primary">
          {t('home.search_btn')}
        </button>
      </div>

      {data && <p className="text-sm text-gray-500 mb-3">{t('search.results_count', { count: data.totalCount.toLocaleString() })}</p>}

      {/* Data table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Title', 'Author', 'Genre', 'Pages', 'Status', 'File', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    </tr>
                  ))
                : data?.items.map(book => (
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
                          <button onClick={() => openEdit(book)} className="p-1 text-gray-400 hover:text-blue-600" title={t('common.edit')}><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(book)} className="p-1 text-gray-400 hover:text-red-600" title={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination currentPage={filter.pageNumber ?? 1} totalPages={data.totalPages}
          onPageChange={p => setFilter(prev => ({ ...prev, pageNumber: p }))} />
      )}

      {/* Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif font-bold text-lg">{modal.editBook ? t('common.edit') : t('common.add')} — {t('admin.books')}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
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
                  <input type="number" min={1} className="input-field" value={form.pages}
                    onChange={e => setForm(f => ({ ...f, pages: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
                  <input className="input-field" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" className="input-field" value={form.publicationYear}
                    onChange={e => setForm(f => ({ ...f, publicationYear: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                  <input className="input-field" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} className="input-field" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {!modal.editBook && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Author IDs (comma-separated)</label>
                      <input className="input-field font-mono text-xs" value={form.authorIds}
                        onChange={e => setForm(f => ({ ...f, authorIds: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Genre IDs (comma-separated)</label>
                      <input className="input-field font-mono text-xs" value={form.genreIds}
                        onChange={e => setForm(f => ({ ...f, genreIds: e.target.value }))} />
                    </div>
                  </>
                )}
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

      {/* Delete confirmation Modal */}
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
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 25.6 UsersPage

The users page adds two actions not seen in the CRUD pages: toggle
role (Regular ↔ Admin) and toggle active status. Both use `PATCH`
endpoints. A safety guard prevents the logged-in admin from modifying
their own account.

**File:** `src/pages/admin/UsersPage.tsx`

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/adminApi';
import Pagination from '../../components/Pagination';
import { CheckCircle, XCircle, Power, Pencil } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import type { User } from '../../types/api';

export default function UsersPage() {
  const { t }  = useTranslation();
  const qc     = useQueryClient();
  const currentUserId = useAuthStore(s => s.user?.userId);
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn:  () => usersApi.getAll(page, 20),
    placeholderData: (prev) => prev,
  });

  // Track which rows have in-flight mutations to prevent double-clicks
  const [toggling,       setToggling]       = useState<Set<string>>(new Set());
  const [togglingStatus, setTogglingStatus] = useState<Set<string>>(new Set());

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) =>
      usersApi.updateRole(id, newRole),
    onSettled: (_d, _e, vars) => {
      setToggling(prev => { const s = new Set(prev); s.delete(vars.id); return s; });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (id: string) => usersApi.updateStatus(id),
    onSettled: (_d, _e, id) => {
      setTogglingStatus(prev => { const s = new Set(prev); s.delete(id); return s; });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const handleToggleRole = (user: User) => {
    setToggling(prev => new Set(prev).add(user.id));
    roleMutation.mutate({ id: user.id, newRole: user.role === 'Admin' ? 'Regular' : 'Admin' });
  };

  const handleToggleStatus = (id: string) => {
    setTogglingStatus(prev => new Set(prev).add(id));
    statusMutation.mutate(id);
  };

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('admin.users')}</h1>

      {data && <p className="text-sm text-gray-500 mb-3">{t('search.results_count', { count: data.totalCount.toLocaleString() })}</p>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Email', 'Name', 'Role', 'Active', 'Created', 'Actions'].map(h => (
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
                : data?.items.map(user => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-900">{user.email}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.role === 'Admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>{user.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          {user.isActive
                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                            : <XCircle    className="w-4 h-4 text-gray-300" />
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Toggle role */}
                            <button
                              onClick={() => handleToggleRole(user)}
                              disabled={isSelf || toggling.has(user.id)}
                              title={isSelf ? 'Cannot change your own role' : undefined}
                              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {toggling.has(user.id) ? '...' : user.role === 'Admin' ? '→ Regular' : '→ Admin'}
                            </button>
                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleStatus(user.id)}
                              disabled={isSelf || togglingStatus.has(user.id)}
                              title={isSelf ? 'Cannot change your own status' : user.isActive ? 'Deactivate' : 'Activate'}
                              className={`p-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                user.isActive
                                  ? 'border-green-300 text-green-600 hover:bg-green-50'
                                  : 'border-gray-300 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
```

The `Set<string>` pattern for `toggling` and `togglingStatus` tracks
which rows have an in-flight PATCH request. The `disabled` prop on
both buttons reads from this set and prevents double-clicks from
firing duplicate requests while the first is pending.

---

## 25.7 UploadPage

The upload page sends a binary ePub file to `POST /api/files/books/{id}/upload`
using `FormData` and `multipart/form-data`. Instead of requiring the
admin to type or paste a UUID, the page includes a **live book search
combo** — the admin types a title fragment, picks from the dropdown, and
the UUID is resolved internally.

**File:** `src/pages/admin/UploadPage.tsx`

### Design decisions

| Decision | Rationale |
|---|---|
| `useQuery` with `enabled: searchText.length >= 2` | Avoids firing a request on every keystroke until there is enough input to produce meaningful results. |
| `useRef` + `mousedown` listener | Closes the dropdown when the user clicks outside the combo box without requiring a library. |
| Chip display for selected book | Communicates the selection clearly and provides a one-click clear path. |
| Upload button disabled until both `selectedBook` and `file` are set | Prevents incomplete submissions. |

```tsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
import { booksApi } from '../../api/booksApi';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { BookSummary } from '../../types/api';

export default function UploadPage() {
  const { t } = useTranslation();
  const [searchText,   setSearchText]   = useState('');
  const [selectedBook, setSelectedBook] = useState<BookSummary | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [file,         setFile]         = useState<File | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['books', 'upload-search', searchText],
    queryFn:  () => booksApi.search({ title: searchText, pageSize: 10 }),
    enabled:  searchText.trim().length >= 2,
    staleTime: 30_000,
  });

  // Close the dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
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
    if (selected && selected.name.endsWith('.epub')) { setFile(selected); reset(); }
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

  const clearBook = () => { setSelectedBook(null); setSearchText(''); reset(); };

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">{t('admin.upload')}</h1>

      <div className="max-w-lg bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-4">

          {/* Book search / select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>

            {selectedBook ? (
              /* Selected chip */
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
              /* Search input + dropdown */
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={searchText}
                  onChange={handleSearchChange}
                  onFocus={() => searchText.trim().length >= 2 && setShowDropdown(true)}
                  placeholder="Type a title to search…"
                  className="input-field"
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Searching…
                  </span>
                )}
                {showDropdown && searchResults && searchResults.items.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
                    {searchResults.items.map(book => (
                      <button key={book.id} type="button" onClick={() => selectBook(book)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                        <p className="text-xs text-gray-500">{book.primaryAuthor}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searchText.trim().length >= 2 && !isSearching
                  && searchResults?.items.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg px-4 py-3 text-sm text-gray-500">
                    No books found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drop zone */}
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

          <button onClick={() => upload()} disabled={isPending || !selectedBook || !file}
            className="w-full btn-primary disabled:opacity-50">
            {isPending ? t('common.loading') : t('admin.upload')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### How the search combo works

1. The admin types at least 2 characters into the search input.
2. TanStack Query fires `GET /api/books/search?title=...&pageSize=10`.
   The query key includes `searchText`, so a new request is made for
   every distinct value.
3. Results render in an absolutely-positioned dropdown. Clicking a
   row calls `selectBook(book)`, stores the full `BookSummary`
   (including its UUID) in `selectedBook`, and hides the dropdown.
4. The selected book is displayed as a chip with title and author.
   An `×` button clears the selection.
5. The upload mutation reads `selectedBook.id` — the UUID is never
   visible or typed by the user.

---

## Chapter 25 checkpoint

1. Log in as the admin user and navigate to `/admin`.
2. Confirm the stats cards load with real counts.
3. Navigate to `/admin/authors` and create a new author.
4. Navigate to `/admin/books`, create a new book using the author's
   ID from the previous step.
5. Open a new browser tab and navigate to
   `http://localhost:5173/search?title=<your book title>`.
   Confirm the book appears in the public search results.
6. Return to `/admin/books`, click the **Copy ID** button on any
   row. Verify the icon briefly turns green, then check your clipboard
   contains the book's UUID.
7. Navigate to `/admin/upload`. Type the first few characters of a
   book title — confirm the dropdown appears. Select a book, choose an
   `.epub` file, and click **Upload**. Confirm the success message
   appears and `HasFile` for that book now shows the check icon.
8. Return to `/admin/books` and edit the book's title; verify the
   edit modal title reads cleanly (`Edit — Books`) with no garbled
   characters.

---

## Key takeaways

- The CRUD pattern (useQuery + useMutation + modal) is consistent
  across all entities. Learn it once, apply it four times.
- `queryClient.invalidateQueries()` in `onSuccess` is the correct
  way to refresh the list — never update an array in state manually.
- The `Set<string>` pattern for tracking in-flight mutations prevents
  double-submits without disabling the entire table.
- The `isSelf` guard in `UsersPage` protects the admin from
  accidentally stripping their own permissions.
- The Clipboard API (`navigator.clipboard.writeText`) combined with
  a short-lived state value gives clear, non-intrusive feedback.
- A `useQuery`-powered search combo eliminates the need to expose or
  copy UUIDs in the UI — IDs stay internal to the application.
- `FormData` with `Content-Type: multipart/form-data` is the
  standard browser mechanism for binary file upload.
