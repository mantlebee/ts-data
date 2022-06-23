import { List } from "@mantlebee/ts-core";

import { IReadStep } from "../interfaces";
import { BaseStep } from "./base";

export class ReadStep<T> extends BaseStep<T> implements IReadStep<T> {
  public read(): Promise<List<T>> {
    return this.dataSource.read();
  }
}
