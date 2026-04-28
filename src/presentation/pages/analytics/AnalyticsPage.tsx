import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Purchase } from '@/data/models';
import { purchaseRepository } from '@/data/repositories';
import {
  computeAnalytics,
  computeTrendPoints,
  filterByDateRange,
  type TrendGranularity,
  type TrendPoint,
} from '@/application/analytics';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatCurrency } from '@/shared/utils/formatting';

// ─── Types ───────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = '__all__';
const ALL_STORES = '__all__';

type ViewType = 'day' | 'month' | 'year' | 'custom';

const VIEW_LABELS: Record<ViewType, string> = {
  day: 'Day',
  month: 'Month',
  year: 'Year',
  custom: 'Custom Range',
};

const PIE_COLORS = [
  '#a80000', '#ef4444', '#f59e0b', '#22c55e',
  '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6',
  '#eab308', '#64748b',
];

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1a1a1e',
  border: '1px solid #2f2f36',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
};

const PICKER_CLASS =
  'rounded-md border border-slate-700 bg-surface px-2 py-1.5 text-xs ' +
  'font-medium text-slate-200 focus:border-brand focus:outline-none ' +
  'focus:ring-2 focus:ring-brand/40';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dayBounds(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
}
function monthBounds(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0, 0),
    end: new Date(y, m, 0, 23, 59, 59, 999), // day-0 of next month = last day
  };
}
function yearBounds(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}
function customBounds(startISO: string, endISO: string) {
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
  return s <= e ? { start: s, end: e } : { start: e, end: s };
}

function granularityFor(viewType: ViewType, start: Date, end: Date): TrendGranularity {
  if (viewType === 'day') return 'hour';
  if (viewType === 'month') return 'day';
  if (viewType === 'year') return 'month';
  const diffDays = (end.getTime() - start.getTime()) / 86_400_000;
  return diffDays <= 90 ? 'day' : 'month';
}

const MAX_X_TICKS = 7;

function xInterval(granularity: TrendGranularity, count: number): number {
  if (granularity === 'hour') return 3; // 24 hrs → every 4th = 6 labels
  if (count <= MAX_X_TICKS) return 0;  // few enough → show all
  return Math.max(1, Math.round(count / MAX_X_TICKS) - 1);
}

