import { List } from "@mantlebee/ts-core";

import { FilterOperations, FilterOperators } from "./constants";

export type Filter<TItem> = {
  field: keyof TItem;
  operation: FilterOperations;
  value: TItem[keyof TItem];
};
export type FiltersExpression<TItem> = {
  operator: FilterOperators;
  filters: List<Filter<TItem>>;
  childExpressions: List<FiltersExpression<TItem>>;
};
