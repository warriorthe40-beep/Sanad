import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/AuthContext';
import { AuthError, resetPasswordForEmail } from '@/auth/services';

interface FormState {
  email: string;
  password: string;
}

const INITIAL: FormState = { email: '', password: '' };

/**
 * LoginPage — email + password sign-in. On success the AuthContext is
 * updated and we navigate the user to the landing route for their role:
 * admins go to `/admin`, regular users to `/purchases`. A `from` hint in
 * location state takes priority when present.
 *
 * "Forgot password?" toggles an inline reset-request view that calls
 * Supabase's resetPasswordForEmail and sends the user a link to /reset-password.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function enterForgotMode() {
    setResetEmail(form.email);
    setResetSent(false);
    setResetError(null);
    setMode('forgot');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const user = await login(form);
      const fromState = (location.state as { from?: string } | null)?.from;
      const destination =
        fromState ?? (user.role === 'admin' ? '/admin' : '/purchases');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not sign in.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetSubmitting) return;
    setResetSubmitting(true);
    setResetError(null);
    try {
      await resetPasswordForEmail(resetEmail);
      setResetSent(true);
    } catch (err) {
      setResetError(
        err instanceof AuthError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not send reset link.'
      );
    } finally {
      setResetSubmitting(false);
    }
  }

  if (mode === 'forgot') {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-slate-100">Reset your password</h1>
        <p className="mb-6 text-sm text-slate-400">
          Enter your email and we'll send you a link to set a new password.
        </p>

        {resetSent ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-0.5">
              We sent a reset link to <span className="font-medium">{resetEmail}</span>.
              It may take a minute to arrive.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} noValidate className="space-y-4">
            <Field
              label="Email"
              name="resetEmail"
              type="email"
              autoComplete="email"
              value={resetEmail}
              onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
              disabled={resetSubmitting}
              required
              autoFocus
            />

            {resetError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {resetError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={resetSubmitting}
              className="inline-flex w-full justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
            >
              {resetSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => setMode('login')}
            className="font-semibold text-brand-hover hover:underline"
          >
            ← Back to sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-100">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-400">
        Sign in to keep track of your purchases and warranties.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          disabled={isSubmitting}
          required
          autoFocus
        />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">
              Password <span className="text-rose-600">*</span>
            </label>
            <button
              type="button"
              onClick={enterForgotMode}
              className="text-xs text-slate-400 hover:text-brand-hover hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            disabled={isSubmitting}
            required
            className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-surface-elevated"
          />
        </div>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-hover hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  disabled,
  required,
  autoComplete,
  autoFocus,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-200">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-surface-elevated"
      />
    </div>
  );
}
