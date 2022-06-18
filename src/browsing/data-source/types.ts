import { List } from "@mantlebee/ts-core";

import { BrowseItemsPayload } from "@/browsing";

export type DataSourceReadDelegate<TItem> = (
  payload: BrowseItemsPayload<TItem>
) => Promise<List<TItem>>;
