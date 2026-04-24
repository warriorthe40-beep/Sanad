import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

/**
 * ResetPasswordPage — destination for the Supabase password-reset email link.
 *
 * Supabase processes the recovery token in the URL automatically when the
 * page loads and establishes a temporary session. We then call
 * supabase.auth.updateUser() with the new password. On success the user is
 * signed in and redirected to their purchases dashboard.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
      setTimeout(() => navigate('/purchases', { replace: true }), 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update password. The link may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-slate-100">Password updated</h1>
        <p className="text-sm text-slate-400">Taking you to your purchases…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-100">Set a new password</h1>
      <p className="mb-6 text-sm text-slate-400">
        Enter a new password for your account.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          disabled={isSubmitting}
          required
          hint="At least 8 characters."
          autoFocus
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(null); }}
          disabled={isSubmitting}
          required
        />

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}{' '}
            {error.toLowerCase().includes('session') || error.toLowerCase().includes('expired') ? (
              <Link to="/login" className="font-semibold underline">
                Request a new link
              </Link>
            ) : null}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
        >
          {isSubmitting ? 'Updating…' : 'Set password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link to="/login" className="font-semibold text-brand-hover hover:underline">
          ← Back to sign in
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
  hint?: string;
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
  hint,
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
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
