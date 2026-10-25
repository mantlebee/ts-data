/**
 * Logic used to combine the filters of a {@link FiltersList}, or the
 * expressions of a {@link FiltersGroup}.
 */
export enum FilterLogics {
  /** Every filter (or expression) must match. */
  and = "and",
  /** At least one filter (or expression) must match. */
  or = "or",
}

/**
 * Comparison applied by a {@link Filter}. The values follow OData 4 where OData
 * defines them, otherwise the most common naming (Strapi, Prisma, PrimeVue).
 * The operator decides the shape of the `value` of a {@link Filter}: a list for
 * {@link FilterOperators.in} and {@link FilterOperators.notIn}, a
 * {@link Range} for {@link FilterOperators.range}, a single value otherwise.
 */
export enum FilterOperators {
  /** The field contains the value (strings, lists). */
  contains = "contains",
  /** The field ends with the value. */
  endsWith = "endsWith",
  /** The field equals the value. */
  equal = "eq",
  /** The field equals the value, ignoring the case. */
  equalInsensitive = "eqi",
  /** The field is greater than the value. */
  greaterThan = "gt",
  /** The field is greater than or equal to the value. */
  greaterThanOrEqual = "ge",
  /** The field is one of the values of the list. */
  in = "in",
  /** The field is less than the value. */
  lessThan = "lt",
  /** The field is less than or equal to the value. */
  lessThanOrEqual = "le",
  /** The field does not contain the value. */
  notContains = "notContains",
  /** The field differs from the value. */
  notEqual = "ne",
  /** The field is none of the values of the list. */
  notIn = "notIn",
  /** The field is inside the {@link Range}. */
  range = "between",
  /** The field starts with the value. */
  startsWith = "startsWith",
}
