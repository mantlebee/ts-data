import { KeyOf } from "@mantlebee/ts-core";

import { ISortPartialStep } from "./sort";
import { IWherePartialStep } from "./where";

export interface IQueryable<T> {
  all(): ISortPartialStep<T>;
  where(fieldName: KeyOf<T>): IWherePartialStep<T>;
}
