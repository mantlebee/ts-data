import { Any, KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { FilterLogics, FilterOperators } from "./constants";
import { Range } from "./range/types";

/**
 * Type of the value of any field of `TItem`.
 * @typeParam TItem Type of the items.
 */
export type FilterFieldValue<TItem = Any> = TItem[KeyOf<TItem>];

/**
 * Operators whose `value` (see {@link Filter}) is a list of values.
 */
export type FilterListOperators = FilterOperators.in | FilterOperators.notIn;
/**
 * Operators whose `value` (see {@link Filter}) is a {@link Range}.
 */
export type FilterRangeOperators = FilterOperators.range;
/**
 * Operators whose `value` (see {@link Filter}) is a single, possibly `null`, value.
 */
export type FilterValueOperators = Exclude<
  FilterOperators,
  FilterListOperators | FilterRangeOperators
>;

/**
 * Filter whose value is a list: {@link FilterOperators.in}, {@link FilterOperators.notIn}.
 * @typeParam TItem Type of the items.
 */
export type ListFilter<TItem = Any> = {
  /** Field compared. */
  field: KeyOf<TItem>;
  operator: FilterListOperators;
  /** Values the field is compared with. */
  value: List<FilterFieldValue<TItem>>;
};
/**
 * Filter whose value is a {@link Range}: {@link FilterOperators.range}.
 * @typeParam TItem Type of the items.
 */
export type RangeFilter<TItem = Any> = {
  /** Field compared. */
  field: KeyOf<TItem>;
  operator: FilterRangeOperators;
  /** Interval the field must fall in. */
  value: Range<FilterFieldValue<TItem>>;
};
/**
 * Filter whose value is a single value, or `null`: every other operator.
 * @typeParam TItem Type of the items.
 */
export type ValueFilter<TItem = Any> = {
  /** Field compared. */
  field: KeyOf<TItem>;
  operator: FilterValueOperators;
  /** Value the field is compared with; `null` to match unset fields. */
  value: Nullable<FilterFieldValue<TItem>>;
};
/**
 * Condition on a single field of `TItem`. The union is discriminated by
 * `operator`, so the type of `value` follows the operator.
 * @typeParam TItem Type of the items.
 * @example
 * ```ts
 * const adult: Filter<User> = { field: "age", operator: FilterOperators.greaterThanOrEqual, value: 18 };
 * const roles: Filter<User> = { field: "role", operator: FilterOperators.in, value: ["admin", "editor"] };
 * ```
 */
export type Filter<TItem = Any> =
  | ListFilter<TItem>
  | RangeFilter<TItem>
  | ValueFilter<TItem>;

/**
 * Flat list of filters combined with the same logic. A list never contains
 * other expressions: nest a {@link FiltersGroup} for that.
 * @typeParam TItem Type of the items.
 */
export type FiltersList<TItem = Any> = {
  /** Filters of the node. */
  filters: List<Filter<TItem>>;
  /** Logic combining the filters. */
  logic: FilterLogics;
};
/**
 * Group of expressions (lists or other groups) combined with the same logic.
 * A group never contains plain filters: nest a {@link FiltersList} for that.
 * @typeParam TItem Type of the items.
 */
export type FiltersGroup<TItem = Any> = {
  /** Child expressions of the node. */
  groups: List<FiltersExpression<TItem>>;
  /** Logic combining the child expressions. */
  logic: FilterLogics;
};
/**
 * Tree of filters: a node is either a {@link FiltersList} or a
 * {@link FiltersGroup}, never both. Use {@link isFiltersGroup} and
 * {@link isFiltersList} to tell them apart.
 * @typeParam TItem Type of the items.
 * @example
 * `(age >= 18 and active) or role in (admin, editor)`:
 * ```ts
 * const expression: FiltersExpression<User> = {
 *   groups: [
 *     { filters: [adult, active], logic: FilterLogics.and },
 *     { filters: [roles], logic: FilterLogics.and },
 *   ],
 *   logic: FilterLogics.or,
 * };
 * ```
 */
export type FiltersExpression<TItem = Any> =
  | FiltersGroup<TItem>
  | FiltersList<TItem>;
