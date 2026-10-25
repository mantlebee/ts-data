import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { FilterLogics, FilterOperators } from "./constants";

export type Filter<TItem = Any> = {
  field: KeyOf<TItem>;
  operator: FilterOperators;
  value: null | TItem[KeyOf<TItem>];
};

export type FiltersExpression<TItem = Any> = {
  logic: FilterLogics;
  filters: List<Filter<TItem>> | FiltersExpression<TItem>[];
};
