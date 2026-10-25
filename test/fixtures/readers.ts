import { List } from "@mantlebee/ts-core";

import { DataSourcePayload, DataSourceReader } from "@/data-source";

/**
 * Reader that records every payload it receives.
 * @typeParam TItem Type of the items.
 * @typeParam TResult Type of the result.
 */
export type RecordingReader<TItem, TResult> = {
  /**
   * Payloads received so far, oldest first. Each one is a shallow copy taken
   * when the reader was called: the extensions after the reader mutate the
   * same payload object, so a reference would not tell what the reader saw.
   */
  payloads: List<DataSourcePayload<TItem>>;
  reader: DataSourceReader<TItem, TResult>;
};

/**
 * Count reader that always resolves `count` and records the payloads.
 * @param count Total count to resolve.
 */
export function createCountReader<TItem>(
  count: number,
): RecordingReader<TItem, number> {
  const payloads: List<DataSourcePayload<TItem>> = [];
  return {
    payloads,
    reader: async (payload) => {
      payloads.push({ ...payload });
      return count;
    },
  };
}

/**
 * Items reader that serves `items` applying only the `paging` of the payload
 * (filters, sorts and projections are recorded, not applied) and records the
 * payloads.
 * @param items Items to serve, in order.
 */
export function createItemsReader<TItem>(
  items: List<TItem>,
): RecordingReader<TItem, List<TItem>> {
  const payloads: List<DataSourcePayload<TItem>> = [];
  return {
    payloads,
    reader: async (payload) => {
      payloads.push({ ...payload });
      const paging = payload.paging;
      if (!paging) return items;
      const start = (paging.page - 1) * paging.itemsPerPage;
      return items.slice(start, start + paging.itemsPerPage);
    },
  };
}
