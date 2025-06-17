// function extractFieldErrors(errorObj: any) {
//   const fieldErrors: Record<string, string[]> = {};
//   const properties = errorObj?.error?.properties || {};

//   for (const [field, detail] of Object.entries(properties)) {
//     if (Array.isArray(detail.errors)) {
//       fieldErrors[field] = detail.errors;
//     }
//   }

//   return fieldErrors;
// }

// // Usage:
// const apiError = await response.json();
// const errors = extractFieldErrors(apiError);
// // Now you have errors.email, errors.password, etc.
