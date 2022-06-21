import { Any, List } from "@mantlebee/ts-core";

import { FilterOperations, FilterOperators } from "./constants";

export type Filter<TItem> = {
  field: keyof TItem;
  operation: FilterOperations;
  value: Any;
};
export type FiltersExpression<TItem> = {
  operator: FilterOperators;
  filters: List<Filter<TItem>>;
  childExpressions: List<FiltersExpression<TItem>>;
};
