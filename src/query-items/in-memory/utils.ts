import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { FilterLogics, FilterOperators } from "../filtering/constants";
import type { Filter, FiltersExpression } from "../filtering/types";
import { isFiltersGroup } from "../filtering/utils";
import type { Paging } from "../pagination/types";
import type { Sort } from "../sorting/types";
import type { QueryItemsPayload } from "../types";
import type {
  InMemoryItems,
  InMemoryQueryOptions,
  InMemoryReader,
  InMemoryReaderOptions,
} from "./types";

/**
 * Converts a value of an item, or of a filter, into the primitive the
 * in-memory query compares with `===`, `<` and `>`:
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
 * Resolves a payload against a list, as a server would: the items matching
 * `payload.filters`, in the order of `payload.sorts`, cut to `payload.paging`.
 * - **Filters**: every {@link FilterOperators} member, `FiltersExpression`
 *   trees at any depth; an empty list or group matches every item; a `null`
 *   value matches an unset field with `equal` / `in`, never with the ordered
 *   operators (`gt`, `range`, ...) nor with the string ones.
 * - **Sorts**: stable, by priority; unset values first when ascending.
 * - **Paging**: 1-based `page`, a page beyond the last one is empty.
 * `projections` and `distinct` are not applied: the items are returned whole.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to query.
 * @param payload Query to resolve; every property is optional.
 * @param options Comparison options, see {@link InMemoryQueryOptions}.
 * @returns the items of the requested page, every matching item when the
 * payload has no paging.
 * @example
 * ```ts
 * const page = queryItems(users, {
 *   filters: { filters: [{ field: "age", operator: FilterOperators.greaterThanOrEqual, value: 18 }], logic: FilterLogics.and },
 *   paging: { itemsPerPage: 20, page: 2, totalItemsCount: 0 },
 *   sorts: [{ asc: true, field: "lastName" }],
 * });
 * ```
 */
export function queryItems<TItem = Any>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
  options?: InMemoryQueryOptions<TItem>,
): List<TItem> {
  const compare = createComparer(options);
  const filtered = filterItems(items, payload.filters, compare);
  const sorted = sortItems(filtered, payload.sorts, compare);
  return pageItems(sorted, payload.paging);
}

/**
 * Counts the items of a list matching the filters of a payload, ignoring its
 * sorts and paging: the total count reader of the `PaginationExtension`.
 * @param items Items to count.
 * @param payload Query whose `filters` are applied.
 * @param options Comparison options, see {@link InMemoryQueryOptions}.
 * @returns the number of matching items, the length of the list without filters.
 */
export function countItems<TItem = Any>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
  options?: InMemoryQueryOptions<TItem>,
): number {
  const filters = payload.filters;
  if (!filters) return items.length;
  const compare = createComparer(options);
  let count = 0;
  for (const item of items)
    if (matchesExpression(item, filters, compare)) count++;
  return count;
}

/**
 * Creates the two readers of a `DataSource` over a list: `reader` runs
 * {@link queryItems}, `countReader` runs {@link countItems}. Both read the
 * list when invoked, so a getter lets the consumer swap the data between two
 * reads, and both resolve asynchronously (next microtask, or after
 * {@link InMemoryReaderOptions.delay} milliseconds).
 * @param items Items to serve, or a getter returning the current items.
 * @param options Comparison options and latency, see {@link InMemoryReaderOptions}.
 * @returns the readers, ready for the data source and its pagination.
 * @example
 * ```ts
 * const { countReader, reader } = createInMemoryReader(users);
 * const filtering = new FilterExtension<User>();
 * const sorting = new SortExtension<User>();
 * const paginating = new PaginationExtension<User>(countReader, 20);
 * const dataSource = new DataSource<User>(reader, [filtering, sorting, paginating]);
 * ```
 */
export function createInMemoryReader<TItem = Any>(
  items: InMemoryItems<TItem>,
  options?: InMemoryReaderOptions<TItem>,
): InMemoryReader<TItem> {
  const getItems = typeof items === "function" ? items : () => items;
  const delay = options?.delay;
  return {
    countReader: async (payload) => {
      await wait(delay);
      return countItems(getItems(), payload, options);
    },
    reader: async (payload) => {
      await wait(delay);
      return queryItems(getItems(), payload, options);
    },
  };
}

//#region Internals
/**
 * Converts the value of a field of an item, or of a filter on that field,
 * into the primitive compared. Typed `Any` on purpose: the relational
 * operators are applied to whatever the conversion returns.
 */
type Comparer<TItem> = (value: unknown, field: KeyOf<TItem>) => Any;

function createComparer<TItem>(
  options?: InMemoryQueryOptions<TItem>,
): Comparer<TItem> {
  if (options?.toComparable) return options.toComparable;
  const caseSensitive = options?.caseSensitive ?? false;
  return (value) => toComparableValue(value, caseSensitive);
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  );
}

/** Lower-cases a comparable when it is a string, for `equalInsensitive`. */
function toInsensitive(value: Any): Any {
  return typeof value === "string" ? value.toLowerCase() : value;
}

/** `contains` on a string (substring) or on a list (membership). */
function contains<TItem>(
  actual: Any,
  expected: Any,
  field: KeyOf<TItem>,
  compare: Comparer<TItem>,
): boolean {
  if (actual === null || expected === null) return false;
  if (Array.isArray(actual))
    return actual.some((element) => compare(element, field) === expected);
  return String(actual).includes(String(expected));
}

