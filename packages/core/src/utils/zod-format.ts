/**
 * Format a ZodError into a multi-line, human-readable string for CLI output.
 */
import type { ZodError } from 'zod';

export function formatZodError(err: ZodError): string {
  return err.issues
    .map((iss) => {
      const path = iss.path.length > 0 ? iss.path.join('.') : '<root>';
      return `  • ${path}: ${iss.message}`;
    })
    .join('\n');
}
