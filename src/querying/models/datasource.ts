import { List } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourceFilterPlugin,
  DataSourcePlugin,
  DataSourceReadDelegate,
  DataSourceSelectPlugin,
  DataSourceSkipTopPlugin,
  DataSourceSortPlugin,
} from "@/browsing";

export class QueryableDataSource<T> extends DataSource<T> {
  public readonly filterPlugin: DataSourceFilterPlugin<T>;
  public readonly selectPlugin: DataSourceSelectPlugin<T>;
  public readonly skipTopPlugin: DataSourceSkipTopPlugin<T>;
  public readonly sortPlugin: DataSourceSortPlugin<T>;

  public constructor(readDelegate: DataSourceReadDelegate<T>) {
    const filterPlugin = new DataSourceFilterPlugin<T>();
    const selectPlugin = new DataSourceSelectPlugin<T>();
    const skipTopPlugin = new DataSourceSkipTopPlugin<T>();
    const sortPlugin = new DataSourceSortPlugin<T>();
    const plugins: List<DataSourcePlugin<T>> = [
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
