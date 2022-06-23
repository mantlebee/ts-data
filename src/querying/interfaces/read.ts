import { List } from "@mantlebee/ts-core";

export interface IReadStep<T> {
  read(): Promise<List<T>>;
}
