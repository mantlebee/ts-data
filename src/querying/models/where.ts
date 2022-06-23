import { KeyOf, Any, List } from "@mantlebee/ts-core";

import { FiltersExpression, FilterOperations } from "@/browsing";

import { IWherePartialStep, IWhereStep } from "../interfaces";
import { onAnd, onOr } from "../utils";
import { QueryableDataSource } from "./datasource";
import { SortPartialStep } from "./sort";

export class WherePartialStep<T> extends SortPartialStep<T>
  implements IWherePartialStep<T> {
  private readonly key: KeyOf<T>;
  private readonly filtersExpression: FiltersExpression<T>;

  public constructor(
    dataSource: QueryableDataSource<T>,
    key: KeyOf<T>,
    filtersExpression: FiltersExpression<T>
  ) {
    super(dataSource);
    this.filtersExpression = filtersExpression;
    this.key = key;
  }

  public contains(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.contains,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isContainedIn(...values: List<Any>): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.in,
        value: values,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isFalse(): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: false,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isGreaterThan(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThan,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isGreaterThanOrEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isLessThan(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThan,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isLessThanOrEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isNotContainedIn(...values: List<Any>): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notIn,
        value: values,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isNotEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public isTrue(): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: true,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
  public notContains(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notContains,
        value,
      },
      this.filtersExpression
    );
    return new WhereStep(this.dataSource);
  }
}

export class WhereStep<T> extends SortPartialStep<T> implements IWhereStep<T> {
  public and(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onAnd(dataSource.filterPlugin);
    return new WherePartialStep(dataSource, key, filtersExpression);
  }
  public or(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onOr(dataSource.filterPlugin);
    return new WherePartialStep(dataSource, key, filtersExpression);
  }
}
