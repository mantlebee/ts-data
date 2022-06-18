import { List } from "@mantlebee/ts-core";

import { Filter, FiltersExpression } from "@/browsing";

import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceFilteringPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly filtersExpression: FiltersExpression<TItem>;
  readonly hasFilters: boolean;
  addFilter(
    filter: Filter<TItem>,
    filtersExpression?: FiltersExpression<TItem>
  ): void;
  addFilters(
    filters: List<Filter<TItem>>,
    filtersExpression?: FiltersExpression<TItem>
  ): void;
  clearFilters(filtersExpression?: FiltersExpression<TItem>): void;
  removeFilter(
    filter: Filter<TItem>,
    filtersExpression?: FiltersExpression<TItem>
  ): void;
}
