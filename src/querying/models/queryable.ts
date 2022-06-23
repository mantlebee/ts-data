import { KeyOf } from "@mantlebee/ts-core";

import { IQueryable, ISortPartialStep, IWherePartialStep } from "../interfaces";
import { onWhere } from "../utils";
import { QueryableDataSource } from "./datasource";
import { SortPartialStep } from "./sort";
import { WherePartialQuery } from "./where";

export class Queryable<T> implements IQueryable<T> {
  private readonly dataSource: QueryableDataSource<T>;

  public constructor(dataSource: QueryableDataSource<T>) {
    this.dataSource = dataSource;
  }

  public all(): ISortPartialStep<T> {
    return new SortPartialStep(this.dataSource);
  }
  public where(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onWhere(dataSource.filterPlugin);
    return new WherePartialQuery(dataSource, key, filtersExpression);
  }
}
