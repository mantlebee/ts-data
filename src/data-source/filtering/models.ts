import {
  Any,
  DebouncedDelegate,
  KeyOf,
  List,
  Subscribable,
} from "@mantlebee/ts-core";

import { Filter, FilterLogics, FiltersExpression } from "@/query-items";

import { DataSourcePayload } from "../types";
import { IFilterExtension } from "./interfaces";
import { FilterExtensionEvents } from "./types";

export class FilterExtension<TItem = Any>
  extends Subscribable<FilterExtensionEvents<TItem>>
  implements IFilterExtension<TItem>
{
  protected _filters: List<Filter<TItem>> = [];
  protected _filtersLogic = FilterLogics.and;

  protected readonly _onFiltersChange = new DebouncedDelegate(
    () =>
      this._eventBus.trigger("filtersChange", this.filters, this.hasFilters),
    100,
  );

  public get filters(): List<Filter<TItem>> {
    return this._filters;
  }
  public get filtersLogic(): FilterLogics {
    return this._filtersLogic;
  }
  public get hasFilters(): boolean {
    return this.filters.length > 1;
  }
  public get logic(): FilterLogics {
    return this._filtersLogic;
  }
  public addFilter(filter: Filter<TItem>): void {
    this._filters.push(filter);
    this._eventBus.trigger("addFilter", filter, this.filters);
    this._onFiltersChange.call();
  }
  public clearFilters(): void {
    this._filters = [];
    this._eventBus.trigger("clearFilters");
    this._onFiltersChange.call();
  }
  public removeFilter(filter: Filter<TItem>): void {
    this._filters = this._filters.filter((a) => a !== filter);
    this._eventBus.trigger("removeFilter", filter, this.filters);
    this._onFiltersChange.call();
  }
  public removeFiltersOf(field: KeyOf<TItem>): void {
    this._filters = this._filters.filter((a) => a.field !== field);
    this._eventBus.trigger("removeFiltersOf", field, this.filters);
    this._onFiltersChange.call();
  }
  public replaceFiltersOf(field: KeyOf<TItem>, ...filters: List<Filter>): void {
    this._filters = this._filters.filter((a) => a.field !== field);
    this.filters.push(...filters);
    this._eventBus.trigger("replaceFiltersOf", field, this.filters);
    this._onFiltersChange.call();
  }
  public setFilters(filters: List<Filter<TItem>>): void {
    this._filters = filters;
    this._eventBus.trigger("setFilters", this.filters);
    this._onFiltersChange.call();
  }
  public setLogic(logic: FilterLogics): void {
    this._filtersLogic = logic;
    this._eventBus.trigger("setLogic", this.filtersLogic);
  }

  //#region Extension Methods
  protected get _filtersExpression(): FiltersExpression<TItem> {
    return { filters: this.filters, logic: this.filtersLogic };
  }
  public getCountBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    if (this.filters.length) payload.filters = this._filtersExpression;
    return Promise.resolve(payload);
  }
  public getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    if (this.filters.length) payload.filters = this._filtersExpression;
    return Promise.resolve(payload);
  }
  //#endregion
}

export class FilterExtensionWithFixedFilters<TItem = Any>
  extends FilterExtension<TItem>
  implements IFilterExtension<TItem>
{
  public constructor(
    protected readonly fixedFilters: FiltersExpression<TItem>,
  ) {
    super();
    this._filtersLogic = FilterLogics.or;
  }

  protected get _filtersExpression(): FiltersExpression<TItem> {
    return {
      filters: [this.fixedFilters, super._filtersExpression],
      logic: FilterLogics.and,
    };
  }
}
