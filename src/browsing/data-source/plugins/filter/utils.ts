import { List, listToDictionary } from "@mantlebee/ts-core";

import { Filter, FiltersExpression, FilterOperators } from "@/browsing";

export function addFilterToFiltersExpression<TItem>(
  filter: Filter<TItem>,
  filtersExpression: FiltersExpression<TItem>
): void {
  if (filtersExpression.operator === FilterOperators.and) {
    removeFiltersByFieldFromFiltersExpression(filter.field, filtersExpression);
  }
  filtersExpression.filters.push(filter);
}

export function addFiltersToFiltersExpression<TItem>(
  filters: List<Filter<TItem>>,
  filtersExpression: FiltersExpression<TItem>
): void {
  const filtersMap = listToDictionary(filters, "field");
  if (filtersExpression.operator === FilterOperators.and) {
    filtersExpression.filters = filtersExpression.filters.filter(
      (a) => !filtersMap[a.field as keyof typeof filtersMap]
    );
  }
  filtersExpression.filters = filtersExpression.filters.concat(filters);
}

export function clearFiltersFromFiltersExpression<TItem>(
  filtersExpression: FiltersExpression<TItem>
): void {
  filtersExpression.childExpressions = [];
  filtersExpression.filters = [];
}

export function filtersExpressionHasFilters<TItem>(
  filtersExpression: FiltersExpression<TItem>
): boolean {
  const { childExpressions, filters } = filtersExpression;
  return Boolean(
    filters.length || childExpressions.some(filtersExpressionHasFilters)
  );
}

export function removeFilterFromFiltersExpression<TItem>(
  filter: Filter<TItem>,
  filtersExpression: FiltersExpression<TItem>
): void {
  filtersExpression.filters = filtersExpression.filters.filter(
    (a) => a !== filter
  );
}

export function removeFiltersByFieldFromFiltersExpression<TItem>(
  field: keyof TItem,
  filtersExpression: FiltersExpression<TItem>
): void {
  filtersExpression.filters = filtersExpression.filters.filter(
    (a) => a.field !== field
  );
}
