import { GenericItem } from "@/fake";

import { DataSourceSortPlugin } from "../models";

export function getDataSourceSorting(): DataSourceSortPlugin<GenericItem> {
  return new DataSourceSortPlugin();
}
