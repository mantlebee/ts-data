import { ConstructorOf, List, Nullable } from "@mantlebee/ts-core";

import { BrowseItemsPayload } from "@/browsing";

export interface IDataSource<TItem> {
  readonly isPristine: boolean;
  readonly isReading: boolean;
  readonly items: List<TItem>;
  getPlugin<TPlugin extends IDataSourcePlugin<TItem>>(
    pluginConstructor: ConstructorOf<TPlugin>
  ): Nullable<TPlugin>;
  read(): Promise<List<TItem>>;
}

export interface IDataSourcePlugin<TItem> {
  readonly isEnabled: boolean;
  afterRead?(items: List<TItem>): Promise<List<TItem>>;
  beforeRead?(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>>;
  enable(): void;
  disable(): void;
}
