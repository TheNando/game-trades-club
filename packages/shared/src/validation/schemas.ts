import { z } from 'zod';
import { CONDITION_VALUES } from '../constants/conditions';

/** Maximum number of characters accepted for a listing description. */
export const MAX_LISTING_DESCRIPTION_LENGTH = 5_000;

/** Maximum price, in cents, accepted for a listing. */
export const MAX_LISTING_PRICE_CENTS = 10_000_000;

/** Maximum number of characters accepted for a marketplace message. */
export const MAX_MESSAGE_LENGTH = 5_000;

/** Maximum number of characters accepted for an identifier. */
export const MAX_IDENTIFIER_LENGTH = 500;

/** Maximum number of characters accepted for a shop text field. */
export const MAX_SHOP_TEXT_LENGTH = 500;

const listingStatusValues = ['open', 'pending', 'complete'] as const;
const ratingTypeValues = ['average', 'adjusted'] as const;

const optionalTrimmedText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => value || null)
    .nullable()
    .optional();

const requiredTrimmedText = (fieldName: string, maxLength: number) =>
  z
    .string({ error: `${fieldName} is required` })
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength);

const optionalInteger = (fieldName: string, min: number, max: number, minimumMessage: string) =>
  z
    .union([z.number(), z.string()])
    .transform((value, context) => {
      const normalized = typeof value === 'string' ? value.trim() : value;
      if (normalized === '') return null;
      const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
      if (!Number.isInteger(parsed)) {
        context.addIssue({ code: 'custom', message: `${fieldName} must be an integer` });
        return z.NEVER;
      }
      return parsed;
    })
    .nullable()
    .optional()
    .refine((value) => value === undefined || value === null || value >= min, {
      message: minimumMessage,
    })
    .refine((value) => value === undefined || value === null || value <= max, {
      message: `${fieldName} must be at most ${max}`,
    });

const requiredInteger = (fieldName: string, min: number, max: number, minimumMessage: string) =>
  z
    .union([z.number(), z.string()], { error: `${fieldName} is required` })
    .transform((value, context) => {
      const normalized = typeof value === 'string' ? value.trim() : value;
      if (normalized === '') {
        context.addIssue({ code: 'custom', message: `${fieldName} is required` });
        return z.NEVER;
      }
      const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
      if (!Number.isInteger(parsed)) {
        context.addIssue({ code: 'custom', message: `${fieldName} must be an integer` });
        return z.NEVER;
      }
      return parsed;
    })
    .refine((value) => value >= min, { message: minimumMessage })
    .refine((value) => value <= max, { message: `${fieldName} must be at most ${max}` });

const optionalCoordinate = (fieldName: string, min: number, max: number) =>
  z
    .union([z.number(), z.string()])
    .transform((value, context) => {
      const normalized = typeof value === 'string' ? value.trim() : value;
      if (normalized === '') return null;
      const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
      if (!Number.isFinite(parsed)) {
        context.addIssue({ code: 'custom', message: `${fieldName} must be a number` });
        return z.NEVER;
      }
      return parsed;
    })
    .nullable()
    .optional()
    .refine((value) => value === undefined || value === null || value >= min, {
      message: `${fieldName} must be between ${min} and ${max}`,
    })
    .refine((value) => value === undefined || value === null || value <= max, {
      message: `${fieldName} must be between ${min} and ${max}`,
    });

/** Runtime schema for listing creation requests. */
export const createListingSchema = z.object({
  description: optionalTrimmedText(MAX_LISTING_DESCRIPTION_LENGTH).transform(
    (value) => value ?? null,
  ),
  game_id: requiredInteger('game_id', 1, Number.MAX_SAFE_INTEGER, 'game_id must be at least 1'),
  condition: z.enum(CONDITION_VALUES),
  price: requiredInteger('price', 0, MAX_LISTING_PRICE_CENTS, 'price must be zero or greater'),
  status: z.enum(listingStatusValues),
  preferred_shop_id: optionalTrimmedText(MAX_IDENTIFIER_LENGTH).transform((value) => value ?? null),
});

