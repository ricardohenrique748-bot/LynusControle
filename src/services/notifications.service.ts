import { localStore } from '../lib/supabase.ts';
import { NotificationItem, AuditLogItem } from '../types/index.ts';

export const NotificationsService = {
  async getAll(): Promise<NotificationItem[]> {
    return localStore.getNotifications();
  },

  async markAsRead(id: string): Promise<void> {
    const list = localStore.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    localStore.setNotifications(updated);
  },

  async markAllAsRead(): Promise<void> {
    const list = localStore.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    localStore.setNotifications(updated);
  },
};

export const AuditService = {
  async getAll(): Promise<AuditLogItem[]> {
    return localStore.getAuditLogs();
  },
};