function periodLabel(
  viewType: ViewType,
  selectedDay: string,
  selectedMonth: string,
  selectedYear: number,
  customStart: string,
  customEnd: string,
): string {
  if (viewType === 'day') {
    const [y, m, d] = selectedDay.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
  if (viewType === 'month') {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('en-GB', {
      month: 'long', year: 'numeric',
    });
  }
  if (viewType === 'year') return String(selectedYear);
  return `${customStart} → ${customEnd}`;
}

function chartSubtitle(granularity: TrendGranularity): string {
  if (granularity === 'hour') return 'Hourly breakdown';
  if (granularity === 'day') return 'Daily breakdown';
  return 'Monthly breakdown';
}

// ─── Pie label ────────────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function PiePercentLabel(props: Record<string, unknown>) {
  const percent = props.percent as number;
  const cx = props.cx as number;
  const cy = props.cy as number;
  const midAngle = props.midAngle as number;
  const outerRadius = props.outerRadius as number;
  const x = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fill="#94a3b8"
      fontSize={11}
      fontWeight={500}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Date filter state
  const [viewType, setViewType] = useState<ViewType>('month');
  const [selectedDay, setSelectedDay] = useState(todayISO);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customStart, setCustomStart] = useState(firstOfMonthISO);
  const [customEnd, setCustomEnd] = useState(todayISO);

  // Secondary dimension filters
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [selectedStore, setSelectedStore] = useState(ALL_STORES);

  useEffect(() => {
    let cancelled = false;
    void purchaseRepository
      .getByUserId(getCurrentUserId())
      .then((items) => { if (!cancelled) setPurchases(items); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load analytics.');
        setPurchases([]);
      });
    return () => { cancelled = true; };
  }, []);

  // Date bounds for the selected view
  const bounds = useMemo(() => {
    if (viewType === 'day') return dayBounds(selectedDay);
    if (viewType === 'month') return monthBounds(selectedMonth);
    if (viewType === 'year') return yearBounds(selectedYear);
    return customBounds(customStart, customEnd);
  }, [viewType, selectedDay, selectedMonth, selectedYear, customStart, customEnd]);

  const granularity = useMemo(
    () => granularityFor(viewType, bounds.start, bounds.end),
    [viewType, bounds],
  );

  // Purchases in the selected date window
  const filteredByDate = useMemo(
    () => (purchases ? filterByDateRange(purchases, bounds.start, bounds.end) : []),
    [purchases, bounds],
  );

  // Available dimension options (derived from the date-filtered set)
  const availableCategories = useMemo(
    () => [...new Set(filteredByDate.map((p) => p.categoryName))].sort(),
    [filteredByDate],
  );
  const availableStores = useMemo(
    () => [...new Set(filteredByDate.map((p) => p.storeName))].sort(),
    [filteredByDate],
  );

  // Apply category + store filters on top of the date filter
  const filteredPurchases = useMemo(() => {
    let result = filteredByDate;
    if (selectedCategory !== ALL_CATEGORIES)
      result = result.filter((p) => p.categoryName === selectedCategory);
    if (selectedStore !== ALL_STORES)
      result = result.filter((p) => p.storeName === selectedStore);
    return result;
  }, [filteredByDate, selectedCategory, selectedStore]);

  const hasSecondaryFilter =
    selectedCategory !== ALL_CATEGORIES || selectedStore !== ALL_STORES;

  // date-range total (always reflects the period, unaffected by category/store)
  const dateRangeTotal = useMemo(
    () => filteredByDate.reduce((s, p) => s + p.price, 0),
    [filteredByDate],
  );
  // filtered subset total (after category + store)
  const filteredTotal = useMemo(
    () => filteredPurchases.reduce((s, p) => s + p.price, 0),
    [filteredPurchases],
  );

  // All-time summary for warranty coverage only
  const allTimeSummary = useMemo(
    () => computeAnalytics(purchases ?? []),
    [purchases],
  );

  const categoryRows = useMemo(() => {
    const { spendingByCategory } = computeAnalytics(filteredPurchases);
    return Object.entries(spendingByCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPurchases]);

  const trendPoints = useMemo(
    () => computeTrendPoints(filteredPurchases, granularity, bounds.start, bounds.end),
    [filteredPurchases, granularity, bounds],
  );

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: cur - 2019 + 1 }, (_, i) => cur - i);
  }, []);

  const period = periodLabel(
    viewType, selectedDay, selectedMonth, selectedYear, customStart, customEnd,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Spending analytics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Totals, category breakdown, trend, and warranty coverage.
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      {purchases === null ? (
        <AnalyticsSkeleton />
      ) : allTimeSummary.purchaseCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Filter bar ── */}
          <section className="mb-6 space-y-3">
            {/* Date range row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex overflow-hidden rounded-md border border-slate-700 text-sm">
                {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewType(v)}
                    className={`px-3 py-1.5 font-medium transition ${
                      viewType === v
                        ? 'bg-brand text-white'
                        : 'text-slate-300 hover:bg-surface-elevated'
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>

              {viewType === 'day' && (
                <input
                  type="date"
                  value={selectedDay}
                  max={todayISO()}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className={PICKER_CLASS}
                />
              )}
              {viewType === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonthISO()}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={PICKER_CLASS}
                />
              )}
              {viewType === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className={PICKER_CLASS}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {viewType === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className={PICKER_CLASS}
                  />
                  <span className="text-sm text-slate-500">→</span>
                  <input
                    type="date"
                    value={customEnd}
                    max={todayISO()}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className={PICKER_CLASS}
                  />
                </div>
              )}
            </div>

            {/* Category + store dimension filters */}
            <div className="flex flex-wrap items-center gap-3">
              <FilterCombobox
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={availableCategories}
                allValue={ALL_CATEGORIES}
                placeholder="All categories"
              />
              <FilterCombobox
                value={selectedStore}
                onChange={setSelectedStore}
                options={availableStores}
                allValue={ALL_STORES}
                placeholder="All stores"
              />
              {hasSecondaryFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(ALL_CATEGORIES);
                    setSelectedStore(ALL_STORES);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  × Clear filters
                </button>
              ) : null}
            </div>
          </section>

          {/* ── Stats row ── */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total spending
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {formatCurrency(dateRangeTotal, 2)}
              </p>
              {hasSecondaryFilter ? (
                <p className="mt-1 text-sm font-medium text-brand-hover">
                  {formatCurrency(filteredTotal, 2)}{' '}
                  <span className="text-xs font-normal text-slate-400">filtered</span>
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                {hasSecondaryFilter
                  ? `${filteredPurchases.length} of ${filteredByDate.length} purchases · ${period}`
                  : `${filteredByDate.length} purchase${filteredByDate.length === 1 ? '' : 's'} · ${period}`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categories
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">
                {categoryRows.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {hasSecondaryFilter
                  ? 'In filtered selection'
                  : 'Distinct categories in this period'}
              </p>
            </div>
          </section>

          {/* ── Charts row ── */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pie chart */}
            <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Spending by category
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{period}</p>
              <CategoryPie rows={categoryRows} />
            </div>

            {/* Area chart */}
            <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Spending trend
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {chartSubtitle(granularity)} · {period}
              </p>
              <SpendingAreaChart
                points={trendPoints}
                granularity={granularity}
              />
            </div>
          </section>

          {/* ── Warranty coverage (all-time) ── */}
          <section className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">
              Warranty coverage
            </h2>
            <CoverageBar fraction={allTimeSummary.warrantyCoverage} />
            <p className="mt-2 text-xs text-slate-500">
              Purchases with a recorded warranty end date — all time.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CategoryRow { name: string; total: number; }

function CategoryPie({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-400">
        No purchases in this period.
      </p>
    );
  }
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={1}
            stroke="#1a1a1e"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={PiePercentLabel as any}
            labelLine={{ stroke: '#475569', strokeWidth: 1 }}
          >
            {rows.map((row, i) => (
              <Cell key={row.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              formatCurrency(Number(value), 2),
              String(name),
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SpendingAreaChart({
  points,
  granularity,
}: {
  points: TrendPoint[];
  granularity: TrendGranularity;
}) {
  const interval = xInterval(granularity, points.length);
  const rotate = granularity !== 'hour' && points.length > MAX_X_TICKS;

  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 10, right: 10, left: 0, bottom: rotate ? 40 : 0 }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a80000" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#a80000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2f2f36" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              ...(rotate && { textAnchor: 'end' }),
            }}
            axisLine={{ stroke: '#2f2f36' }}
            tickLine={{ stroke: '#2f2f36' }}
            interval={interval}
            angle={rotate ? -45 : 0}
            dy={rotate ? 4 : 0}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#2f2f36' }}
            tickLine={{ stroke: '#2f2f36' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [formatCurrency(Number(value), 2), 'Total']}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#a80000"
            strokeWidth={2}
            fill="url(#areaGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#a80000', stroke: '#1a1a1e', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CoverageBar({ fraction }: { fraction: number }) {
  const percent = Math.round(fraction * 100);
  const color =
    percent >= 66 ? 'bg-emerald-500' : percent >= 33 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-semibold text-slate-100">{percent}%</span>
        <span className="text-xs text-slate-500">of purchases covered</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label="Warranty coverage"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="mb-6 h-10 w-72 animate-pulse rounded-md border border-slate-700 bg-surface-elevated" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated" />
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-100">Nothing to analyse yet</h2>
      <p className="mt-1 text-sm text-slate-400">
        Log a purchase or two and your spending breakdown will appear here.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/purchases/new"
          className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          Add a purchase
        </Link>
        <Link
          to="/purchases/new/quick"
          className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
        >
          Quick add
        </Link>
      </div>
    </div>
  );
}

// ─── Searchable filter combobox ───────────────────────────────────────────────

interface FilterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allValue: string;
  placeholder: string;
}

function FilterCombobox({
  value,
  onChange,
  options,
  allValue,
  placeholder,
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFiltered = value !== allValue;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const visible = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  function handleFocus() {
    setOpen(true);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex min-w-[160px] items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/40 ${
          isFiltered
            ? 'border-brand/60 bg-brand/10 text-slate-100'
            : 'border-slate-700 bg-surface text-slate-200'
        }`}
      >
        <input
          ref={inputRef}
          value={open ? query : isFiltered ? value : ''}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none placeholder:text-slate-500"
        />
        {isFiltered ? (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(allValue);
              setQuery('');
              setOpen(false);
            }}
            className="shrink-0 text-slate-400 hover:text-slate-100"
            aria-label="Clear filter"
          >
            ×
          </button>
        ) : (
          <span className="shrink-0 text-slate-500" aria-hidden="true">▾</span>
        )}
      </div>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full min-w-[180px] overflow-auto rounded-md border border-slate-700 bg-surface-elevated shadow-lg"
        >
          <li role="option" aria-selected={!isFiltered}>
            <button
              type="button"
              onMouseDown={() => handleSelect(allValue)}
              className={`w-full px-3 py-2 text-left text-xs ${
                !isFiltered
                  ? 'font-semibold text-brand-hover'
                  : 'text-slate-400 hover:bg-brand/20'
              }`}
            >
              {placeholder}
            </button>
          </li>
          {visible.map((opt) => (
            <li key={opt} role="option" aria-selected={value === opt}>
              <button
                type="button"
                onMouseDown={() => handleSelect(opt)}
                className={`w-full px-3 py-2 text-left text-xs ${
                  value === opt
                    ? 'bg-brand/20 font-medium text-slate-100'
                    : 'text-slate-300 hover:bg-brand/20'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">No matches</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