/** Runtime schema for listing updates. */
export const updateListingSchema = z
  .object({
    description: optionalTrimmedText(MAX_LISTING_DESCRIPTION_LENGTH),
    game_id: optionalInteger('game_id', 1, Number.MAX_SAFE_INTEGER, 'game_id must be at least 1'),
    condition: z.enum(CONDITION_VALUES).optional(),
    price: optionalInteger('price', 0, MAX_LISTING_PRICE_CENTS, 'price must be zero or greater'),
    status: z.enum(listingStatusValues).optional(),
    preferred_shop_id: optionalTrimmedText(MAX_IDENTIFIER_LENGTH),
  })
  .refine(
    (body) =>
      body.description !== undefined ||
      body.game_id !== undefined ||
      body.condition !== undefined ||
      body.price !== undefined ||
      body.status !== undefined ||
      body.preferred_shop_id !== undefined,
    { message: 'At least one listing field is required' },
  );

/** Runtime schema for shop create and replacement update requests. */
export const shopSchema = z
  .object({
    name: requiredTrimmedText('name', MAX_SHOP_TEXT_LENGTH),
    city: requiredTrimmedText('city', MAX_SHOP_TEXT_LENGTH),
    state: optionalTrimmedText(100).transform((value) => value ?? null),
    zip: optionalTrimmedText(20).transform((value) => value ?? null),
    address: optionalTrimmedText(MAX_SHOP_TEXT_LENGTH).transform((value) => value ?? null),
    website_url: optionalTrimmedText(2_000).transform((value) => value ?? null),
    latitude: optionalCoordinate('latitude', -90, 90),
    longitude: optionalCoordinate('longitude', -180, 180),
  })
  .transform((body, context) => {
    const latitude = body.latitude ?? null;
    const longitude = body.longitude ?? null;
    if ((latitude === null) !== (longitude === null)) {
      context.addIssue({
        code: 'custom',
        message: 'latitude and longitude must be provided together',
      });
      return z.NEVER;
    }
    return { ...body, latitude, longitude };
  });

/** Runtime schema for a new conversation request. */
export const createConversationSchema = z.object({
  recipient_id: requiredTrimmedText('recipient_id', MAX_IDENTIFIER_LENGTH),
  listing_id: optionalTrimmedText(MAX_IDENTIFIER_LENGTH),
  text: requiredTrimmedText('text', MAX_MESSAGE_LENGTH),
});

/** Runtime schema for an individual message request. */
export const createMessageSchema = z.object({
  text: requiredTrimmedText('text', MAX_MESSAGE_LENGTH),
});

/** Runtime schema for listing image upload metadata. */
export const listingImageUploadSchema = z.object({
  listing_id: requiredTrimmedText('listing_id', MAX_IDENTIFIER_LENGTH),
});

/** Runtime schema for catalog game search parameters. */
export const gameSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  limit: optionalInteger('limit', 1, 100, 'limit must be at least 1').default(25),
});

/** Runtime schema for existing-conversation lookup parameters. */
export const existingConversationQuerySchema = z.object({
  other_user_id: requiredTrimmedText('other_user_id', MAX_IDENTIFIER_LENGTH),
  listing_id: requiredTrimmedText('listing_id', MAX_IDENTIFIER_LENGTH),
});

/** Runtime schema for single-value listing query parameters. */
export const listingQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  user_id: z.string().trim().min(1).max(MAX_IDENTIFIER_LENGTH).optional(),
  status: z.enum(listingStatusValues).optional(),
  price_min: optionalInteger(
    'price_min',
    0,
    MAX_LISTING_PRICE_CENTS,
    'price_min must be at least 0',
  ),
  price_max: optionalInteger(
    'price_max',
    0,
    MAX_LISTING_PRICE_CENTS,
    'price_max must be at least 0',
  ),
  year_min: optionalInteger('year_min', 0, 10_000, 'year_min must be at least 0'),
  year_max: optionalInteger('year_max', 0, 10_000, 'year_max must be at least 0'),
  players: optionalInteger('players', 1, 100, 'players must be at least 1'),
  playtime: optionalInteger('playtime', 1, 10_000, 'playtime must be at least 1'),
  weight_min: z.coerce.number().finite().min(0).max(5).optional(),
  weight_max: z.coerce.number().finite().min(0).max(5).optional(),
  min_rating: z.coerce.number().finite().min(0).max(10).optional(),
  rating_type: z.enum(ratingTypeValues).optional(),
});

/** Type inferred from the listing creation schema. */
export type CreateListingRequest = z.infer<typeof createListingSchema>;

/** Type inferred from the listing update schema. */
export type UpdateListingRequest = z.infer<typeof updateListingSchema>;

/** Type inferred from the shop schema. */
export type ShopRequest = z.infer<typeof shopSchema>;

/** Type inferred from the new-conversation schema. */
export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

/** Type inferred from the message schema. */
export type CreateMessageRequest = z.infer<typeof createMessageSchema>;
