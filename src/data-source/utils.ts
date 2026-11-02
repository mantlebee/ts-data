import { IDataSource } from "./interfaces";
import { DataSource } from "./models";
import { DataSourceExtensionsDefinition, DataSourceReader } from "./types";

/**
 * Builds a {@link DataSource} whose type carries its extensions: the record
 * given here, key by key ({@link IDataSource}). It is the way to build a
 * source: the class cannot type its members from a generic record, so
 * `new DataSource(...)` only knows the four keys of the package, as optional
 * properties.
 *
 * The pipeline order is canonical, whatever the key order of the record:
 * `filtering`, `sorting`, `pagination`, `projection`, then the custom keys in
 * insertion order of the record.
 * @example
 * ```ts
 * const users = createDataSource(readUsers, { filtering, pagination, distinct });
 * // IDataSource<User, { filtering: FilterExtension<User>; pagination: PaginationExtension<User>; distinct: DistinctExtension<User> }>
 * users.filtering.addFilter(adult);
 * users.distinct; // a custom key, typed
 * if (users.sorting) users.sorting.addSort(byName); // a key of the package not given: optional
 *
 * const maybeSorting: SortExtension<User> | undefined = options.sortable
 *   ? new SortExtension<User>()
 *   : undefined;
 * const products = createDataSource(readProducts, { filtering, sorting: maybeSorting });
 * products.sorting; // SortExtension<User> | undefined: a value that may be undefined is optional
 * ```
 * @typeParam TItem Type of the items, inferred from the reader.
 * @typeParam TExt Record of the extensions by key, inferred from `extensions`.
 * @param reader Resolves the payload into the items; receives the signal of
 * the read as second argument.
 * @param extensions Extensions by key; `{}` for none.
 * @returns the data source, typed with the extensions of the record.
 */
export function createDataSource<
  TItem,
  TExt extends DataSourceExtensionsDefinition<TItem>,
>(reader: DataSourceReader<TItem>, extensions: TExt): IDataSource<TItem, TExt> {
  // The class declares the four keys of the package only; the custom keys
  // are own properties set by the constructor, which the type of the record
  // describes exactly (see the type specs).
  return new DataSource<TItem>(reader, extensions) as unknown as IDataSource<
    TItem,
    TExt
  >;
}
