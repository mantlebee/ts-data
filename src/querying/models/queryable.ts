import { KeyOf } from "@mantlebee/ts-core";

import { IQueryable, ISortPartialStep, IWherePartialStep } from "../interfaces";
import { onWhere } from "../utils";
import { BaseStep } from "./base";
import { SortPartialStep } from "./sort";
import { WherePartialStep } from "./where";

export class Queryable<T> extends BaseStep<T> implements IQueryable<T> {
  public all(): ISortPartialStep<T> {
    return new SortPartialStep(this.dataSource);
  }
  public where(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onWhere(dataSource.filterPlugin);
    return new WherePartialStep(dataSource, key, filtersExpression);
  }
}
