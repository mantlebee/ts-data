import { GenericItem } from "@/fake";

import { DataSourceSortingPlugin } from "../models";

export function getDataSourceSorting(): DataSourceSortingPlugin<GenericItem> {
  return new DataSourceSortingPlugin();
}
