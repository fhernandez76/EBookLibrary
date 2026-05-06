import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function PublicLayout() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isAdmin, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUserMenuOpen(false);
    navigate('/');
  };

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
          scrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-primary-500 font-serif font-bold text-xl">
              <BookOpen className="w-7 h-7" />
              <span>EBook Library</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors">
                {t('nav.home')}
              </Link>
              <Link to="/search" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors flex items-center gap-1">
                <Search className="w-4 h-4" />
                {t('nav.search')}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium text-accent-500 hover:text-accent-600 transition-colors">
                  {t('nav.admin')}
                </Link>
              )}
            </nav>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language switcher */}
              <button
                onClick={toggleLang}
                className="text-xs font-semibold px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              >
                {i18n.language === 'en' ? 'ES' : 'EN'}
              </button>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.firstName || user?.email}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {t('nav.profile')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3 h-3" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700">{t('nav.home')}</Link>
            <Link to="/search" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700">{t('nav.search')}</Link>
            {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-accent-500">{t('nav.admin')}</Link>}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700">{t('nav.profile')}</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-sm font-medium text-red-600">{t('nav.logout')}</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-700">{t('nav.login')}</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-sm py-1.5 px-4">{t('nav.register')}</Link>
                </>
              )}
              <button onClick={toggleLang} className="ml-auto text-xs font-semibold px-2 py-1 rounded border border-gray-200 text-gray-600">
                {i18n.language === 'en' ? 'ES' : 'EN'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary-500 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-serif font-bold text-lg">
              <BookOpen className="w-6 h-6" />
              <span>EBook Library</span>
            </div>
            <p className="text-primary-50/80 text-sm">Your digital reading companion · 76,000+ eBooks</p>
            <div className="flex gap-4 text-sm text-primary-50/70">
              <Link to="/search" className="hover:text-white transition-colors">Browse Books</Link>
              <Link to="/register" className="hover:text-white transition-colors">Join Free</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
