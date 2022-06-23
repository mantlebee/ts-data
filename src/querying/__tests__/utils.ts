import { BrowseItemsPayload } from "@/browsing";
import { GenericItem } from "@/fake";

import { QueryableDataSource } from "../models";

export function getDataSourceAndPayload() {
  let payload: BrowseItemsPayload<GenericItem> = {};
  const dataSource = new QueryableDataSource<GenericItem>((a) => {
    payload = a;
    return Promise.resolve([]);
  });
  const getPayload = () => payload;
  return { dataSource, getPayload };
}
