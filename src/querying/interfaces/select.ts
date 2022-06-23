import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { IReadStep } from "./read";

export interface ISelectAliasStep<T> {
  as(alias: string): ISelectPartialStep<T>;
}

export interface ISelectPartialStep<T> extends IReadStep<T> {
  add(value: Any): ISelectAliasStep<T>;
  select(fieldName: KeyOf<T>, ...fieldNames: List<KeyOf<T>>): ISelectStep<T>;
}

export interface ISelectStep<T>
  extends ISelectAliasStep<T>,
    ISelectPartialStep<T> {}
