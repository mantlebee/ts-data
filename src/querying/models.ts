import { Any, KeyOf, List } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourceFilteringPlugin,
  DataSourceReadDelegate,
  DataSourceSkipTopPlugin,
  DataSourceSortingPlugin,
  FilterOperations,
  FilterOperators,
  FiltersExpression,
  IDataSourceFilteringPlugin,
  IDataSourcePlugin,
  IDataSourceSkipTopPlugin,
  IDataSourceSortingPlugin,
} from "@/browsing";

import { IPartialQuery, IQuery, IQueryable } from "./interfaces";

export class DataSourceForQueryable<T> extends DataSource<T> {
  public readonly filteringPlugin: IDataSourceFilteringPlugin<T>;
  public readonly skipTopPlugin: IDataSourceSkipTopPlugin<T>;
  public readonly sortingPlugin: IDataSourceSortingPlugin<T>;

  public constructor(readDelegate: DataSourceReadDelegate<T>) {
    const filteringPlugin = new DataSourceFilteringPlugin<T>();
    const skipTopPlugin = new DataSourceSkipTopPlugin<T>();
    const sortingPlugin = new DataSourceSortingPlugin<T>();
    const plugins: List<IDataSourcePlugin<T>> = [
      filteringPlugin,
      skipTopPlugin,
      sortingPlugin,
    ];
    super(readDelegate, plugins);
    this.filteringPlugin = filteringPlugin;
    this.skipTopPlugin = skipTopPlugin;
    this.sortingPlugin = sortingPlugin;
  }
}

export class Queryable<T> implements IQueryable<T> {
  private readonly dataSource: DataSourceForQueryable<T>;

  public constructor(dataSource: DataSourceForQueryable<T>) {
    this.dataSource = dataSource;
  }

  public all(): IQuery<T> {
    return new Query(this.dataSource);
  }
  public where(key: KeyOf<T>): IPartialQuery<T> {
    return new PartialQuery(this.dataSource, key);
  }
}

export class Query<T> implements IQuery<T> {
  private readonly dataSource: DataSourceForQueryable<T>;

  public constructor(dataSource: DataSourceForQueryable<T>) {
    this.dataSource = dataSource;
  }

  public and(key: KeyOf<T>): IPartialQuery<T> {
    return new PartialQuery(this.dataSource, key);
  }
  public or(key: KeyOf<T>): IPartialQuery<T> {
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
  public read(): Promise<List<T>> {
    return this.dataSource.read();
  }
  public sortBy(key: KeyOf<T>, asc: boolean): IQuery<T> {
    const { sortingPlugin } = this.dataSource;
    sortingPlugin.clearSorts();
    sortingPlugin.sortBy(key, asc);
    return this;
  }
  public skip(skip: number): IQuery<T> {
    this.dataSource.skipTopPlugin.setSkip(skip);
    return this;
  }
  public top(top: number): IQuery<T> {
    this.dataSource.skipTopPlugin.setTop(top);
    return this;
  }
}

export class PartialQuery<T> implements IPartialQuery<T> {
  private readonly dataSource: DataSourceForQueryable<T>;
  private readonly key: KeyOf<T>;
  private readonly filtersExpression: FiltersExpression<T>;

  public constructor(
    dataSource: DataSourceForQueryable<T>,
    key: KeyOf<T>,
    filtersExpression?: FiltersExpression<T>
  ) {
    this.dataSource = dataSource;
    this.key = key;
    this.filtersExpression =
      filtersExpression || this.dataSource.filteringPlugin.filtersExpression;
  }

  public contains(value: Any): IQuery<T> {
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
  public isContainedIn(value: Any): IQuery<T> {
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
  public isEqualTo(value: Any): IQuery<T> {
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
  public isFalse(): IQuery<T> {
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: (false as unknown) as T[KeyOf<T>],
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
  public isGreaterThan(value: Any): IQuery<T> {
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
  public isGreaterThanOrEqualTo(value: Any): IQuery<T> {
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
  public isLessThan(value: Any): IQuery<T> {
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
  public isLessThanOrEqualTo(value: Any): IQuery<T> {
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
  public isTrue(): IQuery<T> {
    this.dataSource.filteringPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: (true as unknown) as T[KeyOf<T>],
      },
      this.filtersExpression
    );
    return new Query(this.dataSource);
  }
}
