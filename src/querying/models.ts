import { Any, KeyOf, List } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourceFilterPlugin,
  DataSourceReadDelegate,
  DataSourceSelectPlugin,
  DataSourceSkipTopPlugin,
  DataSourceSortPlugin,
  FilterOperations,
  FilterOperators,
  FiltersExpression,
  IDataSourceFilterPlugin,
  IDataSourcePlugin,
  IDataSourceSelectPlugin,
  IDataSourceSkipTopPlugin,
  IDataSourceSortPlugin,
} from "@/browsing";

import { IPartialQuery, IQuery, IQueryable } from "./interfaces";
import { onAnd, onOr, onWhere } from "./utils";

export class QueryableDataSource<TItem> extends DataSource<TItem> {
  public readonly filterPlugin: IDataSourceFilterPlugin<TItem>;
  public readonly selectPlugin: IDataSourceSelectPlugin<TItem>;
  public readonly skipTopPlugin: IDataSourceSkipTopPlugin<TItem>;
  public readonly sortPlugin: IDataSourceSortPlugin<TItem>;

  public constructor(readDelegate: DataSourceReadDelegate<TItem>) {
    const filterPlugin = new DataSourceFilterPlugin<TItem>();
    const selectPlugin = new DataSourceSelectPlugin<TItem>();
    const skipTopPlugin = new DataSourceSkipTopPlugin<TItem>();
    const sortPlugin = new DataSourceSortPlugin<TItem>();
    const plugins: List<IDataSourcePlugin<TItem>> = [
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

export class Queryable<TItem> implements IQueryable<TItem> {
  private readonly dataSource: QueryableDataSource<TItem>;

  public constructor(dataSource: QueryableDataSource<TItem>) {
    this.dataSource = dataSource;
  }

  public all(): IQuery<TItem> {
    return new Query(this.dataSource);
  }
  public where(key: KeyOf<TItem>): IPartialQuery<TItem> {
    const { dataSource } = this;
    const filtersExpression = onWhere(dataSource.filterPlugin);
    return new PartialQuery(dataSource, key, filtersExpression);
  }
}

class Query<TItem> implements IQuery<TItem> {
  private readonly dataSource: QueryableDataSource<TItem>;

  public constructor(dataSource: QueryableDataSource<TItem>) {
    this.dataSource = dataSource;
  }

  public and(key: KeyOf<TItem>): IPartialQuery<TItem> {
    const { dataSource } = this;
    const filtersExpression = onAnd(dataSource.filterPlugin);
    return new PartialQuery(dataSource, key, filtersExpression);
  }
  public or(key: KeyOf<TItem>): IPartialQuery<TItem> {
    const { dataSource } = this;
    const filtersExpression = onOr(dataSource.filterPlugin);
    return new PartialQuery(dataSource, key, filtersExpression);
  }
  public read(): Promise<List<TItem>> {
    return this.dataSource.read();
  }
  public select(...keys: List<KeyOf<TItem>>): IQuery<TItem> {
    this.dataSource.selectPlugin.select(keys);
    return this;
  }
  public sortBy(key: KeyOf<TItem>, asc: boolean): IQuery<TItem> {
    const { sortPlugin } = this.dataSource;
    sortPlugin.clearSorts();
    sortPlugin.sortBy(key, asc);
    return this;
  }
  public skip(skip: number): IQuery<TItem> {
    this.dataSource.skipTopPlugin.setSkip(skip);
    return this;
  }
  public top(top: number): IQuery<TItem> {
    this.dataSource.skipTopPlugin.setTop(top);
    return this;
  }
}

class PartialQuery<TItem> implements IPartialQuery<TItem> {
  private readonly dataSource: QueryableDataSource<TItem>;
  private readonly key: KeyOf<TItem>;
  private readonly filtersExpression: FiltersExpression<TItem>;

  public constructor(
    dataSource: QueryableDataSource<TItem>,
    key: KeyOf<TItem>,
    filtersExpression: FiltersExpression<TItem>
  ) {
    this.dataSource = dataSource;
    this.filtersExpression = filtersExpression;
    this.key = key;
  }

  public contains(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.contains,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isContainedIn(...values: List<Any>): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.in,
        value: values,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isEqualTo(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isFalse(): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: false,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isGreaterThan(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThan,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isGreaterThanOrEqualTo(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isLessThan(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThan,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isLessThanOrEqualTo(value: Any): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isTrue(): IQuery<TItem> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: true,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
}
