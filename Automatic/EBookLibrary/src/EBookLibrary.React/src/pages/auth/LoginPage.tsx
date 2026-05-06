import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';
import type { LoginRequest } from '../../types/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (auth) => {
      setAuth(auth);
      navigate('/');
    },
  });

  const onSubmit = (data: FormData) => login(data);

  const apiError = (error as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 text-center">
            {t('auth.login_title')}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={`input-field ${errors.password ? 'border-red-400' : ''}`}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* API error */}
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {apiError.message ?? apiError.errors?.join(', ') ?? t('common.error')}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full btn-primary disabled:opacity-50"
            >
              {isPending ? t('common.loading') : t('auth.login_btn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-primary-500 font-medium hover:underline">
              {t('auth.sign_up')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
