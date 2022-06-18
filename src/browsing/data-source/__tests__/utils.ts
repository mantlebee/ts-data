import { List } from "@mantlebee/ts-core";

import { BrowseItemsPayload } from "@/browsing";
import { GenericItem, GenericItems } from "@/fake";

import { IDataSourcePlugin } from "../interfaces";
import { DataSource, DataSourcePlugin } from "../models";

export function getDataSource(
  timeout = 0,
  plugins: List<IDataSourcePlugin<GenericItem>> = []
): DataSource<GenericItem> {
  return new DataSource(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(GenericItems), timeout);
      }),
    plugins
  );
}

export function getDataSourcePlugin(): DataSourcePlugin<GenericItem> {
  return new DataSourcePlugin();
}

export function getPayload(): BrowseItemsPayload<GenericItem> {
  return {};
}
