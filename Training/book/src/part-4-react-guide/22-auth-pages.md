# Chapter 22 — Authentication Pages: Login and Register

> *"A login form is the most-tested UI in the world. Every user
> hits it at least once. Make it impossible to break and trivial
> to use."*

---

## What you will learn

- How `react-hook-form` connects form inputs to validation without
  re-rendering on every keystroke.
- How a Zod schema becomes the single source of truth for both
  TypeScript types and runtime validation rules.
- The complete `LoginPage` and `RegisterPage` — including loading
  states, inline field errors, and the generic API error display.
- Why the error message "Invalid email or password" is intentionally
  vague — and how the frontend matches this security posture.

**Expected result:** Logging in with the seeded admin credentials
stores the JWT in `localStorage` and redirects to the home page. The
`auth-storage` key is visible in DevTools → Application → Local Storage.

---

## 22.1 The form pattern: react-hook-form + Zod

React has no built-in form library. The two main options are
controlled inputs (`useState` for every field) and `react-hook-form`.

**Controlled inputs** re-render the component on every keystroke.
For three fields that is fine. For a form with twenty fields it
becomes a performance problem.

**`react-hook-form`** registers inputs by reference (using the native
DOM's `ref` API) and reads values only on submit or when a specific
validation event fires. The component renders twice during a typical
interaction: once when it mounts, once when the form is submitted.

**Zod** provides the validation schema. The `zodResolver` bridge
connects the two: react-hook-form calls the Zod schema to validate
field values and surfaces the error messages it returns.

**Listing 22.1 — The complete form pattern.**

```typescript
const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;  // derives TS type from the schema

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

const onSubmit = (data: FormData) => {
  // called only when validation passes — data is fully typed
};

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email')} />
  {errors.email && <p>{errors.email.message}</p>}
  <button type="submit">Login</button>
</form>
```

`{...register('email')}` spreads `name`, `ref`, `onChange`, and
`onBlur` onto the input. React-hook-form uses the `ref` to read the
value; the `name` identifies the field in the validation schema.

---

## 22.2 Create LoginPage

**File:** `src/pages/auth/LoginPage.tsx`

```tsx
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
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate  = useNavigate();
  const setAuth   = useAuthStore(s => s.setAuth);

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

  // Extract a human-readable error from the Axios error shape
  const apiError = (error as { response?: { data?: { message?: string; errors?: string[] } } })
    ?.response?.data;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 text-center">
            {t('auth.login_title')}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className={`input-field ${errors.password ? 'border-red-400' : ''}`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* API-level error (wrong credentials, account locked, etc.) */}
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
```

### Why the generic error message?

The API returns "Invalid email or password" for both *wrong password*
and *account not found*. This is intentional — an attacker must not
learn whether an email address is registered. The frontend displays
the API's message verbatim. Never add logic here to say "account not
found" or "wrong password" — you would be leaking information the
backend deliberately withholds.

### Why `useMutation` instead of a regular `async` handler?

`useMutation` provides `isPending` (for the loading spinner),
`error` (for the error display), and `isSuccess` — all without any
`try/catch` or `useState` for loading state. The `onSuccess` callback
is the right place for post-success navigation because it is
guaranteed to run only after the API call succeeded.

---

## 22.3 Create RegisterPage

The register page adds four fields, a password confirmation cross-
field validation rule, and a password strength indicator component.

**File:** `src/pages/auth/RegisterPage.tsx`

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';
import type { RegisterRequest } from '../../types/api';

// ── Validation schema ─────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8,    'At least 8 characters')
    .regex(/[A-Z]/,         'Must contain an uppercase letter')
    .regex(/[a-z]/,         'Must contain a lowercase letter')
    .regex(/[0-9]/,         'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

// ── Password strength indicator ───────────────────────────────────────────
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
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{labels[score]}</p>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { t }     = useTranslation();
  const navigate  = useNavigate();
  const setAuth   = useAuthStore(s => s.setAuth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchPassword = watch('password', '');

  const { mutate: registerUser, isPending, error } = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (auth) => {
      setAuth(auth);
      navigate('/');
    },
  });

  const onSubmit = (data: FormData) => registerUser(data);

  const apiError = (error as { response?: { data?: { message?: string; errors?: string[] } } })
    ?.response?.data;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 text-center">
            {t('auth.register_title')}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* First / Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.first_name')}
                </label>
                <input type="text" {...register('firstName')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.last_name')}
                </label>
                <input type="text" {...register('lastName')} className="input-field" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className={`input-field ${errors.password ? 'border-red-400' : ''}`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
              <PasswordStrength password={watchPassword} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.confirm_password')}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className={`input-field ${errors.confirmPassword ? 'border-red-400' : ''}`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
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
```

### The `.refine()` cross-field validation

Zod's `.refine()` runs after all individual field validations pass. It
receives the entire form object and returns `true` if the rule passes.
When it returns `false`, Zod attaches the error to the `path` specified
— in this case `['confirmPassword']` — so react-hook-form displays the
error under the correct input.

### The `watch` hook

`watch('password', '')` subscribes to the password field's live value
and passes it to `PasswordStrength`. The strength indicator updates on
every keystroke for immediate feedback. This is one of the few places
in this project where a live subscription is appropriate — the
strength bar is a UX feature, not a submission gate.

---

## Chapter 22 checkpoint

1. Navigate to `http://localhost:5173/login`.
2. Submit the form without filling in any fields — both fields show
   inline error messages.
3. Submit with an invalid email address — only the email shows an
   error.
4. Log in with `admin@ebooklibrary.com` / `Admin@12345`.
5. Confirm you are redirected to `/` after successful login.
6. Open DevTools → Application → Local Storage.
   - `auth_token` should contain the JWT string.
   - `auth-storage` should contain a JSON object with
     `isAuthenticated: true` and `isAdmin: true`.
7. Hard-refresh the page (Ctrl+F5). Confirm you are still considered
   logged in — the header should show your user name, not the Login
   link.

---

## Key takeaways

- `react-hook-form` + `zodResolver` eliminates manual `useState` for
  each form field and removes `try/catch` validation boilerplate.
- `z.infer<typeof schema>` derives the TypeScript type from the Zod
  schema — single source of truth for both type and runtime
  validation.
- `.refine()` is the correct Zod technique for cross-field rules like
  "passwords must match".
- The login page intentionally displays a generic error for failed
  authentication — it mirrors the backend's deliberate vagueness to
  prevent account enumeration attacks.
