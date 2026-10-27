import { Any, KeyOf, List } from "@mantlebee/ts-core";

import type { DataSourceReader } from "@/data-source/types";

/**
 * Items served by an in-memory reader: a list, or a getter returning the
 * current list, so the consumer can swap the data between two reads.
 * @typeParam TItem Type of the items.
 */
export type InMemoryItems<TItem = Any> = List<TItem> | (() => List<TItem>);

/**
 * Options of {@link queryItems} and {@link countItems}: how the values of the
 * items and of the filters are compared.
 * @typeParam TItem Type of the items.
 */
export type InMemoryQueryOptions<TItem = Any> = {
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
   * const options: InMemoryQueryOptions<Product> = {
   *   toComparable: (value, field) =>
   *     field === "price" ? (value as Price).cents : toComparableValue(value),
   * };
   * ```
   */
  toComparable?: (value: unknown, field: KeyOf<TItem>) => unknown;
};

/**
 * Options of {@link createInMemoryReader}: the comparison options plus the
 * latency of the readers.
 * @typeParam TItem Type of the items.
 */
export type InMemoryReaderOptions<TItem = Any> = InMemoryQueryOptions<TItem> & {
  /**
   * Milliseconds the readers wait before resolving, to simulate a remote
   * storage in stories and demos. Without it (or with `0`) they resolve on
   * the next microtask, so `isReading` of the data source is still
   * observable.
   */
  delay?: number;
};

/**
 * The two readers of a `DataSource` over a list, returned by
 * {@link createInMemoryReader}.
 * @typeParam TItem Type of the items.
 */
export type InMemoryReader<TItem = Any> = {
  /** Resolves the number of items matching the filters of the payload, for the `PaginationExtension`. */
  countReader: DataSourceReader<TItem, number>;
  /** Resolves the items matching the payload: filtered, sorted, then paged. */
  reader: DataSourceReader<TItem>;
};
