import { KeyOf, List, Nullable } from "@mantlebee/ts-core";

import {
  Filter,
  FilterLogics,
  FiltersExpression,
  FiltersList,
} from "@/query-items";

import { DataSourceExtension } from "../models";
import { DataSourceExtensionOptions, DataSourcePayload } from "../types";
import { IFilterExtension } from "./interfaces";
import {
  FilterExtensionEvents,
  FilterExtensionWithFixedFiltersOptions,
} from "./types";

/**
 * Keeps a flat list of filters and sends it in the payload as a
 * {@link FiltersList}, only when there is at least one filter.
 * Place it before the {@link PaginationExtension}, so the count receives the filters.
 * @typeParam TItem Type of the items.
 */
export class FilterExtension<TItem>
  extends DataSourceExtension<TItem, FilterExtensionEvents<TItem>>
  implements IFilterExtension<TItem>
{
  protected _filters: List<Filter<TItem>> = [];
  protected _logic = FilterLogics.and;

  /**
   * @param options Debounce of the `filtersChange` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super(options);
  }

  public get filters(): List<Filter<TItem>> {
    return this._filters;
  }
  public get hasFilters(): boolean {
    return this._filters.length > 0;
  }
  public get logic(): FilterLogics {
    return this._logic;
  }

  public addFilter(filter: Filter<TItem>): void {
    this._filters = this._filters.concat(filter);
    this._eventBus.trigger("addFilter", filter, this.filters);
    this._scheduleChange();
  }
  public clearFilters(): void {
    this._filters = [];
    this._eventBus.trigger("clearFilters");
    this._scheduleChange();
  }
  public removeFilter(filter: Filter<TItem>): void {
    this._filters = this._filters.filter((a) => a !== filter);
    this._eventBus.trigger("removeFilter", filter, this.filters);
    this._scheduleChange();
  }
  public removeFiltersOf(field: KeyOf<TItem>): void {
    this._filters = this._filters.filter((a) => a.field !== field);
    this._eventBus.trigger("removeFiltersOf", field, this.filters);
    this._scheduleChange();
  }
  public replaceFiltersOf(
    field: KeyOf<TItem>,
    ...filters: List<Filter<TItem>>
  ): void {
    this._filters = this._filters
      .filter((a) => a.field !== field)
      .concat(filters);
    this._eventBus.trigger("replaceFiltersOf", field, this.filters);
    this._scheduleChange();
  }
  public setFilters(filters: List<Filter<TItem>>): void {
    this._filters = filters;
    this._eventBus.trigger("setFilters", this.filters);
    this._scheduleChange();
  }
  public setLogic(logic: FilterLogics): void {
    this._logic = logic;
    this._eventBus.trigger("setLogic", this.logic);
  }

  //#region Extension Methods
  /**
   * @returns the expression sent in the payload, `null` when there is none.
   */
  protected _getFiltersExpression(): Nullable<FiltersExpression<TItem>> {
    if (!this.hasFilters) return null;
    const list: FiltersList<TItem> = {
      filters: this.filters,
      logic: this.logic,
    };
    return list;
  }
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    const filters = this._getFiltersExpression();
    if (filters) payload.filters = filters;
    return payload;
  }
  protected _triggerChange(): void {
    this._eventBus.trigger("filtersChange", this.filters, this.hasFilters);
  }
  //#endregion
}

/**
 * {@link FilterExtension} that always sends a fixed expression too: alone when
 * the user has no filters, otherwise grouped with the user filters through
 * `groupsLogic` (default {@link FilterLogics.and}).
 * @typeParam TItem Type of the items.
 */
export class FilterExtensionWithFixedFilters<TItem>
  extends FilterExtension<TItem>
  implements IFilterExtension<TItem>
{
  protected readonly _fixedFilters: FiltersExpression<TItem>;
  protected readonly _groupsLogic: FilterLogics;

  /**
   * @param fixedFilters Expression always sent in the payload.
   * @param options Logic of the group and debounce of the `filtersChange` event.
   */
  public constructor(
    fixedFilters: FiltersExpression<TItem>,
    options?: FilterExtensionWithFixedFiltersOptions,
  ) {
    super(options);
    this._fixedFilters = fixedFilters;
    this._groupsLogic = options?.groupsLogic ?? FilterLogics.and;
  }

  public get fixedFilters(): FiltersExpression<TItem> {
    return this._fixedFilters;
  }
  public get groupsLogic(): FilterLogics {
    return this._groupsLogic;
  }

  protected _getFiltersExpression(): Nullable<FiltersExpression<TItem>> {
    const filters = super._getFiltersExpression();
    if (!filters) return this._fixedFilters;
    return { groups: [this._fixedFilters, filters], logic: this._groupsLogic };
  }
}
