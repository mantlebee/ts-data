import { List } from "@mantlebee/ts-core";

import { BrowseItemsPayload } from "@/browsing";

import { IDataSourcePlugin } from "./interfaces";

export function getDataSourceReadPayload<TItem>(
  plugins: List<IDataSourcePlugin<TItem>>
): Promise<BrowseItemsPayload<TItem>> {
  const payload: BrowseItemsPayload<TItem> = {};
  const promises: List<Promise<BrowseItemsPayload<TItem>>> = [];
  plugins.forEach((a) => {
    if (a.isEnabled && a.beforeRead) promises.push(a.beforeRead(payload));
  });
  return Promise.all(promises).then((results) =>
    results.reduce((result, current) => {
      return { ...result, ...current };
    }, payload)
  );
}
