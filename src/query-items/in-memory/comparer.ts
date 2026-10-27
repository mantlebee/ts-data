import { Any } from "@mantlebee/ts-core";

import type { Comparer, InMemoryQueryOptions } from "./types";

/**
 * Converts a value of an item, or of a filter, into the primitive the
 * in-memory delegates compare with `===`, `<` and `>`:
 * - `null` and `undefined` become `null` (an unset value);
 * - numbers, booleans and the other primitives stay as they are;
 * - strings are lower-cased, unless `caseSensitive` is `true`;
 * - a `Date` becomes its `getTime()`;
 * - any other object becomes its `valueOf()` when that returns a primitive
 *   (so the value objects of the consumer plug in without being a dependency
 *   of the package), converted with the same rules; otherwise it stays as it
 *   is and is compared by reference.
 * Override it per field with {@link InMemoryQueryOptions.toComparable}.
 * @param value Value to convert.
 * @param caseSensitive `true` to leave the strings as they are.
 * @returns the comparable value, `null` when unset.
 */
export function toComparableValue(
  value: unknown,
  caseSensitive = false,
): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string")
    return caseSensitive ? value : value.toLowerCase();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    const valueOf = (value as { valueOf?: unknown }).valueOf;
    if (typeof valueOf === "function") {
      const primitive: unknown = valueOf.call(value);
      if (primitive !== value && isPrimitive(primitive))
        return toComparableValue(primitive, caseSensitive);
    }
  }
  return value;
}

/**
 * Resolves the options into the {@link Comparer} the in-memory delegates
 * use: `options.toComparable` when given, otherwise
 * {@link toComparableValue} with `options.caseSensitive`.
 * @param options Comparison options; none for the defaults.
 * @returns the comparer.
 */
export function createComparer<TItem = Any>(
  options?: InMemoryQueryOptions<TItem>,
): Comparer<TItem> {
  if (options?.toComparable) return options.toComparable;
  const caseSensitive = options?.caseSensitive ?? false;
  return (value) => toComparableValue(value, caseSensitive);
}

//#region Internals
function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  );
}
//#endregion
