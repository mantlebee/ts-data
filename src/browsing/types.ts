import { List } from "@mantlebee/ts-core";

import { FiltersExpression } from "./filtering";
import { Select } from "./selecting";
import { Sort } from "./sorting";

export type BrowseItemsPayload<TItem> = {
  filters?: FiltersExpression<TItem>;
  selects?: List<Select<TItem>>;
  sorts?: List<Sort<TItem>>;
  skip?: number;
  top?: number;
};
