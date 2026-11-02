import { Any, Dictionary } from "@mantlebee/ts-core";

import type { IFilterExtension } from "../filtering/interfaces";
import type { IPaginationExtension } from "../pagination/interfaces";
import type { IProjectionExtension } from "../projection/interfaces";
import type { ISortExtension } from "../sorting/interfaces";
import type { IDataSourceExtension } from "./interfaces";

/**
 * The extensions shipped with the package, by key, each one typed with its
 * **interface**: a `FilterExtensionWithFixedFilters` is a `filtering`, a
 * `SingleSortExtension` is a `sorting`. The map behind
 * {@link IDataSourceWith}: `IDataSourceWith<User, "filtering">` guarantees a
 * `filtering` holding an `IFilterExtension<User>`. The keys are a
 * convention, nothing else: the data source does not know them, and a
 * consumer may use any key for any extension.
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
 * extension, like `EventsDefinition` of ts-core for the events. Any key holds
 * any extension of the item type; a value that may be `undefined` is an
 * extension the source may lack. The keys of {@link DataSourceCapabilities}
 * are not special here: the convention is enforced where a consumer asks for
 * them, through {@link IDataSourceWith}. Written as a type literal (an
 * interface has no implicit index signature, so it would not satisfy the
 * constraint).
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
>;

/**
 * The keyed properties a record of extensions gives to a data source: the
 * keys whose value cannot be `undefined` as required readonly properties,
 * the keys whose value may be `undefined` as optional ones (without the
 * `undefined`). Nothing else: a key not in the record is not a property.
 * The extensions part of {@link IDataSource}.
 * @typeParam TExt Record of the extensions by key.
 */
export type DataSourceExtensionProperties<TExt> = {
  readonly [
    TKey in keyof TExt as undefined extends TExt[TKey] ? never : TKey
  ]: TExt[TKey];
} & {
  readonly [
    TKey in keyof TExt as undefined extends TExt[TKey] ? TKey : never
  ]?: Exclude<TExt[TKey], undefined>;
};
