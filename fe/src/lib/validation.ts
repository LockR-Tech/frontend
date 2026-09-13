import type { ZodSchema, ZodError } from 'zod';
import type { ValidationResult, ValidationError } from '@/types';

// ============================================
// Validation Utilities for Zod Schemas
// ============================================

/**
 * Validates data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success status, data (if valid), or errors
 */
export function validateWithZod<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Validates data partially (for PATCH requests)
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with success status, data (if valid), or errors
 */
export function validatePartialWithZod<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<Partial<T>> {
  // Zod v4: Use safeParse with partial data
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data as Partial<T>,
    };
  }
  
  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Formats ZodError into a more readable format
 * @param error - ZodError instance
 * @returns Array of ValidationError objects
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
  // Zod v4: use 'issues' instead of 'errors'
  const issues = (error as any).issues || [];
  return issues.map((err: any) => ({
    field: err.path?.join('.') || 'unknown',
    message: err.message,
  }));
}

/**
 * Validates form data and returns the first error message for each field
 * @param schema - Zod schema to validate against
 * @param data - Form data to validate
 * @returns Object with field names as keys and error messages as values
 */
export function getFieldErrors<T>(
  schema: ZodSchema<T>,
  data: unknown
): Record<string, string> | null {
  const result = validateWithZod(schema, data);

  if (result.success) {
    return null;
  }

  const fieldErrors: Record<string, string> = {};
  result.errors?.forEach((error) => {
    if (!fieldErrors[error.field]) {
      fieldErrors[error.field] = error.message;
    }
  });

  return fieldErrors;
}

/**
 * Type guard to check if validation was successful
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is { success: true; data: T } {
  return result.success === true && result.data !== undefined;
}

/**
 * Type guard to check if validation failed
 */
export function isValidationError<T>(
  result: ValidationResult<T>
): result is { success: false; errors: ValidationError[] } {
  return result.success === false && result.errors !== undefined;
}

/**
 * Validates request body for RTK Query mutations
 * Throws an error if validation fails (for use in prepare functions)
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated data
 * @throws Error if validation fails
 */
export function validateRequestBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    const errorMessage = errors.map((e) => `${e.field}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errorMessage}`);
  }

  return result.data;
}

/**
 * Creates a validator function for a specific schema
 * @param schema - Zod schema
 * @returns Validator function
 */
export function createValidator<T>(schema: ZodSchema<T>) {
  return {
    validate: (data: unknown) => validateWithZod(schema, data),
    validatePartial: (data: unknown) => validatePartialWithZod(schema, data),
    getFieldErrors: (data: unknown) => getFieldErrors(schema, data),
    validateRequestBody: (data: unknown) => validateRequestBody(schema, data),
  };
}
