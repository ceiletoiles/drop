import type { ActivityAction, ItemType } from '../../../shared/types';

export interface ActivityItem {
  id: string;
  action: ActivityAction;
  title: string;
  createdAt: string;
  itemId?: string | null;
  itemType?: ItemType | null;
  entityKind?: 'note' | 'file' | 'image' | null;
  entityDetail?: string | null;
  sizeBytes?: number | null;
}
