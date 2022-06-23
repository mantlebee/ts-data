import { List } from "@mantlebee/ts-core";

import {
  DataSource,
  IDataSourceFilterPlugin,
  IDataSourceSelectPlugin,
  IDataSourceSkipTopPlugin,
  IDataSourceSortPlugin,
  DataSourceReadDelegate,
  DataSourceFilterPlugin,
  DataSourceSelectPlugin,
  DataSourceSkipTopPlugin,
  DataSourceSortPlugin,
  IDataSourcePlugin,
} from "@/browsing";

export class QueryableDataSource<T> extends DataSource<T> {
  public readonly filterPlugin: IDataSourceFilterPlugin<T>;
  public readonly selectPlugin: IDataSourceSelectPlugin<T>;
  public readonly skipTopPlugin: IDataSourceSkipTopPlugin<T>;
  public readonly sortPlugin: IDataSourceSortPlugin<T>;

  public constructor(readDelegate: DataSourceReadDelegate<T>) {
    const filterPlugin = new DataSourceFilterPlugin<T>();
    const selectPlugin = new DataSourceSelectPlugin<T>();
    const skipTopPlugin = new DataSourceSkipTopPlugin<T>();
    const sortPlugin = new DataSourceSortPlugin<T>();
    const plugins: List<IDataSourcePlugin<T>> = [
      filterPlugin,
      selectPlugin,
      skipTopPlugin,
      sortPlugin,
    ];
    super(readDelegate, plugins);
    this.filterPlugin = filterPlugin;
    this.selectPlugin = selectPlugin;
    this.skipTopPlugin = skipTopPlugin;
    this.sortPlugin = sortPlugin;
  }
}
