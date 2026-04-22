import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Alert, Purchase } from '@/data/models';
import { alertRepository, purchaseRepository } from '@/data/repositories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatDate } from '@/shared/utils/formatting';
import { daysBetween } from '@/application/warranty';
import {
  getPermission,
  requestPermission,
  type PermissionState,
} from '@/application/notifications';

/**
 * AlertsPage — renders warranty and return-window expiry reminders owned
 * by the current user.
 *
 * Alerts live on their own collection but belong to a Purchase via
 * `purchaseId`. We hydrate the current user's purchases in parallel and
 * keep only the alerts whose purchase belongs to them so we don't leak
 * across the demo's shared localStorage.
 *
 * Each alert can be marked as read; a top-level button asks for browser
 * notification permission so the mock push service can surface
 * foreground notifications when alerts fire.
 */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [purchasesById, setPurchasesById] = useState<Record<string, Purchase>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [permission, setPermission] = useState<PermissionState>(getPermission());

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      purchaseRepository.getByUserId(getCurrentUserId()),
      alertRepository.getAll(),
    ])
      .then(([userPurchases, allAlerts]) => {
        if (cancelled) return;
        const byId: Record<string, Purchase> = {};
        for (const purchase of userPurchases) byId[purchase.id] = purchase;
        setPurchasesById(byId);
        const owned = allAlerts
          .filter((alert) => byId[alert.purchaseId])
          .sort((a, b) => a.alertDate.getTime() - b.alertDate.getTime());
        setAlerts(owned);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load alerts.');
        setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // For "All" tab: the single earliest alert per (purchaseId, type) group.
  const nearestPerGroup = useMemo(() => {
    if (!alerts) return [];
    const groups = new Map<string, Alert>();
    for (const alert of alerts) {
      const key = `${alert.purchaseId}:${alert.type}`;
      const cur = groups.get(key);
      if (!cur || alert.alertDate.getTime() < cur.alertDate.getTime()) {
        groups.set(key, alert);
      }
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.alertDate.getTime() - b.alertDate.getTime()
    );
  }, [alerts]);

  // For "Unread" tab: the single earliest *unread* alert per (purchaseId, type) group.
  // Advancing past a read alert reveals the next one automatically.
  const nearestUnreadPerGroup = useMemo(() => {
    if (!alerts) return [];
    const groups = new Map<string, Alert>();
    for (const alert of alerts) {
      if (alert.isRead) continue;
      const key = `${alert.purchaseId}:${alert.type}`;
      const cur = groups.get(key);
      if (!cur || alert.alertDate.getTime() < cur.alertDate.getTime()) {
        groups.set(key, alert);
      }
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.alertDate.getTime() - b.alertDate.getTime()
    );
  }, [alerts]);

  const visible = useMemo(
    () => (alerts ? (filter === 'unread' ? nearestUnreadPerGroup : nearestPerGroup) : []),
    [alerts, filter, nearestPerGroup, nearestUnreadPerGroup]
  );

  const unreadCount = useMemo(
    () => nearestUnreadPerGroup.length,
    [nearestUnreadPerGroup]
  );

  async function handleMarkRead(alert: Alert) {
    try {
      const updated = await alertRepository.markAsRead(alert.id);
      if (!updated) return;
      setAlerts((prev) =>
        prev ? prev.map((a) => (a.id === alert.id ? updated : a)) : prev
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not update alert.');
    }
  }

  async function handleEnablePush() {
    const next = await requestPermission();
    setPermission(next);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
            Warranty alerts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            One active reminder per item — mark it read to reveal the next scheduled
            alert.
            {unreadCount > 0 ? ` ${unreadCount} unread.` : ''}
          </p>
        </div>
        <PushPermissionControl state={permission} onEnable={handleEnablePush} />
      </header>

      <div className="mb-4 inline-flex overflow-hidden rounded-md border border-slate-700 bg-surface text-sm">
        <FilterButton active={filter === 'unread'} onClick={() => setFilter('unread')}>
          Unread
        </FilterButton>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterButton>
      </div>

      {loadError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      {alerts === null ? (
        <AlertsSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ul className="space-y-3">
          {visible.map((alert) => {
            const purchase = purchasesById[alert.purchaseId];
            return (
              <li key={alert.id}>
                <AlertCard
                  alert={alert}
                  purchase={purchase}
                  onMarkRead={() => handleMarkRead(alert)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  purchase,
  onMarkRead,
}: {
  alert: Alert;
  purchase: Purchase | undefined;
  onMarkRead: () => void;
}) {
  const expiryDate = new Date(alert.alertDate);
  expiryDate.setDate(expiryDate.getDate() + alert.daysBeforeExpiry);

  const daysUntilExpiry = daysBetween(new Date(), expiryDate);

  const itemName = purchase?.productName?.trim() || purchase?.storeName || 'Unknown item';
  const title =
    alert.type === 'warranty' ? `${itemName} Warranty` : `${itemName} Return Window`;

  const palette = alert.isRead
    ? 'border-slate-700 bg-surface'
    : alert.type === 'warranty'
      ? 'border-amber-200 bg-amber-50'
      : 'border-sky-200 bg-sky-50';
  const chipPalette =
    alert.type === 'warranty'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-sky-100 text-sky-800';

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${palette}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${chipPalette}`}
            >
              {alert.type === 'warranty' ? 'Warranty' : 'Return'}
            </span>
            {alert.isRead ? (
              <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-slate-400">
                Read
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-base font-semibold text-slate-100">{title}</p>
          <p className="mt-0.5 text-sm text-slate-400">
            Expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}{' '}
            · {formatDate(expiryDate)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Scheduled for {formatDate(alert.alertDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {purchase ? (
            <Link
              to={`/purchases/${purchase.id}`}
              className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
            >
              View purchase
            </Link>
          ) : null}
          {!alert.isRead ? (
            <button
              type="button"
              onClick={onMarkRead}
              className="inline-flex justify-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PushPermissionControl({
  state,
  onEnable,
}: {
  state: PermissionState;
  onEnable: () => void;
}) {
  if (state === 'unsupported') {
    return (
      <span className="text-xs text-slate-500">
        Push notifications aren&apos;t supported in this browser.
      </span>
    );
  }
  if (state === 'granted') {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
        <span aria-hidden="true">●</span> Push notifications enabled
      </span>
    );
  }
  if (state === 'denied') {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
        Push notifications blocked — adjust in your browser settings.
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onEnable}
      className="inline-flex justify-center rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-hover"
    >
      Enable push notifications
    </button>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 font-medium transition ${
        active
          ? 'bg-brand text-white'
          : 'text-slate-300 hover:bg-surface-elevated'
      }`}
    >
      {children}
    </button>
  );
}

function AlertsSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={index}
          className="h-24 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated"
        />
      ))}
    </ul>
  );
}

function EmptyState({ filter }: { filter: 'all' | 'unread' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-100">
        {filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {filter === 'unread'
          ? 'Everything is acknowledged. Switch to All to see past alerts.'
          : 'Alerts appear here once you log a purchase with a warranty or return window.'}
      </p>
      <Link
        to="/purchases/new"
        className="mt-5 inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
      >
        Add a purchase
      </Link>
    </div>
  );
}
