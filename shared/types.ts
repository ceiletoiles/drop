import type { EXPIRATION_TYPES } from './constants';

export type ItemType = 'text' | 'file';
export type ActivityAction = 'sign_in' | 'sign_out' | 'create' | 'upload' | 'edit' | 'delete';
export type ExpirationType = (typeof EXPIRATION_TYPES)[number];

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

export interface TextMetadata {
  content: string;
}

export interface ItemSummary {
  id: string;
  type: ItemType;
  title: string;
  expirationType: ExpirationType;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  file?: FileMetadata;
  text?: TextMetadata;
}

export interface ActivitySummary {
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

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface UploadResponse {
  item: ItemSummary;
}

export interface ItemsResponse {
  items: ItemSummary[];
}

export interface ActivitiesResponse {
  activities: ActivitySummary[];
}

export interface CreateTextResponse {
  item: ItemSummary;
}

export interface UpdateTextResponse {
  item: ItemSummary;
}

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
  };
}
