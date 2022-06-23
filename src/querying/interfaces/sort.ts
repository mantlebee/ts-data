import { KeyOf } from "@mantlebee/ts-core";

import { ITakePartialStep } from "./take";

export interface ISortPartialStep<T> extends ITakePartialStep<T> {
  sortBy(fieldName: KeyOf<T>): ISortStep<T>;
}
export interface ISortStep<T> extends ITakePartialStep<T> {
  asc(): ISortPartialStep<T>;
  desc(): ISortPartialStep<T>;
}
