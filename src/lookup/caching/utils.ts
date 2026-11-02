import { List, Undefinable } from "@mantlebee/ts-core";

import type { ILookupSource } from "../interfaces";
import { abortable } from "../internals";
import type { ICachedLookupSource } from "./interfaces";

/**
 * Memoizes the item of each resolved value for the life of the source, so a
 * department shown in twenty rows and on every page is asked once: a
 * `resolve` sends the inner source only the values it has never seen, a
 * value being resolved is shared by every caller asking for it meanwhile, a
 * value the inner source does not return is remembered as missing, and a
 * rejected resolution is forgotten, so the next call tries again.
 * {@link ICachedLookupSource.invalidate} forgets entries by hand. `search`
 * and `valueOf` are untouched.
 *
 * **Signal.** The call of the inner source runs without a signal: its result
 * fills the cache even for a caller that no longer wants it, and one
 * caller's abort must not starve the others sharing the resolution. The
 * aborted caller alone rejects with `AbortedException`, at once.
 *
 * Compose it outside {@link withBatching}, `withCache(withBatching(source))`:
 * the misses of the cache are what the batch coalesces.
 * @typeParam TItem Type of the items.
 * @typeParam TValue Type of the key of an item.
 * @param source Source to decorate.
 * @returns a source with the same contract, caching `resolve`, plus `invalidate`.
 * @example
 * ```ts
 * const departments = withCache(withBatching(createLookupSource(readDepartments, { textField: "name", valueField: "id" })));
 * await departments.resolve([1, 2]); // one request
 * await departments.resolve([2, 3]); // one request, for 3 only
 * departments.invalidate([2]); // 2 is asked again next time
 * ```
 */
export function withCache<TItem, TValue>(
  source: ILookupSource<TItem, TValue>,
): ICachedLookupSource<TItem, TValue> {
  /** The item of each value asked so far, pending or settled; `undefined` for a missing one. */
  const entries = new Map<TValue, Promise<Undefinable<TItem>>>();

  /** Asks the inner source the values and registers an entry for each. */
  const ask = (values: List<TValue>): void => {
    const found = source.resolve(values).then((items) => {
      const byValue = new Map<TValue, TItem>();
      for (const item of items) byValue.set(source.valueOf(item), item);
      return byValue;
    });
    for (const value of values) {
      const entry = found.then((byValue) => byValue.get(value));
      // A rejected entry is forgotten, unless it was already replaced
      // (invalidated and asked again meanwhile).
      entry.catch(() => {
        if (entries.get(value) === entry) entries.delete(value);
      });
      entries.set(value, entry);
    }
  };

  return {
    invalidate: (values) => {
      if (!values) entries.clear();
      else for (const value of values) entries.delete(value);
    },
    resolve: (values, signal) =>
      abortable(signal, async () => {
        if (!values.length) return [];
        const distinct = Array.from(new Set(values));
        const misses = distinct.filter((value) => !entries.has(value));
        if (misses.length) ask(misses);
        // The entries are taken now: an invalidation while awaiting must not
        // turn a value of this call into a miss of another.
        const taken = distinct.map(
          (value) => entries.get(value) as Promise<Undefinable<TItem>>,
        );
        // `Promise.all` types its result with `Awaited`, which a generic
        // `TItem` cannot be told to equal: the entries are what they are.
        const items = (await Promise.all(taken)) as List<Undefinable<TItem>>;
        return items.filter((item): item is TItem => item !== undefined);
      }),
    search: (query, page, signal) => source.search(query, page, signal),
    valueOf: (item) => source.valueOf(item),
  };
}
