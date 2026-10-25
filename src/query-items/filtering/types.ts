import { Any, KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { FilterLogics, FilterOperators } from "./constants";
import { Range } from "./range/types";

/**
 * Type of the value of any field of `TItem`.
 */
export type FilterFieldValue<TItem = Any> = TItem[KeyOf<TItem>];

/**
 * Operators whose {@link Filter.value} is a list of values.
 */
export type FilterListOperators = FilterOperators.in | FilterOperators.notIn;
/**
 * Operators whose {@link Filter.value} is a {@link Range}.
 */
export type FilterRangeOperators = FilterOperators.range;
/**
 * Operators whose {@link Filter.value} is a single, possibly `null`, value.
 */
export type FilterValueOperators = Exclude<
  FilterOperators,
  FilterListOperators | FilterRangeOperators
>;

/**
 * Filter whose value is a list: {@link FilterOperators.in}, {@link FilterOperators.notIn}.
 */
export type ListFilter<TItem = Any> = {
  field: KeyOf<TItem>;
  operator: FilterListOperators;
  value: List<FilterFieldValue<TItem>>;
};
/**
 * Filter whose value is a {@link Range}: {@link FilterOperators.range}.
 */
export type RangeFilter<TItem = Any> = {
  field: KeyOf<TItem>;
  operator: FilterRangeOperators;
  value: Range<FilterFieldValue<TItem>>;
};
/**
 * Filter whose value is a single value, or `null`: every other operator.
 */
export type ValueFilter<TItem = Any> = {
  field: KeyOf<TItem>;
  operator: FilterValueOperators;
  value: Nullable<FilterFieldValue<TItem>>;
};
/**
 * Condition on a single field of `TItem`. The union is discriminated by
 * `operator`, so the type of `value` follows the operator.
 */
export type Filter<TItem = Any> =
  | ListFilter<TItem>
  | RangeFilter<TItem>
  | ValueFilter<TItem>;

/**
 * Flat list of filters combined with the same logic. A list never contains
 * other expressions: nest a {@link FiltersGroup} for that.
 */
export type FiltersList<TItem = Any> = {
  filters: List<Filter<TItem>>;
  logic: FilterLogics;
};
/**
 * Group of expressions (lists or other groups) combined with the same logic.
 * A group never contains plain filters: nest a {@link FiltersList} for that.
 */
export type FiltersGroup<TItem = Any> = {
  groups: List<FiltersExpression<TItem>>;
  logic: FilterLogics;
};
/**
 * Tree of filters: a node is either a {@link FiltersList} or a
 * {@link FiltersGroup}, never both. Use {@link isFiltersGroup} and
 * {@link isFiltersList} to tell them apart.
 */
export type FiltersExpression<TItem = Any> =
  | FiltersGroup<TItem>
  | FiltersList<TItem>;
