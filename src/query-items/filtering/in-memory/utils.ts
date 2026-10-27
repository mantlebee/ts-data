import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { createInMemoryQueryItemsComparer } from "../../in-memory/comparer";
import type {
  InMemoryQueryItemsComparer,
  InMemoryQueryItemsReaderOptions,
} from "../../in-memory/types";
import { FilterLogics, FilterOperators } from "../constants";
import type { Filter, FiltersExpression } from "../types";
import { isFiltersGroup } from "../utils";

/**
 * Keeps the items of a list matching an expression, as a server would:
 * every {@link FilterOperators} member, `FiltersExpression` trees at any
 * depth; an empty list or group matches every item; a `null` value matches
 * an unset field with `equal` / `in`, never with the ordered operators
 * (`gt`, `range`, ...) nor with the string ones. See {@link itemMatchesFilter}
 * for the operators.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to filter.
 * @param filters Expression to match; none for every item.
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns the matching items, in their order; a copy of the list without
 * an expression.
 * @example
 * ```ts
 * const adults = filterItems(users, {
 *   filters: [{ field: "age", operator: FilterOperators.greaterThanOrEqual, value: 18 }],
 *   logic: FilterLogics.and,
 * });
 * ```
 */
export function filterItems<TItem = Any>(
  items: List<TItem>,
  filters?: FiltersExpression<TItem>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): List<TItem> {
  if (!filters) return items.slice();
  const compare = createInMemoryQueryItemsComparer(options);
  return items.filter((item) => matches(item, filters, compare));
}

/**
 * Tells whether an item matches an expression: the matches of the nodes
 * combined with their logic, recursively; an empty list or group matches.
 * @param item Item to check.
 * @param expression Expression to match.
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns `true` if the item satisfies the expression.
 */
export function itemMatchesFilterExpression<TItem = Any>(
  item: TItem,
  expression: FiltersExpression<TItem>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): boolean {
  return matches(item, expression, createInMemoryQueryItemsComparer(options));
}

/**
 * Tells whether an item matches a single filter. Both the value of the
 * field and the value of the filter go through the comparer of the options
 * (see {@link toComparableValue}) before being compared:
 * - `equal`, `notEqual`, `in`, `notIn`: by `===` on the comparables;
 * - `equalInsensitive`: like `equal`, ignoring the case whatever the options;
 * - `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`: by
 *   `<` / `>`, never matching an unset value on either side;
 * - `range`: between `min` and `max`, each excluded when `exclude` is
 *   `true`, open when `null`; never matching an unset value;
 * - `contains`, `notContains`: substring of a string, membership of a list;
 * - `startsWith`, `endsWith`: on the text of the values.
 * @param item Item to check.
 * @param filter Filter to match.
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns `true` if the field of the item satisfies the filter.
 * @throws an `Error` when the operator is not a {@link FilterOperators} member.
 */
export function itemMatchesFilter<TItem = Any>(
  item: TItem,
  filter: Filter<TItem>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): boolean {
  return matchesOne(item, filter, createInMemoryQueryItemsComparer(options));
}

//#region Internals
/** Lower-cases a comparable when it is a string, for `equalInsensitive`. */
function toInsensitive(value: Any): Any {
  return typeof value === "string" ? value.toLowerCase() : value;
}

/** `contains` on a string (substring) or on a list (membership). */
function contains<TItem>(
  actual: Any,
  expected: Any,
  field: KeyOf<TItem>,
  compare: InMemoryQueryItemsComparer<TItem>,
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

function matchesOne<TItem>(
  item: TItem,
  filter: Filter<TItem>,
  compare: InMemoryQueryItemsComparer<TItem>,
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
  matchesNode: (node: TNode) => boolean,
): boolean {
  if (nodes.length === 0) return true;
  return logic === FilterLogics.or
    ? nodes.some(matchesNode)
    : nodes.every(matchesNode);
}

function matches<TItem>(
  item: TItem,
  expression: FiltersExpression<TItem>,
  compare: InMemoryQueryItemsComparer<TItem>,
): boolean {
  if (isFiltersGroup(expression))
    return combine(expression.groups, expression.logic, (group) =>
      matches(item, group, compare),
    );
  return combine(expression.filters, expression.logic, (filter) =>
    matchesOne(item, filter, compare),
  );
}
//#endregion
