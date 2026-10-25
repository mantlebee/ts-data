import {
  Any,
  EventsDefinition,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import { FilterExtension, IFilterExtension } from "./filtering";
import {
  IDataSource,
  IDataSourceBase,
  IDataSourceExtension,
} from "./interfaces";
import { IPaginationExtension, PaginationExtension } from "./pagination";
import { IProjectionExtension, ProjectionExtension } from "./projection";
import { ISortExtension, SortExtension } from "./sorting";
import { DataSourceReader, DataSourcePayload, DataSourceEvents } from "./types";

export class DataSourceBase<TItem = Any>
  extends Subscribable<DataSourceEvents<TItem>>
  implements IDataSourceBase<TItem>
{
  private _isReading = false;
  private _items: List<TItem> = [];

  protected readonly _reader: DataSourceReader<TItem>;
  protected readonly _extensions?: IDataSourceExtension<TItem>[];

  public constructor(
    reader: DataSourceReader<TItem>,
    extensions?: List<IDataSourceExtension<TItem>>,
  ) {
    super();
    this._reader = reader;
    this._extensions = extensions;
  }

  public get isReading(): boolean {
    return this._isReading;
  }
  public get items(): TItem[] {
    return this._items;
  }

  public async dispose(): Promise<void> {
    await this._eventBus.dispose();
    if (this._extensions)
      for (const extension of this._extensions) await extension.dispose();
  }

  public getExtension<
    TExtension extends IDataSourceExtension<TItem, TEvents>,
    TEvents extends EventsDefinition,
  >(constructor: new (...args: any) => TExtension): Nullable<TExtension> {
    return (this._extensions?.find((a) => a instanceof constructor) ||
      null) as Nullable<TExtension>;
  }

  public async read(): Promise<void> {
    this._isReading = true;
    this._eventBus.trigger("isReading", this.isReading);
    try {
      const payload = await this._getPayload();
      const items = await this._reader(payload);
      this._items = items;
      this._eventBus.trigger("items", this.items);
    } catch (error) {
      // Errore ignorato intenzionalmente
    }
    this._isReading = false;
    this._eventBus.trigger("isReading", this.isReading);
  }

  private async _getPayload(): Promise<DataSourcePayload<TItem>> {
    let payload: DataSourcePayload<TItem> = {};
    if (this._extensions)
      for (const extension of this._extensions)
        if (extension.getItemsBefore)
          payload = await extension.getItemsBefore(payload);
    return payload;
  }
}

export class DataSource<TItem = Any>
  extends DataSourceBase<TItem>
  implements IDataSource<TItem>
{
  public readonly filtering?: IFilterExtension<TItem>;
  public readonly paginating?: IPaginationExtension<TItem>;
  public readonly projecting?: IProjectionExtension<TItem>;
  public readonly sorting?: ISortExtension<TItem>;

  public constructor(
    reader: DataSourceReader<TItem>,
    extensions?: IDataSourceExtension<TItem>[],
  ) {
    super(reader, extensions);
    if (extensions)
      for (const a of extensions) {
        if (a instanceof FilterExtension)
          this.filtering = a as IFilterExtension<TItem>;
        else if (a instanceof PaginationExtension)
          this.paginating = a as IPaginationExtension<TItem>;
        else if (a instanceof ProjectionExtension)
          this.projecting = a as IProjectionExtension<TItem>;
        else if (a instanceof SortExtension)
          this.sorting = a as ISortExtension<TItem>;
      }
  }
}
