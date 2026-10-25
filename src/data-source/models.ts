import {
  Any,
  ConstructorOf,
  EventsDefinition,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import { IDataSource, IDataSourceExtension } from "./interfaces";
import {
  DataSourceEvents,
  DataSourceExtensionOptions,
  DataSourcePayload,
  DataSourceReader,
} from "./types";

/**
 * Default quiet time, in milliseconds, of the debounced `*Change` events.
 */
export const DataSourceExtensionChangeDelayDefault = 100;

/**
 * Base class of the extensions shipped with the package: a
 * {@link Subscribable} with a cancellable, debounced `*Change` event.
 * Subclasses call {@link _scheduleChange} after every mutation and raise
 * their own event in {@link _triggerChange}. Custom extensions do not have to
 * extend it: implementing {@link IDataSourceExtension} is enough.
 * @typeParam TItem Type of the items of the data source.
 * @typeParam TEvents Events of the extension.
 */
export abstract class DataSourceExtension<
    TItem = Any,
    TEvents extends EventsDefinition = EventsDefinition,
  >
  extends Subscribable<TEvents>
  implements IDataSourceExtension<TItem, TEvents>
{
  protected readonly _changeDelay: number;
  private _changeTimeout: Nullable<ReturnType<typeof setTimeout>> = null;

  /**
   * @param options Debounce of the `*Change` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super();
    this._changeDelay =
      options?.changeDelay ?? DataSourceExtensionChangeDelayDefault;
  }

  /**
   * Cancels the pending `*Change` event and removes every handler.
   */
  public async dispose(): Promise<void> {
    this._cancelChange();
    await super.dispose();
  }

  /**
   * Raises the `*Change` event of the extension.
   */
  protected abstract _triggerChange(): void;

  /**
   * Cancels the pending `*Change` event, if any.
   */
  protected _cancelChange(): void {
    if (this._changeTimeout === null) return;
    clearTimeout(this._changeTimeout);
    this._changeTimeout = null;
  }
  /**
   * Schedules the `*Change` event after the quiet time, restarting the wait
   * if one is already pending.
   */
  protected _scheduleChange(): void {
    this._cancelChange();
    this._changeTimeout = setTimeout(() => {
      this._changeTimeout = null;
      this._triggerChange();
    }, this._changeDelay);
  }
}

/**
 * Data source driven only by its extensions: it knows nothing about filters,
 * pagination and so on, it just runs the read cycle described in
 * {@link IDataSourceExtension}, invoking the extensions in array order.
 * Choose the order on purpose: e.g. the `FilterExtension` must precede the
 * `PaginationExtension` for the count reader to receive the filters.
 * @example
 * ```ts
 * const filtering = new FilterExtension<User>();
 * const paginating = new PaginationExtension<User>(countUsers, 20);
 * const dataSource = new DataSource<User>(
 *   (payload) => api.getUsers(payload),
 *   [filtering, paginating],
 * );
 * dataSource.on("items", (users) => render(users));
 * await dataSource.read();
 * ```
 * @typeParam TItem Type of the items.
 */
export class DataSource<TItem = Any>
  extends Subscribable<DataSourceEvents<TItem>>
  implements IDataSource<TItem>
{
  private _isReading = false;
  private _items: List<TItem> = [];

  protected readonly _extensions: List<IDataSourceExtension<TItem>>;
  protected readonly _reader: DataSourceReader<TItem>;

  /**
   * @param reader Resolves the payload into the items.
   * @param extensions Extensions, invoked in array order.
   */
  public constructor(
    reader: DataSourceReader<TItem>,
    extensions: List<IDataSourceExtension<TItem>> = [],
  ) {
    super();
    this._extensions = extensions;
    this._reader = reader;
  }

  public get isReading(): boolean {
    return this._isReading;
  }
  public get items(): List<TItem> {
    return this._items;
  }

  /**
   * Removes every handler and disposes every extension.
   */
  public async dispose(): Promise<void> {
    await this._eventBus.dispose();
    for (const extension of this._extensions) await extension.dispose();
  }

  public getExtension<TExtension extends IDataSourceExtension<TItem>>(
    constructor: ConstructorOf<TExtension>,
  ): Nullable<TExtension> {
    const extension = this._extensions.find((a) => a instanceof constructor);
    return (extension as TExtension | undefined) ?? null;
  }

  public async read(): Promise<void> {
    this._setIsReading(true);
    try {
      const payload = await this._getItemsBefore({});
      const items = await this._reader(payload);
      this._items = await this._getItemsAfter(items, payload);
      this._eventBus.trigger("items", this._items);
    } catch (error) {
      this._eventBus.trigger("error", error);
      throw error;
    } finally {
      this._setIsReading(false);
    }
  }

  private async _getItemsAfter(
    items: List<TItem>,
    payload: DataSourcePayload<TItem>,
  ): Promise<List<TItem>> {
    for (const extension of this._extensions)
      if (extension.getItemsAfter)
        items = await extension.getItemsAfter(items, payload);
    return items;
  }
  private async _getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    for (const extension of this._extensions)
      if (extension.getItemsBefore)
        payload = await extension.getItemsBefore(payload);
    return payload;
  }
  private _setIsReading(isReading: boolean): void {
    this._isReading = isReading;
    this._eventBus.trigger("isReading", isReading);
  }
}

