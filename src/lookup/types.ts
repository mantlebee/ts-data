import { Any, KeyOf, List } from "@mantlebee/ts-core";

/**
 * Default type of the key of a lookup item. The keys are compared with
 * `===` (the `in` filter of a reader, the entries of a cache, the values of a
 * batch), so keep them primitives: an object, or a reactive proxy of it, is
 * never equal to another instance.
 */
export type LookupValue = number | string;

/**
 * Page asked to {@link ILookupSource.search}, by offset: a panel knows how
 * many items it shows and how many it already has.
 *
 * The sources over a reader ({@link createLookupSource},
 * {@link createInMemoryLookupSource}) translate it into the 1-based,
 * page-based `Pagination` of the payload, so `offset` must be a multiple of
 * `limit`: page by the same `limit` from `0` (`0`, `limit`, `2 * limit`,
 * ...). Their `search` rejects with a `RangeError`, without calling the
 * reader, when `limit` is not a positive integer or `offset` is not a
 * non-negative multiple of it. A hand-written {@link ILookupSource} may
 * accept any offset.
 * @example
 * ```ts
 * await source.search("ro", { limit: 20, offset: 40 }); // the third page
 * await source.search("ro", { limit: 20, offset: 30 }); // rejects: RangeError
 * ```
 */
export type LookupPage = {
  /** Number of items of the page, a positive integer. */
  limit: number;
  /**
   * Index of the first item, a multiple of `limit` (`0` for the first page)
   * for the sources over a reader.
   */
  offset: number;
};

/**
 * Result of {@link ILookupSource.search}: a page and whether another follows.
 * @typeParam TItem Type of the items.
 */
export type LookupSearchResult<TItem = Any> = {
  /** `true` when the page after this one may hold items. */
  hasMore: boolean;
  /** Items of the page, in the order of the source. */
  items: List<TItem>;
};

/**
 * Fields a reader-based lookup source works on, see {@link createLookupSource}.
 * @typeParam TItem Type of the items.
 * @typeParam TValueField Field holding the key of an item.
 */
export type LookupReaderOptions<
  TItem = Any,
  TValueField extends KeyOf<TItem> = KeyOf<TItem>,
> = {
  /** Field the `contains` filter of `search` is written on. */
  textField: KeyOf<TItem>;
  /** Field holding the key: what `valueOf` returns and the `in` filter of `resolve` is written on. */
  valueField: TValueField;
};
