import type { ExpirationType, ItemType } from '../../shared/types';

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export const getConsumeLabel = (itemType: ItemType) => (itemType === 'text' ? 'After copied' : 'After downloaded');

export const getConsumeDetail = (itemType: ItemType) => (itemType === 'text' ? 'Deletes after copy' : 'Deletes after download');

export const getExpirationOptionLabel = (expirationType: ExpirationType, itemType: ItemType) => {
  if (expirationType === 'CONSUME') return getConsumeLabel(itemType);
  if (expirationType === '24_HOURS') return 'After 24 hours';
  if (expirationType === '7_DAYS') return 'After 7 days';
  return 'After 1 month';
};

export const getExpirationSummary = (expirationType: ExpirationType, expiresAt: string | null, itemType: ItemType) => {
  if (expirationType === 'CONSUME') return itemType === 'text' ? 'after copy' : 'after download';
  if (!expiresAt) return '24 hours';

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  if (diff < hourMs) return `${Math.max(1, Math.round(diff / minuteMs))} min`;
  if (diff < dayMs) return `${Math.max(1, Math.round(diff / hourMs))} hours`;
  const days = Math.max(1, Math.round(diff / dayMs));
  if (days < 30) return `${days} days`;

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  return `${months} month${months === 1 ? '' : 's'}${remainingDays ? ` ${remainingDays} day${remainingDays === 1 ? '' : 's'}` : ''}`;
};
