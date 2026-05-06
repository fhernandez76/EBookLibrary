import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, LayoutDashboard, BookMarked, Users, Tag, Upload,
  LogOut, Menu, X, UserCircle, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { key: 'dashboard', path: '/admin', icon: LayoutDashboard, label: 'admin.dashboard', exact: true },
  { key: 'books', path: '/admin/books', icon: BookMarked, label: 'admin.books' },
  { key: 'authors', path: '/admin/authors', icon: Users, label: 'admin.authors' },
  { key: 'genres', path: '/admin/genres', icon: Tag, label: 'admin.genres' },
  { key: 'users', path: '/admin/users', icon: Users, label: 'admin.users' },
  { key: 'upload', path: '/admin/upload', icon: Upload, label: 'admin.upload' },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-500 text-white flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-primary-600">
          <BookOpen className="w-7 h-7" />
          <span className="font-serif font-bold text-lg">EBook Library</span>
          <button className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-primary-50/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(item.label)}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-primary-600">
          <div className="flex items-center gap-3 mb-3">
            <UserCircle className="w-8 h-8 text-primary-200" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.firstName || 'Admin'}</p>
              <p className="text-xs text-primary-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-100 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-800">{t('nav.admin')}</h1>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <UserCircle className="w-4 h-4" />
            {user?.email}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
