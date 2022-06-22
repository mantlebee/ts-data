import { Any, KeyOf, List } from "@mantlebee/ts-core";

//#region Read
export interface IReadStep<T> {
  read(): Promise<List<T>>;
}
//#endregion

//#region Select
export interface ISelectPartialStep<T> extends IReadStep<T> {
  add(value: Any): ISelectAliasStep<T>;
  select(fieldName: KeyOf<T>, ...fieldNames: List<KeyOf<T>>): ISelectStep<T>;
}
export interface ISelectAliasStep<T> {
  as(alias: string): ISelectPartialStep<T>;
}
export interface ISelectStep<T>
  extends ISelectAliasStep<T>,
    ISelectPartialStep<T> {}
//#endregion

//#region Sort
export interface ISortPartialStep<T> extends ITakePartialStep<T> {
  sortBy(fieldName: KeyOf<T>): ISortStep<T>;
}
export interface ISortStep<T> extends ITakePartialStep<T> {
  asc(): ISortPartialStep<T>;
  desc(): ISortPartialStep<T>;
}
//#endregion

//#region Take
export interface ITakePartialStep<T> extends ISelectPartialStep<T> {
  takeAll(): ITakeStep<T>;
  take(itemsCount: number): ITakeStep<T>;
}
export interface ITakeStep<T> extends ISelectPartialStep<T> {
  startingFrom(skipItemsCount: number): ISelectPartialStep<T>;
}
//#endregion

//#region Where
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
//#endregion

export interface IQueryable<T> {
  all(): ISortPartialStep<T>;
  where(fieldName: KeyOf<T>): IWherePartialStep<T>;
}
