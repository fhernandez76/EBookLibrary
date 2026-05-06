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
    { icon: BookMarked, label: t('admin.total_books'), value: booksData?.totalCount.toLocaleString() ?? '—', color: 'text-primary-500 bg-primary-50' },
    { icon: Users, label: t('admin.total_users'), value: usersData?.totalCount.toLocaleString() ?? '—', color: 'text-green-600 bg-green-50' },
    { icon: Tag, label: t('admin.genres'), value: '171', color: 'text-amber-600 bg-amber-50' },
    { icon: BookOpen, label: 'ePub Files', value: '—', color: 'text-accent-500 bg-accent-500/10' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">{t('admin.dashboard')}</h1>
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
