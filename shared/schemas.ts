import { z } from 'zod';
import {
  EXPIRATION_TYPES,
  MAX_SEARCH_CHARS,
  MAX_TEXT_CHARS,
  MAX_TITLE_CHARS,
  MAX_UPLOAD_BYTES,
  SPACE_EXPIRATION_TYPES
} from './constants';

export const itemIdSchema = z.string().uuid();
export const expirationTypeSchema = z.enum(EXPIRATION_TYPES);
export const spaceExpirationTypeSchema = z.enum(SPACE_EXPIRATION_TYPES);
export const spaceIdSchema = z.string().uuid();
export const spaceInviteTokenSchema = z.string().trim().min(16).max(128);

export const searchSchema = z
  .string()
  .trim()
  .max(MAX_SEARCH_CHARS)
  .optional()
  .transform((value) => value ?? '');

export const createTextItemSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_CHARS),
  content: z.string().max(MAX_TEXT_CHARS),
  expirationType: expirationTypeSchema
});

export const updateTextItemSchema = z
  .object({
    title: z.string().trim().min(1).max(MAX_TITLE_CHARS).optional(),
    content: z.string().max(MAX_TEXT_CHARS).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.'
  });

export const uploadMetaSchema = z.object({
  title: z.string().trim().max(MAX_TITLE_CHARS).optional(),
  note: z.string().trim().max(MAX_TEXT_CHARS).optional(),
  expirationType: expirationTypeSchema
});

export const uploadLimitsSchema = z.object({
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES)
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(MAX_TITLE_CHARS)
});

export const inviteSpaceSchema = z.object({
  email: z.string().trim().email().optional().or(z.literal(''))
});

export const joinSpaceSchema = z.object({
  token: spaceInviteTokenSchema
});

export type CreateTextItemPayload = z.infer<typeof createTextItemSchema>;
export type UpdateTextItemPayload = z.infer<typeof updateTextItemSchema>;
export type CreateSpacePayload = z.infer<typeof createSpaceSchema>;
