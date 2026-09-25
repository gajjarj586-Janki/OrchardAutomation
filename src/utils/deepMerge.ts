export type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merges `override` on top of `base`. Arrays and primitives in
 * `override` replace the corresponding value in `base` entirely; only plain
 * objects are merged key by key.
 */
export function deepMerge<T extends PlainObject>(base: T, override: PlainObject): T {
  const result: PlainObject = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }

  return result as T;
}
