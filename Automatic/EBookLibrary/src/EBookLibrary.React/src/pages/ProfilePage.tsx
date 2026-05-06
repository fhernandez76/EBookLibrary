import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">{t('nav.profile')}</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
              user?.role === 'Admin' ? 'bg-accent-500/10 text-accent-500' : 'bg-primary-50 text-primary-500'
            }`}>
              {user?.role}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-400">Account details and download history coming soon.</p>
      </div>
    </div>
  );
}