function getFieldValue<TItem>(item: TItem, field: KeyOf<TItem>): unknown {
  if (item === null || item === undefined) return undefined;
  return item[field];
}

function matchesFilter<TItem>(
  item: TItem,
  filter: Filter<TItem>,
  compare: Comparer<TItem>,
): boolean {
  const field = filter.field;
  const actual = compare(getFieldValue(item, field), field);
  switch (filter.operator) {
    case FilterOperators.in:
      return filter.value.some((value) => compare(value, field) === actual);
    case FilterOperators.notIn:
      return !filter.value.some((value) => compare(value, field) === actual);
    case FilterOperators.range: {
      if (actual === null) return false;
      const { max, min } = filter.value;
      if (min) {
        const limit = compare(min.value, field);
        if (limit !== null && (min.exclude ? actual <= limit : actual < limit))
          return false;
      }
      if (max) {
        const limit = compare(max.value, field);
        if (limit !== null && (max.exclude ? actual >= limit : actual > limit))
          return false;
      }
      return true;
    }
  }
  const expected = compare(filter.value, field);
  switch (filter.operator) {
    case FilterOperators.equal:
      return actual === expected;
    case FilterOperators.notEqual:
      return actual !== expected;
    case FilterOperators.equalInsensitive:
      return toInsensitive(actual) === toInsensitive(expected);
    case FilterOperators.greaterThan:
      return actual !== null && expected !== null && actual > expected;
    case FilterOperators.greaterThanOrEqual:
      return actual !== null && expected !== null && actual >= expected;
    case FilterOperators.lessThan:
      return actual !== null && expected !== null && actual < expected;
    case FilterOperators.lessThanOrEqual:
      return actual !== null && expected !== null && actual <= expected;
    case FilterOperators.contains:
      return contains(actual, expected, field, compare);
    case FilterOperators.notContains:
      return !contains(actual, expected, field, compare);
    case FilterOperators.startsWith:
      return (
        actual !== null &&
        expected !== null &&
        String(actual).startsWith(String(expected))
      );
    case FilterOperators.endsWith:
      return (
        actual !== null &&
        expected !== null &&
        String(actual).endsWith(String(expected))
      );
  }
  const unknown: Filter<TItem> = filter;
  throw new Error(`Unknown filter operator: ${String(unknown.operator)}`);
}

/**
 * Combines the matches of the nodes of an expression with its logic. An
 * empty node matches every item, whatever the logic.
 */
function combine<TNode>(
  nodes: List<TNode>,
  logic: FilterLogics,
  matches: (node: TNode) => boolean,
): boolean {
  if (nodes.length === 0) return true;
  return logic === FilterLogics.or ? nodes.some(matches) : nodes.every(matches);
}

function matchesExpression<TItem>(
  item: TItem,
  expression: FiltersExpression<TItem>,
  compare: Comparer<TItem>,
): boolean {
  if (isFiltersGroup(expression))
    return combine(expression.groups, expression.logic, (group) =>
      matchesExpression(item, group, compare),
    );
  return combine(expression.filters, expression.logic, (filter) =>
    matchesFilter(item, filter, compare),
  );
}

function filterItems<TItem>(
  items: List<TItem>,
  filters: QueryItemsPayload<TItem>["filters"],
  compare: Comparer<TItem>,
): List<TItem> {
  if (!filters) return items.slice();
  return items.filter((item) => matchesExpression(item, filters, compare));
}

/**
 * Orders two comparables: unset values (`null`) first, then by `<` / `>`;
 * values that are neither lower nor greater (mixed types, `NaN`) are equal.
 */
function compareValues(a: Any, b: Any): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Stable sort on a copy: the comparables of every sort are computed once per
 * item, and the original index breaks the ties.
 */
function sortItems<TItem>(
  items: List<TItem>,
  sorts: QueryItemsPayload<TItem>["sorts"],
  compare: Comparer<TItem>,
): List<TItem> {
  if (!sorts || sorts.length === 0) return items;
  const keyed = items.map((item, index) => ({
    index,
    item,
    keys: sorts.map((sort: Sort<TItem>) =>
      compare(getFieldValue(item, sort.field), sort.field),
    ),
  }));
  keyed.sort((a, b) => {
    for (let i = 0; i < sorts.length; i++) {
      const result = compareValues(a.keys[i], b.keys[i]);
      if (result !== 0) return sorts[i].asc ? result : -result;
    }
    return a.index - b.index;
  });
  return keyed.map((a) => a.item);
}

/** Cuts the page; a page lower than 1 is read as the first one. */
function pageItems<TItem>(items: List<TItem>, paging?: Paging): List<TItem> {
  if (!paging) return items;
  const page = Math.max(1, paging.page);
  const start = (page - 1) * paging.itemsPerPage;
  return items.slice(start, start + paging.itemsPerPage);
}

/** Resolves after `delay` milliseconds, or on the next microtask. */
function wait(delay?: number): Promise<void> {
  if (delay && delay > 0)
    return new Promise((resolve) => setTimeout(resolve, delay));
  return Promise.resolve();
}
//#endregion
