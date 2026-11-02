import { List } from "@mantlebee/ts-core";

import type { ILookupSource } from "../interfaces";
import { abortable } from "../internals";
import type { BatchingOptions } from "./types";

/**
 * Coalesces the `resolve` calls made in the same microtask into one call of
 * the inner source with the distinct values, so the fifty cells of a grid
 * page, each resolving its own key without knowing of the others, cost one
 * request instead of fifty. Each caller receives the items of its own values,
 * picked from the shared result with `valueOf`; a value the inner source does
 * not return is missing for every caller that asked for it; a rejected call
 * of the inner source rejects every caller of the batch. `search` and
 * `valueOf` are untouched.
 *
 * **Signal.** The call of the inner source runs without a signal: one
 * caller's abort must not starve the others. The aborted caller alone
 * rejects with `AbortedException`, at once.
 *
 * **Matching.** A caller gets the items whose `valueOf` is `===` to one of
 * its values: a source matching keys loosely (the in-memory one compares
 * strings case-insensitively by default) may return an item no caller
 * recognises; keep the keys primitive and exact.
 * @typeParam TItem Type of the items.
 * @typeParam TValue Type of the key of an item.
 * @param source Source to decorate.
 * @param options `chunkSize` to cap the values of one call of the inner source.
 * @returns a source with the same contract, batching `resolve`.
 * @example
 * ```ts
 * const departments = withBatching(createLookupSource(readDepartments, { textField: "name", valueField: "id" }));
 * // Rendered in the same tick, the cells share one `valueField in [1, 2]` request.
 * cell1.show(departments.resolve([1]));
 * cell2.show(departments.resolve([2]));
 * cell3.show(departments.resolve([1]));
 * ```
 */
export function withBatching<TItem, TValue>(
  source: ILookupSource<TItem, TValue>,
  options: BatchingOptions = {},
): ILookupSource<TItem, TValue> {
  const { chunkSize } = options;
  if (
    chunkSize !== undefined &&
    (!Number.isInteger(chunkSize) || chunkSize < 1)
  )
    throw new Error(
      `The chunk size of a batching lookup source must be a positive integer, got ${chunkSize}`,
    );

  /** The batch open for the current microtask, if any. */
  let batch: Batch<TItem, TValue> | undefined;

  /** Resolves the values of a batch, in chunks when asked, together. */
  const resolveAll = (values: List<TValue>): Promise<List<TItem>> => {
    if (!chunkSize || values.length <= chunkSize) return source.resolve(values);
    const chunks: List<List<TValue>> = [];
    for (let start = 0; start < values.length; start += chunkSize)
      chunks.push(values.slice(start, start + chunkSize));
    return Promise.all(chunks.map((chunk) => source.resolve(chunk))).then(
      (results) => ([] as List<TItem>).concat(...results),
    );
  };
  /**
   * The open batch, or a new one whose flush is already queued: the flush
   * reads the values collected until then and closes the batch, so the next
   * caller opens another.
   */
  const openBatch = (): Batch<TItem, TValue> => {
    if (batch) return batch;
    const values = new Set<TValue>();
    const current: Batch<TItem, TValue> = {
      items: new Promise((resolve, reject) => {
        queueMicrotask(() => {
          batch = undefined;
          resolveAll(Array.from(values)).then(resolve, reject);
        });
      }),
      values,
    };
    batch = current;
    return current;
  };

  return {
    resolve: (values, signal) =>
      abortable(signal, () => {
        if (!values.length) return Promise.resolve([]);
        const current = openBatch();
        for (const value of values) current.values.add(value);
        const asked = new Set(values);
        return current.items.then((items) =>
          items.filter((item) => asked.has(source.valueOf(item))),
        );
      }),
    search: (query, page, signal) => source.search(query, page, signal),
    valueOf: (item) => source.valueOf(item),
  };
}

//#region Internals
/** The calls of one microtask: their distinct values and the shared result. */
type Batch<TItem, TValue> = {
  /** The items of every value of the batch, once flushed. */
  items: Promise<List<TItem>>;
  /** The values collected so far. */
  values: Set<TValue>;
};
//#endregion
