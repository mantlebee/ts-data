import { Any, List } from "@mantlebee/ts-core";

import type { Projection } from "../types";

/**
 * Keeps only the projected fields of the items of a list, as a `SELECT` of
 * some columns would: every item becomes a new object holding the projected
 * fields it has (a field the item lacks is not added), a field projected
 * twice is kept once, a `null` or `undefined` item stays as it is. Without
 * projections, or with an empty list, the items are returned whole.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to project.
 * @param projections Fields to keep; none, or an empty list, for every field.
 * @returns the projected items, typed as whole items because the readers
 * return them as such; a copy of the list without projections.
 * @example
 * ```ts
 * const names = projectItems(users, [{ field: "id" }, { field: "lastName" }]);
 * // [{ id: 1, lastName: "Doe" }, ...]
 * ```
 */
export function projectItems<TItem = Any>(
  items: List<TItem>,
  projections?: List<Projection<TItem>>,
): List<TItem> {
  if (!projections || projections.length === 0) return items.slice();
  const fields = Array.from(new Set(projections.map((a) => a.field)));
  return items.map((item) => {
    if (item === null || item === undefined) return item;
    const projected: Partial<TItem> = {};
    for (const field of fields)
      if (field in (item as object)) projected[field] = item[field];
    return projected as TItem;
  });
}

/**
 * Drops the duplicated items of a list, as a `SELECT DISTINCT` would: the
 * first occurrence of every item is kept, in its order, the next ones are
 * dropped. Two items are duplicates when they hold the same fields with the
 * same values, whatever the order of the fields, compared through their
 * JSON representation (`Date`s by their ISO string, nested objects by their
 * content); a primitive or `null` item is a duplicate of an equal one.
 * Meant to run after {@link projectItems}: the duplicates are then found on
 * the projected fields only.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to deduplicate.
 * @returns the distinct items.
 * @example
 * ```ts
 * const genders = distinctItems(projectItems(users, [{ field: "gender" }]));
 * // [{ gender: "F" }, { gender: "M" }]
 * ```
 */
export function distinctItems<TItem = Any>(items: List<TItem>): List<TItem> {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = toKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

//#region Internals
/**
 * Serializes an item into the key telling its duplicates apart: the own
 * fields in alphabetical order, so `{ a, b }` and `{ b, a }` are the same
 * item; primitives are prefixed by their type, so `1` and `"1"` are not.
 */
function toKey(item: unknown): string {
  if (item === null || typeof item !== "object")
    return `${typeof item}:${String(item)}`;
  const source = item as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const field of Object.keys(source).sort()) sorted[field] = source[field];
  return JSON.stringify(sorted);
}
//#endregion
