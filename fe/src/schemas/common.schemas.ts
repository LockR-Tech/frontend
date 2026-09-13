import { z } from 'zod';

// ============================================
// Common/Pagination Schemas
// ============================================

export const PageableRequestSchema = z.object({
  page: z.number().int().min(0).optional().default(0),
  size: z.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
});

export type PageableRequestInput = z.infer<typeof PageableRequestSchema>;

// ============================================
// Common Response Schemas
// ============================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.nullable(),
    errors: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  });

export const PageableSchema = z.object({
  pageNumber: z.number().int(),
  pageSize: z.number().int(),
  sort: z.object({
    empty: z.boolean(),
    sorted: z.boolean(),
    unsorted: z.boolean(),
  }),
  offset: z.number().int(),
  paged: z.boolean(),
  unpaged: z.boolean(),
});

export const PageSchema = <T extends z.ZodTypeAny>(contentSchema: T) =>
  z.object({
    content: z.array(contentSchema),
    pageable: PageableSchema,
    totalPages: z.number().int(),
    totalElements: z.number().int(),
    last: z.boolean(),
    size: z.number().int(),
    number: z.number().int(),
    sort: z.object({
      empty: z.boolean(),
      sorted: z.boolean(),
      unsorted: z.boolean(),
    }),
    numberOfElements: z.number().int(),
    first: z.boolean(),
    empty: z.boolean(),
  });
