import { KeyOf, List } from "@mantlebee/ts-core";

import { Select } from "@/browsing";

import {
  ISelectAliasStep,
  ISelectPartialStep,
  ISelectStep,
} from "../interfaces";
import { BaseStep } from "./base";
import { QueryableDataSource } from "./datasource";
import { ReadStep } from "./read";

export class SelectAliasStep<T> extends BaseStep<T>
  implements ISelectAliasStep<T> {
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

export class SelectPartialStep<T> extends ReadStep<T>
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

export class SelectStep<T> extends SelectPartialStep<T>
  implements ISelectStep<T> {
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
