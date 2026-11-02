import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload, QueryItemsReader } from "@/query-items";

import type { DataSourceCapabilities } from "./interfaces";

/**
 * A key of {@link DataSourceCapabilities}: `"filtering"`, `"pagination"`,
 * `"projection"`, `"sorting"`, plus the keys a consumer augmented.
 */
export type DataSourceCapability = keyof DataSourceCapabilities;

/**
 * Type of the keyed property `TKey` of a {@link DataSource} guaranteeing
 * `TCaps`: the extension when `TKey` is guaranteed, the extension or
 * `undefined` otherwise. It is how the class states its capabilities, since a
 * class cannot pick its members from a generic key; a consumer annotates with
 * {@link IDataSource} and never needs this type.
 * @typeParam TItem Type of the items.
 * @typeParam TCaps Keys the source guarantees.
 * @typeParam TKey The key of the property.
 */
export type DataSourceCapabilityProperty<
  TItem,
  TCaps extends DataSourceCapability,
  TKey extends DataSourceCapability,
> = TKey extends TCaps
  ? DataSourceCapabilities<TItem>[TKey]
  : DataSourceCapabilities<TItem>[TKey] | undefined;

/**
 * Events of a {@link DataSource}.
 */
export type DataSourceEvents<TItem = Any> = EventsDefinition & {
  /**
   * A read failed: the error, raised right before {@link DataSource.read}
   * rethrows it. Never raised for a superseded read.
   */
  error: [unknown];
  /**
   * The first read of a burst started (`true`) or the latest one settled
   * (`false`), successfully or not: a read superseded by a newer one raises
   * nothing.
   */
  isReading: [boolean];
  /** The latest read succeeded: the new items. */
  items: [List<TItem>];
};

/**
 * Extensions of a data source by key: the record given to
 * {@link createDataSource} and to the constructor of {@link DataSource}. A key
 * whose value may be `undefined` is not a capability of the source: the
 * extension is exposed when set, but the type does not guarantee it.
 * @example
 * ```ts
 * const extensions: DataSourceExtensions<User> = { filtering, pagination };
 * ```
 * @typeParam TItem Type of the items.
 */
export type DataSourceExtensions<TItem = Any> = Partial<
  DataSourceCapabilities<TItem>
>;

/**
 * The capabilities a record of extensions guarantees: the keys of `TExt` that
 * are known capabilities and whose value type does not admit `undefined`.
 * `{ filtering: FilterExtension<User>; pagination: PaginationExtension<User> | undefined }`
 * gives `"filtering"`. It is the `TCaps` {@link createDataSource} infers.
 * @typeParam TExt Record of extensions by key.
 */
export type DefinedCapabilities<TExt> = {
  [TKey in keyof TExt & DataSourceCapability]-?: undefined extends TExt[TKey]
    ? never
    : TKey;
}[keyof TExt & DataSourceCapability];

/**
 * Query built by the extensions and given to the readers.
 */
export type DataSourcePayload<TItem = Any> = QueryItemsPayload<TItem>;

/**
 * Function that resolves a payload into a result: the items of the data
 * source, or anything else an extension needs (e.g. the total count). The
 * same as `QueryItemsReader`, named from the data source's point of view:
 * the optional `signal` is aborted when the read is superseded by a newer
 * one, so a reader can hand it to `fetch`.
 * @example
 * ```ts
 * const readUsers: DataSourceReader<User> = (payload, signal) =>
 *   fetch("/users", { body: JSON.stringify(payload), method: "POST", signal }).then((a) => a.json());
 * ```
 */
export type DataSourceReader<
  TItem = Any,
  TResult = List<TItem>,
> = QueryItemsReader<TItem, TResult>;
