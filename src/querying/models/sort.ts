import { KeyOf } from "@mantlebee/ts-core";

import { ISortPartialStep, ISortStep } from "../interfaces";
import { QueryableDataSource } from "./datasource";
import { TakePartialStep } from "./take";

export class SortPartialStep<T> extends TakePartialStep<T>
  implements ISortPartialStep<T> {
  public sortBy(fieldName: KeyOf<T>): ISortStep<T> {
    this.dataSource.sortPlugin.sortBy(fieldName);
    return new SortStep(this.dataSource, fieldName);
  }
}

export class SortStep<T> extends TakePartialStep<T> implements ISortStep<T> {
  private readonly fieldName: KeyOf<T>;

  public constructor(dataSource: QueryableDataSource<T>, fieldName: KeyOf<T>) {
    super(dataSource);
    this.fieldName = fieldName;
  }

  public asc(): ISortPartialStep<T> {
    this.dataSource.sortPlugin.sortBy(this.fieldName, true);
    return new SortPartialStep(this.dataSource);
  }
  public desc(): ISortPartialStep<T> {
    this.dataSource.sortPlugin.sortBy(this.fieldName, true);
    return new SortPartialStep(this.dataSource);
  }
}
