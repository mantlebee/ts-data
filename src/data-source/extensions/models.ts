import {
  Any,
  DebouncedDelegate,
  EventsDefinition,
  Subscribable,
} from "@mantlebee/ts-core";

import { IDataSourceExtension } from "./interfaces";
import { DataSourceExtensionOptions } from "./types";

/**
 * Default quiet time, in milliseconds, of the debounced `*Change` events.
 */
export const DataSourceExtensionChangeDelayDefault = 100;

/**
 * Base class of the extensions shipped with the package: a
 * `Subscribable` of ts-core with a cancellable, debounced `*Change` event.
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
  private readonly _changeDelegate: DebouncedDelegate;

  /**
   * @param options Debounce of the `*Change` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super();
    this._changeDelay =
      options?.changeDelay ?? DataSourceExtensionChangeDelayDefault;
    this._changeDelegate = new DebouncedDelegate(
      () => this._triggerChange(),
      this._changeDelay,
    );
  }

  /**
   * Cancels the pending `*Change` event and removes every handler.
   */
  public async dispose(): Promise<void> {
    this._changeDelegate.abort();
    await super.dispose();
  }

  /**
   * Raises the `*Change` event of the extension.
   */
  protected abstract _triggerChange(): void;

  /**
   * Schedules the `*Change` event after the quiet time, restarting the wait
   * if one is already pending.
   */
  protected _scheduleChange(): void {
    this._changeDelegate.call();
  }
}
