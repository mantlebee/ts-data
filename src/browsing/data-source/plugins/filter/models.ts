import { List } from "@mantlebee/ts-core";

import {
  FiltersExpression,
  FilterOperators,
  Filter,
  BrowseItemsPayload,
} from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourceFilterPlugin } from "./interfaces";
import {
  addFiltersToFiltersExpression,
  addFilterToFiltersExpression,
  clearFiltersFromFiltersExpression,
  filtersExpressionHasFilters,
  removeFilterFromFiltersExpression,
} from "./utils";

export class DataSourceFilterPlugin<TItem> extends DataSourcePlugin<TItem>
  implements IDataSourceFilterPlugin<TItem> {
  private _filtersExpression: FiltersExpression<TItem> = {
    childExpressions: [],
    filters: [],
    operator: FilterOperators.and,
  };

  public get filtersExpression(): FiltersExpression<TItem> {
    return this._filtersExpression;
  }
  public get hasFilters(): boolean {
    return filtersExpressionHasFilters(this.filtersExpression);
  }

  public addFilter(
    filter: Filter<TItem>,
    filtersExpression: FiltersExpression<TItem> = this.filtersExpression
  ): void {
    addFilterToFiltersExpression(filter, filtersExpression);
  }
  public addFilters(
    filters: List<Filter<TItem>>,
    filtersExpression: FiltersExpression<TItem> = this.filtersExpression
  ): void {
    addFiltersToFiltersExpression(filters, filtersExpression);
  }
  public clearFilters(
    filtersExpression: FiltersExpression<TItem> = this.filtersExpression
  ): void {
    clearFiltersFromFiltersExpression(filtersExpression);
  }
  public removeFilter(
    filter: Filter<TItem>,
    filtersExpression: FiltersExpression<TItem> = this.filtersExpression
  ): void {
    removeFilterFromFiltersExpression(filter, filtersExpression);
  }

  public beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    if (this.hasFilters) payload.filters = this.filtersExpression;
    return Promise.resolve(payload);
  }
}
