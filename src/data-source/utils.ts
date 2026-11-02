import { List } from "@mantlebee/ts-core";

import { IDataSource, IDataSourceExtension } from "./interfaces";
import { DataSource } from "./models";
import {
  DataSourceExtensions,
  DataSourceReader,
  DefinedCapabilities,
} from "./types";

/**
 * Builds a {@link DataSource} whose type states its capabilities: the keys of
 * `extensions` whose value cannot be `undefined` ({@link DefinedCapabilities}).
 * It is the public way to build a source: a class constructor cannot infer
 * its type parameters from a record this way, so `new DataSource(...)` gives
 * an `IDataSource<TItem>` guaranteeing nothing unless the capabilities are
 * written by hand.
 *
 * The pipeline order is canonical, whatever the key order of the record:
 * `filtering`, `sorting`, `pagination`, `projection`, then `others` in array
 * order, then the augmented keys in insertion order of the record.
 * @example
 * ```ts
 * const users = createDataSource(readUsers, { filtering, pagination });
 * // IDataSource<User, "filtering" | "pagination">
 * users.filtering.addFilter(adult);
 * if (users.sorting) users.sorting.addSort(byName); // optional: not given
 *
 * const maybeSorting: SortExtension<User> | undefined = options.sortable
 *   ? new SortExtension<User>()
 *   : undefined;
 * const products = createDataSource(readProducts, { filtering, sorting: maybeSorting });
 * // IDataSource<Product, "filtering">: a key that may be undefined is not guaranteed
 * ```
 * @typeParam TItem Type of the items, inferred from the reader.
 * @typeParam TExt Record of extensions by key, inferred from `extensions`.
 * @param reader Resolves the payload into the items; receives the signal of
 * the read as second argument.
 * @param extensions Extensions by key; `{}` for none.
 * @param others Extensions without a key (e.g. a custom one), run after the
 * keyed ones in array order.
 * @returns the data source, typed with the capabilities `extensions` defines.
 */
export function createDataSource<
  TItem,
  TExt extends DataSourceExtensions<TItem>,
>(
  reader: DataSourceReader<TItem>,
  extensions: TExt,
  others: List<IDataSourceExtension<TItem>> = [],
): IDataSource<TItem, DefinedCapabilities<TExt>> {
  // The class states its properties as conditional on `TCaps`, which
  // TypeScript cannot relate to the `Pick` of the interface while `TCaps` is
  // still generic; the two shapes agree for every concrete `TCaps` (see the
  // type specs).
  const source = new DataSource<TItem, DefinedCapabilities<TExt>>(
    reader,
    extensions,
    others,
  );
  return source as unknown as IDataSource<TItem, DefinedCapabilities<TExt>>;
}
