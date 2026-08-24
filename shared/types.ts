import type { EXPIRATION_TYPES } from './constants';

export type ItemType = 'text' | 'file';
export type ActivityAction = 'sign_in' | 'sign_out' | 'create' | 'upload' | 'edit' | 'delete';
export type ExpirationType = (typeof EXPIRATION_TYPES)[number];
export type SpaceExpirationType = '24_HOURS' | '7_DAYS' | '1_MONTH';

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
  spaceId?: string | null;
  uploadedByUserId?: string;
  uploadedByName?: string | null;
  file?: FileMetadata;
  text?: TextMetadata;
  share?: ShareSummary | null;
}

export interface ShareSummary {
  createdAt: string;
  downloadCount: number;
}

export interface SharedItemSummary {
  type: ItemType;
  title: string;
  expirationType: ExpirationType;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  spaceId?: string | null;
  uploadedByName?: string | null;
  file?: FileMetadata;
  text?: TextMetadata;
}

export interface SpaceSummary {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  itemCount: number;
  memberPreviews?: SpaceMemberPreview[];
  recentItems?: SpaceRecentItemPreview[];
}

export interface SpaceMemberPreview {
  userId: string;
  displayName: string;
  profilePicture?: string | null;
}

export interface SpaceRecentItemPreview {
  id: string;
  type: ItemType;
  updatedAt: string;
  filename?: string | null;
  mimeType?: string | null;
}

export interface SpaceMemberSummary {
  userId: string;
  displayName: string;
  profilePicture?: string | null;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface SpaceInvitationSummary {
  id: string;
  spaceId: string;
  invitedEmail: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  acceptedAt: string | null;
  token?: string;
  url?: string;
}

export interface SpaceInviteSpaceSummary {
  id: string;
  name: string;
  ownerName: string;
}

export interface SpaceInvitationInboxItem {
  space: SpaceInviteSpaceSummary;
  invitation: SpaceInvitationSummary;
}

export interface SpaceInvitationsResponse {
  invitations: SpaceInvitationInboxItem[];
}

export interface SpaceDetailResponse {
  space: SpaceSummary;
  members: SpaceMemberSummary[];
  items: ItemSummary[];
  invite?: SpaceInvitationSummary | null;
}

export interface SpacesResponse {
  spaces: SpaceSummary[];
}

export interface CreateSpaceResponse {
  space: SpaceSummary;
}

export interface CreateSpaceItemResponse {
  item: ItemSummary;
}

export interface JoinSpaceResponse {
  space: SpaceSummary;
  joined: boolean;
}

export interface ShareCreateResponse {
  item: ItemSummary;
  share: {
    token: string;
    url: string;
    createdAt: string;
    downloadCount: number;
  };
}

export interface ShareResponse {
  item: SharedItemSummary;
  share: {
    createdAt: string;
    downloadCount: number;
  };
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
