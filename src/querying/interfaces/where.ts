import { Any, List, KeyOf } from "@mantlebee/ts-core";

import { ISortPartialStep } from "./sort";

export interface IWherePartialStep<T> {
  contains(value: Any): IWhereStep<T>;
  isContainedIn(...values: List<Any>): IWhereStep<T>;
  isEqualTo(value: Any): IWhereStep<T>;
  isFalse(): IWhereStep<T>;
  isGreaterThan(value: Any): IWhereStep<T>;
  isGreaterThanOrEqualTo(value: Any): IWhereStep<T>;
  isLessThan(value: Any): IWhereStep<T>;
  isLessThanOrEqualTo(value: Any): IWhereStep<T>;
  isNotContainedIn(...values: List<Any>): IWhereStep<T>;
  isNotEqualTo(value: Any): IWhereStep<T>;
  isTrue(): IWhereStep<T>;
  notContains(value: Any): IWhereStep<T>;
}
export interface IWhereStep<T> extends ISortPartialStep<T> {
  and(fieldName: KeyOf<T>): IWherePartialStep<T>;
  or(fieldName: KeyOf<T>): IWherePartialStep<T>;
}
