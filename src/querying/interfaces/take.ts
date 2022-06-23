import { ISelectPartialStep } from "./select";

export interface ITakePartialStep<T> extends ISelectPartialStep<T> {
  takeAll(): ITakeStep<T>;
  take(itemsCount: number): ITakeStep<T>;
}

export interface ITakeStep<T> extends ISelectPartialStep<T> {
  startingFrom(skipItemsCount: number): ISelectPartialStep<T>;
}
