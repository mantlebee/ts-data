import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceSkipTopPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly skip: number;
  readonly top: number;
  setSkip(skip: number): void;
  setTop(top: number): void;
}
