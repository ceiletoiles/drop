export type ItemType = 'text' | 'file';

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
  createdAt: string;
  updatedAt: string;
  file?: FileMetadata;
  text?: TextMetadata;
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
