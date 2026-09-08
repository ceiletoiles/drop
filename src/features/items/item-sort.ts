import type { Item } from './types';

export type ItemSortField = 'time' | 'size' | 'expiration';
export type ItemSortDirection = 'asc' | 'desc';

export interface ItemSortState {
  field: ItemSortField;
  direction: ItemSortDirection;
}

export const DEFAULT_ITEM_SORT: ItemSortState = { field: 'time', direction: 'desc' };

export const ITEM_SORT_GROUPS = [
  {
    field: 'time' as const,
    label: 'By time',
    options: [
      { direction: 'desc' as const, label: 'Recent' },
      { direction: 'asc' as const, label: 'Old' }
    ]
  },
  {
    field: 'size' as const,
    label: 'By size',
    options: [
      { direction: 'desc' as const, label: 'Big' },
      { direction: 'asc' as const, label: 'Small' }
    ]
  },
  {
    field: 'expiration' as const,
    label: 'By expiration',
    options: [
      { direction: 'asc' as const, label: 'Soon' },
      { direction: 'desc' as const, label: 'Late' }
    ]
  }
] as const;

export const getItemSizeBytes = (item: Item): number => {
  if (item.type === 'file' && item.file) return item.file.size;
  if (item.type === 'text' && item.text) return new TextEncoder().encode(item.text.content).length;
  return 0;
};

const getItemExpirationTimestamp = (item: Item): number => {
  if (item.expiresAt) return new Date(item.expiresAt).getTime();
  if (item.expirationType === 'CONSUME') return 0;
  return Number.POSITIVE_INFINITY;
};

export const compareItems = (left: Item, right: Item, sort: ItemSortState): number => {
  let delta = 0;

  switch (sort.field) {
    case 'time':
      delta = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      break;
    case 'size':
      delta = getItemSizeBytes(left) - getItemSizeBytes(right);
      break;
    case 'expiration':
      delta = getItemExpirationTimestamp(left) - getItemExpirationTimestamp(right);
      break;
  }

  return sort.direction === 'desc' ? -delta : delta;
};

export const sortItems = (items: Item[], sort: ItemSortState): Item[] =>
  [...items].sort((left, right) => compareItems(left, right, sort));

export const isSameItemSort = (left: ItemSortState, right: ItemSortState) =>
  left.field === right.field && left.direction === right.direction;
