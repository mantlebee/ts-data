import { Any, List } from "@mantlebee/ts-core";

import type { FiltersExpression } from "./filtering";
import type { Paging } from "./pagination";
import type { Projection } from "./projection";
import type { Sort } from "./sorting";

export type QueryItemsPayload<TItem = Any> = {
  distinct?: boolean;
  filters?: FiltersExpression<TItem>;
  paging?: Paging;
  projections?: List<Projection<TItem>>;
  sorts?: List<Sort<TItem>>;
};
