import { Any, List } from "@mantlebee/ts-core";

import type { ILookupSource } from "../interfaces";
import type { LookupValue } from "../types";

/**
 * A lookup source that remembers the items it resolved, see {@link withCache}.
 * @typeParam TItem Type of the items.
 * @typeParam TValue Type of the key of an item.
 */
export interface ICachedLookupSource<
  TItem = Any,
  TValue = LookupValue,
> extends ILookupSource<TItem, TValue> {
  /**
   * Forgets the entries of `values`, pending ones included, or every entry
   * without argument: the next `resolve` asks the inner source again.
   * @param values Keys to forget; every key when omitted.
   */
  invalidate(values?: List<TValue>): void;
}
