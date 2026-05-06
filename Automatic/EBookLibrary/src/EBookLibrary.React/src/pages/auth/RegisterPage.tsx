import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterRequest } from '../../types/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{labels[score]}</p>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchPassword = watch('password', '');

  const { mutate: registerUser, isPending, error } = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (auth) => {
      setAuth(auth);
      navigate('/');
    },
  });

  const onSubmit = (data: FormData) => registerUser(data);

  const apiError = (error as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 text-center">
            {t('auth.register_title')}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.first_name')}</label>
                <input type="text" {...register('firstName')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.last_name')}</label>
                <input type="text" {...register('lastName')} className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input type="email" autoComplete="email" {...register('email')}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
              <input type="password" autoComplete="new-password" {...register('password')}
                className={`input-field ${errors.password ? 'border-red-400' : ''}`} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              <PasswordStrength password={watchPassword} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirm_password')}</label>
              <input type="password" autoComplete="new-password" {...register('confirmPassword')}
                className={`input-field ${errors.confirmPassword ? 'border-red-400' : ''}`} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {apiError.message ?? apiError.errors?.join(', ') ?? t('common.error')}
              </div>
            )}

            <button type="submit" disabled={isPending} className="w-full btn-primary disabled:opacity-50">
              {isPending ? t('common.loading') : t('auth.register_btn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('auth.has_account')}{' '}
            <Link to="/login" className="text-primary-500 font-medium hover:underline">
              {t('auth.sign_in')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
