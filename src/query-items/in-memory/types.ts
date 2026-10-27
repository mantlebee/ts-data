import { Any, KeyOf } from "@mantlebee/ts-core";

import type { QueryItemsReader } from "../types";

/**
 * Converts the value of a field of an item, or of a filter on that field,
 * into the primitive the in-memory delegates compare with `===`, `<` and
 * `>`. Typed `Any` on purpose: the relational operators are applied to
 * whatever the conversion returns. See {@link createInMemoryQueryItemsComparer}.
 * @typeParam TItem Type of the items.
 */
export type InMemoryQueryItemsComparer<TItem = Any> = (
  value: unknown,
  field: KeyOf<TItem>,
) => Any;

/**
 * Options of the in-memory delegates ({@link filterItems},
 * {@link sortItems}) and of {@link queryItems} / {@link countItems}: how
 * the values of the items and of the filters are compared.
 * @typeParam TItem Type of the items.
 */
export type InMemoryQueryItemsReaderOptions<TItem = Any> = {
  /**
   * `true` to compare strings as they are. By default (`false`) strings are
   * lower-cased before any comparison, so `equal`, `contains`, `startsWith`,
   * `endsWith`, `in` and the sorts ignore the case. `equalInsensitive`
   * ignores the case whatever this option.
   */
  caseSensitive?: boolean;
  /**
   * Replaces the default conversion ({@link toComparableValue}) of a value
   * into the primitive actually compared. It receives both sides of every
   * comparison, the value of the item and the value of the filter, with the
   * field they belong to, so the rule can differ per field. Its result is
   * used as it is: lower-case the strings yourself when needed. Return
   * `null` for an unset value.
   * @example
   * ```ts
   * // Prices are value objects compared by their amount in cents.
   * const options: InMemoryQueryItemsReaderOptions<Product> = {
   *   toComparable: (value, field) =>
   *     field === "price" ? (value as Price).cents : toComparableValue(value),
   * };
   * ```
   */
  toComparable?: InMemoryQueryItemsComparer<TItem>;
};

/**
 * The two readers of a `DataSource` over a list, returned by
 * {@link createInMemoryQueryItemsReader}.
 * @typeParam TItem Type of the items.
 */
export type InMemoryQueryItemsReader<TItem = Any> = {
  /** Resolves the number of items matching the payload, for the `PaginationExtension`. */
  countReader: QueryItemsReader<TItem, number>;
  /** Resolves the items matching the payload: filtered, sorted, projected, then paged. */
  reader: QueryItemsReader<TItem>;
};
