import { Any, KeyOf, List } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourceFilteringPlugin,
  DataSourceReadDelegate,
  DataSourceSelectPlugin,
  DataSourceSkipTopPlugin,
  DataSourceSortingPlugin,
  FilterOperations,
  FilterOperators,
  FiltersExpression,
  IDataSourceFilteringPlugin,
  IDataSourcePlugin,
  IDataSourceSelectPlugin,
  IDataSourceSkipTopPlugin,
  IDataSourceSortingPlugin,
} from "@/browsing";

import { IPartialQuery, IQuery, IQueryable } from "./interfaces";

export class QueryableDataSource<TItem> extends DataSource<TItem> {
  public readonly filteringPlugin: IDataSourceFilteringPlugin<TItem>;
  public readonly selectPlugin: IDataSourceSelectPlugin<TItem>;
  public readonly skipTopPlugin: IDataSourceSkipTopPlugin<TItem>;
  public readonly sortingPlugin: IDataSourceSortingPlugin<TItem>;

  public constructor(readDelegate: DataSourceReadDelegate<TItem>) {
    const filteringPlugin = new DataSourceFilteringPlugin<TItem>();
    const selectPlugin = new DataSourceSelectPlugin<TItem>();
    const skipTopPlugin = new DataSourceSkipTopPlugin<TItem>();
    const sortingPlugin = new DataSourceSortingPlugin<TItem>();
    const plugins: List<IDataSourcePlugin<TItem>> = [
      filteringPlugin,
      selectPlugin,
      skipTopPlugin,
      sortingPlugin,
    ];
    super(readDelegate, plugins);
    this.filteringPlugin = filteringPlugin;
    this.selectPlugin = selectPlugin;
    this.skipTopPlugin = skipTopPlugin;
    this.sortingPlugin = sortingPlugin;
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
    return new PartialQuery(this.dataSource, key);
  }
}

export class Query<TItem> implements IQuery<TItem> {
  private readonly dataSource: QueryableDataSource<TItem>;

  public constructor(dataSource: QueryableDataSource<TItem>) {
    this.dataSource = dataSource;
  }

  public and(key: KeyOf<TItem>): IPartialQuery<TItem> {
    return new PartialQuery(this.dataSource, key);
  }
  public or(key: KeyOf<TItem>): IPartialQuery<TItem> {
    const {
      childExpressions,
    } = this.dataSource.filteringPlugin.filtersExpression;
    if (!childExpressions.length)
      childExpressions.push({
        childExpressions: [],
        filters: [],
        operator: FilterOperators.or,
      });
    return new PartialQuery(this.dataSource, key, childExpressions[0]);
  }
  public read(): Promise<List<TItem>> {
    return this.dataSource.read();
  }
  public select(...keys: List<KeyOf<TItem>>): IQuery<TItem> {
    this.dataSource.selectPlugin.select(keys);
    return this;
  }
  public sortBy(key: KeyOf<TItem>, asc: boolean): IQuery<TItem> {
    const { sortingPlugin } = this.dataSource;
    sortingPlugin.clearSorts();
    sortingPlugin.sortBy(key, asc);
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

export class PartialQuery<TItem> implements IPartialQuery<TItem> {
  private readonly dataSource: QueryableDataSource<TItem>;
  private readonly key: KeyOf<TItem>;
  private readonly filtersExpression: FiltersExpression<TItem>;

  public constructor(
    dataSource: QueryableDataSource<TItem>,
    key: KeyOf<TItem>,
    filtersExpression?: FiltersExpression<TItem>
  ) {
    this.dataSource = dataSource;
    this.key = key;
    this.filtersExpression =
      filtersExpression || this.dataSource.filteringPlugin.filtersExpression;
  }

  public contains(value: Any): IQuery<TItem> {
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.contains,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isContainedIn(value: Any): IQuery<TItem> {
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.in,
        value,
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isEqualTo(value: Any): IQuery<TItem> {
    this.dataSource.filteringPlugin.addFilter(
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
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: (false as unknown) as TItem[KeyOf<TItem>],
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isGreaterThan(value: Any): IQuery<TItem> {
    this.dataSource.filteringPlugin.addFilter(
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
    this.dataSource.filteringPlugin.addFilter(
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
    this.dataSource.filteringPlugin.addFilter(
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
    this.dataSource.filteringPlugin.addFilter(
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
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: (true as unknown) as TItem[KeyOf<TItem>],
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
}
