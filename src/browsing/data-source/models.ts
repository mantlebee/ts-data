import { ConstructorOf, List, Nullable } from "@mantlebee/ts-core";

import { IDataSource, IDataSourcePlugin } from "./interfaces";
import { DataSourceReadDelegate } from "./types";
import { getDataSourceReadPayload } from "./utils";

export class DataSource<TItem> implements IDataSource<TItem> {
  private _isPristine = true;
  private _isReading = false;
  private _items: List<TItem> = [];

  public constructor(
    private readonly readDelegate: DataSourceReadDelegate<TItem>,
    private readonly plugins: List<IDataSourcePlugin<TItem>> = []
  ) {}

  public get isPristine(): boolean {
    return this._isPristine;
  }
  public get isReading(): boolean {
    return this._isReading;
  }
  public get items(): List<TItem> {
    return this._items;
  }

  public getPlugin<TPlugin extends IDataSourcePlugin<TItem>>(
    pluginConstructor: ConstructorOf<TPlugin>
  ): Nullable<TPlugin> {
    const plugin = this.plugins.find((a) => a instanceof pluginConstructor);
    return plugin ? (plugin as TPlugin) : null;
  }
  public async read(): Promise<List<TItem>> {
    const { plugins } = this;
    this._isReading = true;
    return getDataSourceReadPayload(plugins).then((payload) =>
      this.readDelegate(payload)
        .then((items) => {
          this._isPristine = false;
          this._items = items;
          return this.items;
        })
        .finally(() => {
          this._isReading = false;
        })
    );
  }
}

export class DataSourcePlugin<TItem> implements IDataSourcePlugin<TItem> {
  private _enabled = true;

  public get isEnabled(): boolean {
    return this._enabled;
  }

  public disable(): void {
    this._enabled = false;
  }
  public enable(): void {
    this._enabled = true;
  }
}
