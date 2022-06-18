import { BrowseItemsPayload } from "@/browsing";

export type TotalCountReadDelegate<TItem> = (
  payload: BrowseItemsPayload<TItem>
) => Promise<number>;
