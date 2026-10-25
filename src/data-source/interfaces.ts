import { Any, EventsDefinition, ISubscribable, Nullable } from "@mantlebee/ts-core";

import { IFilterExtension } from "./filtering";
import { IPaginationExtension } from "./pagination";
import { IProjectionExtension } from "./projection";
import { ISortExtension } from "./sorting";
import { DataSourceEvents, DataSourcePayload } from "./types";

export interface IDataSource<TItem = Any> extends IDataSourceBase<TItem> {
  readonly filtering?: IFilterExtension<TItem>;
  readonly paginating?: IPaginationExtension<TItem>;
  readonly projecting?: IProjectionExtension<TItem>;
  readonly sorting?: ISortExtension<TItem>;
}

export interface IDataSourceBase<TItem = Any>
  extends ISubscribable<DataSourceEvents<TItem>> {
  readonly isReading: boolean;
  readonly items: TItem[];
  getExtension<
    TExtension extends IDataSourceExtension<TItem, TEvents>,
    TEvents extends EventsDefinition,
  >(
    constructor: new (...args: Any) => TExtension,
  ): Nullable<TExtension>;
  read(): Promise<void>;
}

export interface IDataSourceExtension<
  TItem = Any,
  TEvents extends EventsDefinition = EventsDefinition,
> extends ISubscribable<TEvents> {
  getCountBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>>;
  getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>>;
}
