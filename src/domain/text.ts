/**
 * Every string that reaches the book passes through here first: a project name
 * pasted with a trailing space and one typed by hand are the same name, and a
 * field that looks empty on screen must be empty in storage.
 */
export function cleanText(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * The cleaned text, or an error naming the field so the message can be shown as
 * it is. `limit` guards the store against a pasted document.
 */
export function requireText(value: string | null | undefined, field: string, limit = 120): string {
  const cleaned = cleanText(value);
  if (cleaned === '') throw new RangeError(`Fill in the ${field}.`);
  if (cleaned.length > limit) {
    throw new RangeError(`Keep the ${field} to ${limit} characters or fewer.`);
  }
  return cleaned;
}
