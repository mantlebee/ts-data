import { List } from "@mantlebee/ts-core";

import { Filter, FilterOperators, FiltersExpression } from "@/browsing";
import { GenericItem } from "@/fake";

import { DataSourceFilteringPlugin } from "../models";

export function getDataSourceFiltering(): DataSourceFilteringPlugin<
  GenericItem
> {
  return new DataSourceFilteringPlugin();
}

export function getFiltersExpression<GenericItem>(
  filters: List<Filter<GenericItem>>,
  operator = FilterOperators.and
): FiltersExpression<GenericItem> {
  return {
    childExpressions: [],
    filters,
    operator
  };
}
