import { Any, KeyOf, List } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourceFilterPlugin,
  DataSourceReadDelegate,
  DataSourceSelectPlugin,
  DataSourceSkipTopPlugin,
  DataSourceSortPlugin,
  FilterOperations,
  FiltersExpression,
  IDataSourceFilterPlugin,
  IDataSourcePlugin,
  IDataSourceSelectPlugin,
  IDataSourceSkipTopPlugin,
  IDataSourceSortPlugin,
  Select,
} from "@/browsing";

import {
  IWherePartialStep,
  IWhereStep,
  IQueryable,
  ISortPartialStep,
  IReadStep,
  ISelectPartialStep,
  ISelectStep,
  ISelectAliasStep,
  ITakePartialStep,
  ITakeStep,
  ISortStep,
} from "./interfaces";
import { onAnd, onOr, onWhere } from "./utils";

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

export class Queryable<T> implements IQueryable<T> {
  private readonly dataSource: QueryableDataSource<T>;

  public constructor(dataSource: QueryableDataSource<T>) {
    this.dataSource = dataSource;
  }

  public all(): ISortPartialStep<T> {
    return new SortPartialStep(this.dataSource);
  }
  public where(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onWhere(dataSource.filterPlugin);
    return new WherePartialQuery(dataSource, key, filtersExpression);
  }
}

class BaseStep<T> {
  protected readonly dataSource: QueryableDataSource<T>;

  public constructor(dataSource: QueryableDataSource<T>) {
    this.dataSource = dataSource;
  }
}

class ReadStep<T> extends BaseStep<T> implements IReadStep<T> {
  public read(): Promise<List<T>> {
    return this.dataSource.read();
  }
}

//#region Select
class SelectPartialStep<T> extends ReadStep<T>
  implements ISelectPartialStep<T> {
  public add(value: any): ISelectAliasStep<T> {
    const { selectPlugin } = this.dataSource;
    const select = selectPlugin.selectCustom("", value);
    return new SelectAliasStep(this.dataSource, select);
  }
  public select(
    fieldName: KeyOf<T>,
    ...fieldNames: List<KeyOf<T>>
  ): ISelectStep<T> {
    const { selectPlugin } = this.dataSource;
    let select: Select<T> = selectPlugin.select(fieldName);
    fieldNames.forEach((a) => {
      select = selectPlugin.select(a);
    });
    return new SelectStep(this.dataSource, select);
  }
}

class SelectAliasStep<T> extends BaseStep<T> implements ISelectAliasStep<T> {
  private readonly select: Select<T>;

  public constructor(dataSource: QueryableDataSource<T>, select: Select<T>) {
    super(dataSource);
    this.select = select;
  }

  public as(alias: string): ISelectPartialStep<T> {
    this.select.alias = alias;
    return new SelectPartialStep(this.dataSource);
  }
}

class SelectStep<T> extends SelectPartialStep<T> implements ISelectStep<T> {
  private readonly lastSelect: Select<T>;

  public constructor(
    dataSource: QueryableDataSource<T>,
    lastSelect: Select<T>
  ) {
    super(dataSource);
    this.lastSelect = lastSelect;
  }

  public as(alias: string): ISelectPartialStep<T> {
    this.lastSelect.alias = alias;
    return new SelectPartialStep(this.dataSource);
  }
}
//#endregion

//#region Take
class TakePartialStep<T> extends SelectPartialStep<T>
  implements ITakePartialStep<T> {
  public takeAll(): ITakeStep<T> {
    return new TakeStep(this.dataSource);
  }
  public take(itemsCount: number): ITakeStep<T> {
    this.dataSource.skipTopPlugin.setTop(itemsCount);
    return new TakeStep(this.dataSource);
  }
}

class TakeStep<T> extends SelectPartialStep<T> implements ITakeStep<T> {
  public startingFrom(skipItemsCount: number): ISelectPartialStep<T> {
    this.dataSource.skipTopPlugin.setSkip(skipItemsCount);
    return new SelectPartialStep(this.dataSource);
  }
}
//#endregion

//#region Sort
class SortPartialStep<T> extends TakePartialStep<T>
  implements ISortPartialStep<T> {
  public sortBy(fieldName: KeyOf<T>): ISortStep<T> {
    this.dataSource.sortPlugin.sortBy(fieldName);
    return new SortStep(this.dataSource, fieldName);
  }
}

class SortStep<T> extends TakePartialStep<T> implements ISortStep<T> {
  private readonly fieldName: KeyOf<T>;

  public constructor(dataSource: QueryableDataSource<T>, fieldName: KeyOf<T>) {
    super(dataSource);
    this.fieldName = fieldName;
  }

  public asc(): ISortPartialStep<T> {
    this.dataSource.sortPlugin.sortBy(this.fieldName, true);
    return new SortPartialStep(this.dataSource);
  }
  public desc(): ISortPartialStep<T> {
    this.dataSource.sortPlugin.sortBy(this.fieldName, true);
    return new SortPartialStep(this.dataSource);
  }
}
//#endregion

//#region Where
class WherePartialQuery<T> extends SortPartialStep<T>
  implements IWherePartialStep<T> {
  private readonly key: KeyOf<T>;
  private readonly filtersExpression: FiltersExpression<T>;

  public constructor(
    dataSource: QueryableDataSource<T>,
    key: KeyOf<T>,
    filtersExpression: FiltersExpression<T>
  ) {
    super(dataSource);
    this.filtersExpression = filtersExpression;
    this.key = key;
  }

  public contains(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.contains,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isContainedIn(...values: List<Any>): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.in,
        value: values,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isFalse(): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: false,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isGreaterThan(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThan,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isGreaterThanOrEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.greaterThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isLessThan(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThan,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isLessThanOrEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.lessThanOrEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isNotContainedIn(...values: List<Any>): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notIn,
        value: values,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isNotEqualTo(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notEqual,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public isTrue(): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.equal,
        value: true,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
  public notContains(value: Any): IWhereStep<T> {
    this.dataSource.filterPlugin.addFilter(
      {
        field: this.key,
        operation: FilterOperations.notContains,
        value,
      },
      this.filtersExpression
    );
    return new WhereQuery(this.dataSource);
  }
}

class WhereQuery<T> extends SortPartialStep<T> implements IWhereStep<T> {
  public and(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onAnd(dataSource.filterPlugin);
    return new WherePartialQuery(dataSource, key, filtersExpression);
  }
  public or(key: KeyOf<T>): IWherePartialStep<T> {
    const { dataSource } = this;
    const filtersExpression = onOr(dataSource.filterPlugin);
    return new WherePartialQuery(dataSource, key, filtersExpression);
  }
}
//#endregion
