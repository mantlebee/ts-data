import { Any, KeyOf, List } from "@mantlebee/ts-core";

export interface IPartialQuery<T> {
  contains(value: Any): IQuery<T>;
  isContainedIn(value: Any): IQuery<T>;
  isEqualTo(value: Any): IQuery<T>;
  isFalse(): IQuery<T>;
  isGreaterThan(value: Any): IQuery<T>;
  isGreaterThanOrEqualTo(value: Any): IQuery<T>;
  isLessThan(value: Any): IQuery<T>;
  isLessThanOrEqualTo(value: Any): IQuery<T>;
  isTrue(): IQuery<T>;
}

export interface IQuery<T> {
  and(key: KeyOf<T>): IPartialQuery<T>;
  or(key: KeyOf<T>): IPartialQuery<T>;
  read(): Promise<List<T>>;
  select(...keys: List<KeyOf<T>>): IQuery<T>;
  sortBy(key: KeyOf<T>, asc: boolean): IQuery<T>;
  skip(skip: number): IQuery<T>;
  top(top: number): IQuery<T>;
}

export interface IQueryable<T> {
  all(): IQuery<T>;
  where(key: KeyOf<T>): IPartialQuery<T>;
}
