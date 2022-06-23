import { ITakePartialStep, ITakeStep, ISelectPartialStep } from "../interfaces";
import { SelectPartialStep } from "./select";

export class TakePartialStep<T> extends SelectPartialStep<T>
  implements ITakePartialStep<T> {
  public take(itemsCount: number): ITakeStep<T> {
    this.dataSource.skipTopPlugin.setTop(itemsCount);
    return new TakeStep(this.dataSource);
  }
  public takeAll(): ITakeStep<T> {
    return new TakeStep(this.dataSource);
  }
}

export class TakeStep<T> extends SelectPartialStep<T> implements ITakeStep<T> {
  public startingFrom(skipItemsCount: number): ISelectPartialStep<T> {
    this.dataSource.skipTopPlugin.setSkip(skipItemsCount);
    return new SelectPartialStep(this.dataSource);
  }
}
