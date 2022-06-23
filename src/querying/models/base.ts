import { QueryableDataSource } from "./datasource";

export class BaseStep<T> {
  protected readonly dataSource: QueryableDataSource<T>;

  public constructor(dataSource: QueryableDataSource<T>) {
    this.dataSource = dataSource;
  }
}
