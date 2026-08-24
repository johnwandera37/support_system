// This extract field errors for zod error fields

// {
//   "error": {
//     "errors": [],
//     "properties": {
//       "email": {
//         "errors": [
//           "Invalid email address"
//         ]
//       },
//       "password": {
//         "errors": [
//           "Must contain at least one special character"
//         ]
//       }
//     }
//   }
// }

type ZodFieldErrorDetail = {
  errors?: string[];
};

type ZodErrorTreeResponse = {
  error?: {
    errors?: string[];
    properties?: Record<string, ZodFieldErrorDetail>;
  };
};

type ZodErrorTree = {
    errors?: string[];
    properties?: Record<string, ZodFieldErrorDetail>;
  };

export type FieldErrors = Record<string, string[]>;

/**
 * Extracts field-level errors from a zod-style error response if a tree is return as response.
 *
 * Input:
 * {
 *   error: { properties: { email: { errors: ["Invalid email address"] } } }
 * }
 *
 * Output:
 * { email: ["Invalid email address"] }
 */
export const extractFieldErrorsFromResponse = (errorObj: ZodErrorTreeResponse): FieldErrors => {
  const fieldErrors: FieldErrors = {};
  const properties = errorObj?.error?.properties ?? {};

  for (const [field, detail] of Object.entries(properties)) {
    if (Array.isArray(detail?.errors) && detail.errors.length > 0) {
      fieldErrors[field] = detail.errors;
    }
  }

  return fieldErrors;
};


/**
 * Extracts field-level errors from a zod-style error tree.
 *
 * Input:
  { properties: { email: { errors: ["Invalid email address"] } } }
 *
 * Output:
 * { email: ["Invalid email address"] }
 */

export const extractFieldErrorsFromTree = (errorObj: ZodErrorTree): FieldErrors => {
  const fieldErrors: FieldErrors = {};
  const properties = errorObj?.properties ?? {};

  for (const [field, detail] of Object.entries(properties)) {
    if (Array.isArray(detail?.errors) && detail.errors.length > 0) {
      fieldErrors[field] = detail.errors;
    }
  }

  return fieldErrors;
};


/**
 * Flattens field errors into a single array of messages.
 *
 * Output: ["Invalid email address", "Must contain at least one special character"]
 */
export const flattenFieldErrors = (fieldErrors: FieldErrors): string[] => {
  return Object.values(fieldErrors).flat();
};

/**
 * Convenience: goes straight from the raw error response to a flat array.
 */
export const extractFieldErrorMessagesFromTreeResponse = (errorObj: ZodErrorTreeResponse): string[] => {
  return flattenFieldErrors(extractFieldErrorsFromResponse(errorObj));
};

export const extractFieldErrorMessagesFromTree = (errorObj: ZodErrorTree): string[] => {
  return flattenFieldErrors(extractFieldErrorsFromTree(errorObj));
};

/**
 * Joins an array of field error messages into a single string,
 * suitable for log fields expecting a string (e.g. LogMeta.error).
 *
 * Input: ["Invalid email address", "Must contain at least one special character"]
 * Output: "Invalid email address; Must contain at least one special character"
 */
export const joinErrorMessages = (messages: string[], separator = "; "): string => {
  return messages.length > 0 ? messages.join(separator) : "Validation failed with no specific field errors";
};



// Usage
// 1. If the tree is return as a response
// const apiError = await response.json();

// // Field-keyed, for mapping to specific inputs:
// const fieldErrors = extractFieldErrorsFromResponse(apiError);
// // { email: ["Invalid email address"], password: ["Must contain at least one special character"] }

// // Flat list, for a toast/summary/generic list display:
// const messages = extractFieldErrorMessagesFromTreeResponse(apiError);
// // ["Invalid email address", "Must contain at least one special character"]

// 2. If it's just the tree
// const tree = treeifyError(error);

// // Field-keyed, for mapping to specific inputs:
// const fieldErrors = extractFieldErrorsFromTree(tree);
// // { email: ["Invalid email address"], password: ["Must contain at least one special character"] }

// // Flat list, for a toast/summary/generic list display:
// const messages = extractFieldErrorMessagesFromTree(tree);
// // ["Invalid email address", "Must contain at least one special character"]