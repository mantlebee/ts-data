import { Any, Dictionary, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload, QueryItemsReader } from "@/query-items";

import type { IFilterExtension } from "./filtering/interfaces";
import type { IDataSourceExtension } from "./interfaces";
import type { IPaginationExtension } from "./pagination/interfaces";
import type { IProjectionExtension } from "./projection/interfaces";
import type { ISortExtension } from "./sorting/interfaces";

/**
 * The extensions shipped with the package, by key, each one typed with its
 * **interface**: a `FilterExtensionWithFixedFilters` is a `filtering`, a
 * `SingleSortExtension` is a `sorting`. These keys are always part of the
 * type of a data source, as optional properties when not guaranteed, and run
 * first in the pipeline, in the order of {@link DataSourceCapabilitiesOrder}.
 * A consumer adds its own keys per source, in the record given to
 * {@link createDataSource}: nothing to register here.
 * @typeParam TItem Type of the items.
 */
export type DataSourceCapabilities<TItem = Any> = {
  filtering: IFilterExtension<TItem>;
  pagination: IPaginationExtension<TItem>;
  projection: IProjectionExtension<TItem>;
  sorting: ISortExtension<TItem>;
};

/**
 * A key of {@link DataSourceCapabilities}: `"filtering"`, `"pagination"`,
 * `"projection"` or `"sorting"`.
 */
export type DataSourceCapability = keyof DataSourceCapabilities;

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
 * Options of a {@link DataSourceExtension}.
 */
export type DataSourceExtensionOptions = {
  /**
   * Milliseconds of quiet time before the debounced `*Change` event of the
   * extension is raised. Default {@link DataSourceExtensionChangeDelayDefault}.
   */
  changeDelay?: number;
};

/**
 * The shape of the extensions of a data source: a record from a key to an
 * extension, like `EventsDefinition` of ts-core for the events. A key of
 * {@link DataSourceCapabilities} must hold its interface (a `filtering` is an
 * `IFilterExtension`), any other key holds a custom extension; a value that
 * may be `undefined` is an extension the source may lack. Written as a type
 * literal (an interface has no implicit index signature, so it would not
 * satisfy the constraint).
 * @example
 * ```ts
 * type UsersExtensions = {
 *   filtering: IFilterExtension<User>;
 *   pagination: IPaginationExtension<User>;
 *   distinct?: DistinctExtension<User>;
 * };
 * ```
 * @typeParam TItem Type of the items.
 */
export type DataSourceExtensionsDefinition<TItem = Any> = Dictionary<
  IDataSourceExtension<TItem> | undefined
> &
  Partial<DataSourceCapabilities<TItem>>;

/**
 * The keyed properties of a data source whose extensions are `TExt`: the
 * keys whose value cannot be `undefined` as required readonly properties,
 * the keys whose value may be `undefined` as optional ones (without the
 * `undefined`), and every key of {@link DataSourceCapabilities} not in
 * `TExt` as an optional one, to narrow on. The capability part of
 * {@link IDataSource}.
 * @typeParam TItem Type of the items.
 * @typeParam TExt Record of the extensions by key.
 */
export type DataSourceExtensionProperties<TItem, TExt> = {
  readonly [
    TKey in keyof TExt as undefined extends TExt[TKey] ? never : TKey
  ]: TExt[TKey];
} & {
  readonly [
    TKey in keyof TExt as undefined extends TExt[TKey] ? TKey : never
  ]?: Exclude<TExt[TKey], undefined>;
} & {
  readonly [
    TKey in Exclude<DataSourceCapability, keyof TExt>
  ]?: DataSourceCapabilities<TItem>[TKey];
};

/**
 * Resolves the second type argument of {@link IDataSource}: a union of
 * {@link DataSourceCapability} is a shorthand for the record picking those
 * keys from {@link DataSourceCapabilities}, any record is taken as it is.
 * `IDataSource<User, "filtering" | "pagination">` is
 * `IDataSource<User, { filtering: IFilterExtension<User>; pagination: IPaginationExtension<User> }>`.
 * @typeParam TItem Type of the items.
 * @typeParam TExt Record of the extensions by key, or keys of the package ones.
 */
export type DataSourceExtensionsOf<
  TItem,
  TExt extends DataSourceExtensionsDefinition<TItem> | DataSourceCapability,
> = [TExt] extends [DataSourceCapability]
  ? Pick<DataSourceCapabilities<TItem>, Extract<TExt, DataSourceCapability>>
  : TExt;

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
