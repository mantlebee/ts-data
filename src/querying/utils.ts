import {
  FilterOperators,
  FiltersExpression,
  IDataSourceFilterPlugin,
} from "@/browsing";

function createFiltersExpression<TItem>(): FiltersExpression<TItem> {
  return {
    childExpressions: [],
    filters: [],
    operator: FilterOperators.and,
  };
}

export function onAnd<TItem>(
  filterPlugin: IDataSourceFilterPlugin<TItem>
): FiltersExpression<TItem> {
  const { filtersExpression } = filterPlugin;
  const { childExpressions } = filtersExpression;
  return childExpressions[childExpressions.length - 1];
}

export function onOr<TItem>(
  filterPlugin: IDataSourceFilterPlugin<TItem>
): FiltersExpression<TItem> {
  const { filtersExpression } = filterPlugin;
  const childExpression = createFiltersExpression<TItem>();
  filtersExpression.childExpressions.push(childExpression);
  return childExpression;
}

export function onWhere<TItem>(
  filterPlugin: IDataSourceFilterPlugin<TItem>
): FiltersExpression<TItem> {
  const { filtersExpression } = filterPlugin;
  const childExpression: FiltersExpression<TItem> = createFiltersExpression();
  filtersExpression.childExpressions.push(childExpression);
  filtersExpression.operator = FilterOperators.or;
  return childExpression;
}
