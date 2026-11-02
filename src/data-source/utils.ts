import { DataSourceExtensionsDefinition } from "./extensions/types";
import { IDataSource } from "./interfaces";
import { DataSource } from "./models";
import { DataSourceReader } from "./types";

/**
 * Builds a data source whose type carries its extensions: the record given
 * here, key by key ({@link IDataSource}). It is the only way to build a
 * source: the class behind it is not exported, since a class cannot type its
 * members from a generic record.
 *
 * The extensions run in the order of the keys of the record, the order you
 * write them in: `filtering` before `pagination`, so the count reader
 * receives the filters.
 * @example
 * ```ts
 * const users = createDataSource(readUsers, { filtering, pagination, distinct });
 * // IDataSource<User, { filtering: FilterExtension<User>; pagination: PaginationExtension<User>; distinct: DistinctExtension<User> }>
 * users.filtering.addFilter(adult);
 * users.distinct; // a custom key, typed
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
 * @param extensions Extensions by key, run in this order; `{}` for none.
 * @returns the data source, typed with the extensions of the record.
 */
export function createDataSource<
  TItem,
  TExt extends DataSourceExtensionsDefinition<TItem>,
>(reader: DataSourceReader<TItem>, extensions: TExt): IDataSource<TItem, TExt> {
  // The keyed properties are own properties set by the constructor, which
  // the type of the record describes exactly (see the type specs).
  return new DataSource<TItem>(reader, extensions) as unknown as IDataSource<
    TItem,
    TExt
  >;
}
