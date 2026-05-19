# Chapter 24 — The Profile Page

> *"The profile page is the user's mirror. It should tell them
> exactly who they are in the system — and make it trivial to
> leave if they want to."*

---

## What you will learn

- How to read from the Zustand auth store to display the logged-in
  user's personal details.
- How to implement a complete logout flow that clears both the
  Zustand store and the raw `localStorage` keys.
- The complete `ProfilePage` component.

**Expected result:** After logging in, navigating to `/profile` shows
the user's name, email, and role. Clicking Log Out clears all session
data and redirects to the home page.

---

## 24.1 What the profile page needs

The profile page has three jobs:

1. **Display user information** — name, email, role — read from the
   Zustand auth store. No API call is needed because this data was
   included in the login response and is already in the store.

2. **Provide a log-out action** — calling `clearAuth()` from the
   store removes both the Zustand state and the `auth_token` key from
   `localStorage`. The user is returned to the home page.

3. **Convey role context** — the role badge tells an admin user they
   have elevated access. It matters because the same person might
   use the application in both capacities (reader and admin) in
   different sessions.

---

## 24.2 Create ProfilePage

**File:** `src/pages/ProfilePage.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, LogOut, Mail, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function ProfilePage() {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();        // removes auth_token + auth-storage from localStorage
    navigate('/');      // redirect to home
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || user?.email || 'User';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-serif font-bold text-gray-900 mb-8">
        {t('nav.profile')}
      </h1>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center flex-none">
            <User className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{displayName}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${
              user?.role === 'Admin'
                ? 'bg-accent-500/10 text-accent-500'
                : 'bg-primary-50 text-primary-500'
            }`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Detail rows */}
        <dl className="space-y-4 border-t border-gray-100 pt-6">

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-none" />
            <div>
              <dt className="text-xs font-medium text-gray-500">{t('auth.email')}</dt>
              <dd className="text-sm text-gray-900">{user?.email}</dd>
            </div>
          </div>

          {(user?.firstName || user?.lastName) && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-none" />
              <div>
                <dt className="text-xs font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{displayName}</dd>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-none" />
            <div>
              <dt className="text-xs font-medium text-gray-500">Role</dt>
              <dd className="text-sm text-gray-900">{user?.role}</dd>
            </div>
          </div>

        </dl>

        {/* Log out */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-red-600
                       hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 24.3 How the logout flow works end to end

When `handleLogout` runs:

1. `clearAuth()` is called on the Zustand store. It executes:
   ```typescript
   localStorage.removeItem('auth_token');
   set({ user: null, isAuthenticated: false, isAdmin: false });
   ```
   The `persist` middleware writes this cleared state back to
   `localStorage['auth-storage']` automatically.

2. `navigate('/')` moves the browser to the home page.

3. `PublicLayout` re-renders because `useAuthStore` returned new
   values. The header now shows "Login" and "Register" instead of
   the user's name.

4. On the next request the Axios interceptor finds no `auth_token`
   in `localStorage` and sends the request without an
   `Authorization` header — the user is fully unauthenticated.

This four-step chain ensures no stale auth state can persist.

---

## 24.4 Protect the route

The `/profile` route is wrapped in `RequireAuth` in `App.tsx`:

```tsx
<Route path="/profile" element={
  <RequireAuth><ProfilePage /></RequireAuth>
} />
```

If a user navigates to `/profile` without being logged in, `RequireAuth`
redirects them to `/login`. After logging in, React Router returns them
to the originally-requested URL if you implement the "redirect back"
pattern — an optional enhancement not covered here but added as an
exercise at the end of this chapter.

---

## Chapter 24 checkpoint

1. Log in with any valid account.
2. Click your name in the header → "My Profile".
3. Verify the profile card shows:
   - Your name (or email if no name was set)
   - Your email address
   - Your role (`Regular` or `Admin`)
4. Click "Log Out".
5. Confirm you are redirected to `/`.
6. Open DevTools → Application → Local Storage. Confirm:
   - `auth_token` is absent (or its value is empty).
   - `auth-storage` still exists but its state has
     `isAuthenticated: false` and `user: null`.
7. Navigate directly to `http://localhost:5173/profile`. Confirm you
   are redirected to `/login`.

---

## Exercises

**Easy.** Add a "Token expiry" field to the profile card that reads
`user.expiresAt` and formats it as a human-readable date/time. Warn
the user if the token expires within the next hour.

**Medium.** Implement "redirect back after login". When `RequireAuth`
redirects to `/login`, pass the original path in router state
(`<Navigate to="/login" state={{ from: location.pathname }} replace />`).
In `LoginPage`, read the `from` state after a successful login and
navigate to it instead of `/`.

---

## Key takeaways

- The profile page reads state from Zustand — no API call is needed
  because the login response already contains the user's data.
- `clearAuth()` removes both the Zustand state and the raw
  `localStorage` keys. The Axios interceptor, the store, and the
  UI all become unauthenticated simultaneously.
- `RequireAuth` redirects before the page renders — there is no
  flash of the protected content.
