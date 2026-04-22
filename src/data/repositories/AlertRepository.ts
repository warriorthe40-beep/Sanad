import type { Alert } from '@/data/models';
import type { AlertType } from '@/shared/types/common';
import type { Entity, Repository } from './Repository';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUserId } from '@/shared/utils/currentUser';

const TABLE = 'alerts';

interface AlertRow {
  id: string;
  purchase_id: string;
  user_id: string;
  type: AlertType;
  message: string;
  alert_date: string;
  days_before_expiry: number;
  is_read: boolean;
}

function toModel(row: AlertRow): Alert {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    type: row.type,
    message: row.message,
    alertDate: new Date(row.alert_date),
    daysBeforeExpiry: row.days_before_expiry,
    isRead: row.is_read,
  };
}

export class AlertRepository implements Repository<Entity & Alert> {
  async getAll(): Promise<Alert[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('alert_date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as AlertRow[]).map(toModel);
  }

  async getById(id: string): Promise<Alert | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as AlertRow) : null;
  }

  async getByPurchaseId(purchaseId: string): Promise<Alert[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('alert_date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as AlertRow[]).map(toModel);
  }

  async getUnread(): Promise<Alert[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('is_read', false)
      .order('alert_date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as AlertRow[]).map(toModel);
  }

  async create(input: Omit<Alert, 'id'>): Promise<Alert> {
    const id = crypto.randomUUID();
    const row: AlertRow = {
      id,
      purchase_id: input.purchaseId,
      user_id: getCurrentUserId(),
      type: input.type,
      message: input.message,
      alert_date: input.alertDate.toISOString(),
      days_before_expiry: input.daysBeforeExpiry,
      is_read: input.isRead,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as AlertRow);
  }

  async update(id: string, patch: Partial<Omit<Alert, 'id'>>): Promise<Alert | null> {
    const row: Partial<AlertRow> = {};
    if ('purchaseId' in patch) row.purchase_id = patch.purchaseId;
    if ('type' in patch) row.type = patch.type;
    if ('message' in patch) row.message = patch.message;
    if ('alertDate' in patch) row.alert_date = patch.alertDate?.toISOString();
    if ('daysBeforeExpiry' in patch) row.days_before_expiry = patch.daysBeforeExpiry;
    if ('isRead' in patch) row.is_read = patch.isRead;

    const { data, error } = await supabase
      .from(TABLE)
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data ? toModel(data as AlertRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async markAsRead(id: string): Promise<Alert | null> {
    return this.update(id, { isRead: true });
  }

  async deleteByPurchaseId(purchaseId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('purchase_id', purchaseId);
    if (error) throw new Error(error.message);
  }
}
