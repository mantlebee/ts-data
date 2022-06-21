import { List } from "@mantlebee/ts-core";

import { Filter, FilterOperators, FiltersExpression } from "@/browsing";
import { GenericItem } from "@/fake";

import { DataSourceFilterPlugin } from "../models";

export function getDataSourceFiltering(): DataSourceFilterPlugin<GenericItem> {
  return new DataSourceFilterPlugin();
}

export function getFiltersExpression<GenericItem>(
  filters: List<Filter<GenericItem>>,
  operator = FilterOperators.and
): FiltersExpression<GenericItem> {
  return {
    childExpressions: [],
    filters,
    operator,
  };
}
