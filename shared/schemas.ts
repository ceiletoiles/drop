import { z } from 'zod';
import { EXPIRATION_TYPES, MAX_SEARCH_CHARS, MAX_TEXT_CHARS, MAX_TITLE_CHARS, MAX_UPLOAD_BYTES } from './constants';

export const itemIdSchema = z.string().uuid();
export const expirationTypeSchema = z.enum(EXPIRATION_TYPES);

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

export type CreateTextItemPayload = z.infer<typeof createTextItemSchema>;
export type UpdateTextItemPayload = z.infer<typeof updateTextItemSchema>;
