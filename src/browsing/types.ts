import { KeyOf, List } from "@mantlebee/ts-core";

import { FiltersExpression } from "./filtering";
import { Sort } from "./sorting";

export type BrowseItemsPayload<TItem> = {
  filters?: FiltersExpression<TItem>;
  select?: List<KeyOf<TItem>>;
  sorts?: List<Sort<TItem>>;
  skip?: number;
  top?: number;
};
