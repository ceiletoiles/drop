import type { ItemSummary } from '../../../shared/types';

export type Item = ItemSummary;

export interface ItemsState {
  items: Item[];
  loading: boolean;
  error: string | null;
}
