import { GenericItem } from "@/fake";

import { DataSourcePaginationPlugin } from "../models";
import { TotalCountReadDelegate } from "../types";
import { ITEMS_PER_PAGE, TOTAL_ITEMS_COUNT } from "./constants";

export function getDataSourcePagination(
  itemsPerPage: number = ITEMS_PER_PAGE
): DataSourcePaginationPlugin<GenericItem> {
  return new DataSourcePaginationPlugin(itemsPerPage, totalCountReadDelegate);
}

export const totalCountReadDelegate: TotalCountReadDelegate<GenericItem> = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve(TOTAL_ITEMS_COUNT));
  });
