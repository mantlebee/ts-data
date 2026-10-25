import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload } from "@/query-items";

export type DataSourceEvents<TItem = Any> = EventsDefinition & {
  isReading: [boolean];
  items: [List<TItem>];
};

export type DataSourcePayload<TItem = Any> = QueryItemsPayload<TItem>;

export type DataSourceReader<TItem = Any, TResult = TItem[]> = (
  payload: DataSourcePayload<TItem>,
) => Promise<TResult>;
