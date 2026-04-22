import { type ChangeEvent } from 'react';

/**
 * DurationOrEndDateField — shared control used by Add Purchase and Edit
 * Purchase for the warranty window and the return window.
 *
 * The user picks one of:
 *   - "By duration" → number + unit select ("1 year", "6 months", …)
 *   - "By end date" → calendar picker
 *
 * The component owns the toggle and both inputs; the parent drives it with
 * a single `DurationOrEndDateValue` and gets back `{mode, ...}` on every
 * change. Helpers exported alongside resolve the value into the canonical
 * `{duration?: string, endDate?: Date}` pair the Purchase model stores.
 */

export type DurationUnit = 'days' | 'weeks' | 'months' | 'years';

export type DurationOrEndDateValue =
  | { mode: 'none' }
  | { mode: 'duration'; amount: string; unit: DurationUnit }
  | { mode: 'date'; endDate: string };

const UNIT_SINGULAR: Record<DurationUnit, string> = {
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year',
};

/** Convert the control's value to a duration string like "1 year". */
export function toDurationString(value: DurationOrEndDateValue): string | undefined {
  if (value.mode !== 'duration') return undefined;
  const amount = Number.parseInt(value.amount, 10);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const unit = UNIT_SINGULAR[value.unit];
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}

/** Convert the control's value to an end Date. */
export function toEndDate(
  value: DurationOrEndDateValue,
  purchaseDate: Date,
  calculate: (start: Date, duration: string | undefined) => Date | null
): Date | undefined {
  if (value.mode === 'date') {
    const parsed = new Date(value.endDate);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (value.mode === 'duration') {
    const duration = toDurationString(value);
    return calculate(purchaseDate, duration) ?? undefined;
  }
  return undefined;
}

/**
 * Pre-fill the control from a stored purchase. Prefers `duration` when a
 * parseable string exists (so the user sees the same units they entered),
 * otherwise falls back to the stored `endDate`.
 */
export function fromPurchase(
  duration: string | undefined,
  endDate: Date | undefined,
  _defaultUnit: DurationUnit
): DurationOrEndDateValue {
  if (duration) {
    const match = duration.trim().match(/^(\d+)\s*(day|week|month|year)s?$/i);
    if (match) {
      const amount = match[1];
      const unit = (match[2].toLowerCase() + 's') as DurationUnit;
      return { mode: 'duration', amount, unit };
    }
  }
  if (endDate && !Number.isNaN(endDate.getTime())) {
    return { mode: 'date', endDate: toISODate(endDate) };
  }
  return { mode: 'none' };
}

interface Props {
  label: string;
  value: DurationOrEndDateValue;
  onChange: (next: DurationOrEndDateValue) => void;
  minDate: string;
  disabled?: boolean;
  error?: string;
  defaultUnit?: DurationUnit;
  idPrefix: string;
}

export default function DurationOrEndDateField({
  label,
  value,
  onChange,
  minDate,
  disabled,
  error,
  defaultUnit = 'years',
  idPrefix,
}: Props) {
  function handleModeChange(next: 'none' | 'duration' | 'date') {
    if (next === 'none') {
      onChange({ mode: 'none' });
      return;
    }
    if (next === 'duration') {
      if (value.mode === 'duration') return;
      onChange({ mode: 'duration', amount: '', unit: defaultUnit });
      return;
    }
    if (value.mode === 'date') return;
    onChange({ mode: 'date', endDate: '' });
  }

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    if (value.mode !== 'duration') return;
    onChange({ ...value, amount: event.target.value });
  }

  function handleUnitChange(event: ChangeEvent<HTMLSelectElement>) {
    if (value.mode !== 'duration') return;
    onChange({ ...value, unit: event.target.value as DurationUnit });
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    if (value.mode !== 'date') return;
    onChange({ ...value, endDate: event.target.value });
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <div className="mb-2 inline-flex overflow-hidden rounded-md border border-slate-700 bg-surface text-xs">
        <ModeTab
          active={value.mode === 'none'}
          onClick={() => handleModeChange('none')}
          disabled={disabled}
        >
          None
        </ModeTab>
        <ModeTab
          active={value.mode === 'duration'}
          onClick={() => handleModeChange('duration')}
          disabled={disabled}
        >
          By duration
        </ModeTab>
        <ModeTab
          active={value.mode === 'date'}
          onClick={() => handleModeChange('date')}
          disabled={disabled}
        >
          By end date
        </ModeTab>
      </div>

      {value.mode === 'duration' ? (
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <input
            id={`${idPrefix}-amount`}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={value.amount}
            onChange={handleAmountChange}
            disabled={disabled}
            placeholder="e.g. 1"
            className={inputClass(Boolean(error))}
          />
          <select
            id={`${idPrefix}-unit`}
            value={value.unit}
            onChange={handleUnitChange}
            disabled={disabled}
            className={inputClass(false)}
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      ) : null}

      {value.mode === 'date' ? (
        <input
          id={`${idPrefix}-date`}
          type="date"
          min={minDate || undefined}
          value={value.endDate}
          onChange={handleDateChange}
          disabled={disabled}
          className={inputClass(Boolean(error))}
        />
      ) : null}

      {value.mode === 'none' ? (
        <p className="text-xs text-slate-500">Not tracked for this purchase.</p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 font-medium transition ${
        active
          ? 'bg-brand text-white'
          : 'text-slate-300 hover:bg-surface-elevated'
      } disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted';
  return `${base} ${
    hasError
      ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/30'
      : 'border-slate-700 focus:border-brand focus:ring-brand/40'
  }`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
