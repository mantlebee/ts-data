import { Any } from "@mantlebee/ts-core";

import { FiltersExpression, FiltersGroup, FiltersList } from "./types";

/**
 * Tells whether an expression is a {@link FiltersGroup}.
 * @param expression Expression to check.
 * @returns `true` if the node holds other expressions.
 */
export function isFiltersGroup<TItem = Any>(
  expression: FiltersExpression<TItem>,
): expression is FiltersGroup<TItem> {
  return "groups" in expression;
}

/**
 * Tells whether an expression is a {@link FiltersList}.
 * @param expression Expression to check.
 * @returns `true` if the node holds plain filters.
 */
export function isFiltersList<TItem = Any>(
  expression: FiltersExpression<TItem>,
): expression is FiltersList<TItem> {
  return "filters" in expression;
}
