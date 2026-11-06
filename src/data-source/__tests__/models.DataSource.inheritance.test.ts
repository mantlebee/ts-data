import { EventsDefinition, Subscribable } from "@mantlebee/ts-core";

import {
  createDataSource,
  DataSource,
  DataSourceExtensionProperties,
  DataSourceExtensionsDefinition,
  DataSourcePayload,
  DataSourceReader,
  FilterExtension,
  IDataSource,
  IDataSourceExtension,
  IDataSourceWith,
  PaginationExtension,
  SortExtension,
} from "@/data-source";
import { FilterLogics, FilterOperators } from "@/query-items";

type Item = { id: number; name: string };

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };

const reader: DataSourceReader<Item> = async () => [item1, item2];
const countReader: DataSourceReader<Item, number> = async () => 2;

/** A subclass that knows its extensions: it declares the keys it gives. */
class ItemsDataSource extends DataSource<Item> {
  declare public readonly filtering: FilterExtension<Item>;
  declare public readonly pagination: PaginationExtension<Item>;

  public constructor(itemsReader: DataSourceReader<Item> = reader) {
    super(itemsReader, {
      filtering: new FilterExtension<Item>(),
      pagination: new PaginationExtension<Item>(countReader, 10),
    });
  }

  /** The protected pipeline, readable from a subclass. */
  public get extensionsCount(): number {
    return this._extensions.length;
  }

  public async readById(id: number): Promise<void> {
    this.filtering.setFilters([
      { field: "id", operator: FilterOperators.equal, value: id },
    ]);
    await this.read();
  }
}

/** A generic subclass: it knows no key, it adds behaviour to any source. */
class CountingDataSource<TItem> extends DataSource<TItem> {
  public readsCount = 0;

  public override async read(): Promise<void> {
    this.readsCount++;
    await super.read();
  }
}

/** The factory of the generic subclass: the keys come from the record. */
function createCountingDataSource<
  TItem,
  TExt extends DataSourceExtensionsDefinition<TItem>,
>(reader: DataSourceReader<TItem>, extensions: TExt) {
  return new CountingDataSource<TItem>(
    reader,
    extensions,
  ) as CountingDataSource<TItem> & DataSourceExtensionProperties<TExt>;
}

/** `true` when `A` and `B` are the same type, checked at compile time. */
type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

describe("DataSource inheritance", () => {
  test("The class is exported: the factory builds an instance of it", () => {
    expect(createDataSource(reader, {})).toBeInstanceOf(DataSource);
    expect(new ItemsDataSource()).toBeInstanceOf(DataSource);
  });
  test("A subclass reads the keys it declares, set by the constructor of the class", () => {
    const source = new ItemsDataSource();
    expect(source.filtering).toBeInstanceOf(FilterExtension);
    expect(source.pagination).toBeInstanceOf(PaginationExtension);
    expect("filtering" in source).toBe(true);
    expect("sorting" in source).toBe(false);
    expect(source.extensionsCount).toBe(2);
  });
  test("A method of the subclass drives its extensions and the read cycle of the class", async () => {
    const payloads: DataSourcePayload<Item>[] = [];
    const source = new ItemsDataSource(async (payload) => {
      payloads.push(payload);
      return [item1];
    });
    const onItems = jest.fn();
    source.on("items", onItems);
    await source.readById(1);
    expect(payloads).toEqual([
      {
        filters: {
          filters: [{ field: "id", operator: FilterOperators.equal, value: 1 }],
          logic: FilterLogics.and,
        },
        pagination: { itemsPerPage: 10, page: 1, totalItemsCount: 2 },
      },
    ]);
    expect(source.items).toEqual([item1]);
    expect(onItems).toHaveBeenCalledWith([item1]);
  });
  test("A subclass fits the consumers asking for its keys, not the ones asking for more", () => {
    const source = new ItemsDataSource();
    const bind = (
      bound: IDataSourceWith<Item, "filtering" | "pagination">,
    ): IDataSource<Item> => bound;
    expect(bind(source)).toBe(source);
    const exactFiltering: IsExact<
      typeof source.filtering,
      FilterExtension<Item>
    > = true;
    expect(exactFiltering).toBe(true);
    // @ts-expect-error `sorting` is not declared by the subclass.
    const sortable: IDataSourceWith<Item, "sorting"> = source;
    expect(sortable).toBe(source);
  });
  test("A method of the subclass is a member of the source: refused as a key", () => {
    class Refreshable extends DataSource<Item> {
      public constructor(extension: IDataSourceExtension<Item>) {
        super(reader, { refresh: extension });
      }
      public async refresh(): Promise<void> {
        await this.read();
      }
    }
    const extension = new (class extends Subscribable<EventsDefinition> {})();
    expect(() => new Refreshable(extension)).toThrow(
      '"refresh" is a member of the data source: use another key for the extension',
    );
  });
  test("A generic subclass overrides read and takes its keys from a factory of its own", async () => {
    const sorting = new SortExtension<Item>();
    const source = createCountingDataSource(reader, { sorting });
    const exactSorting: IsExact<
      typeof source.sorting,
      SortExtension<Item>
    > = true;
    expect(exactSorting).toBe(true);
    expect(source.sorting).toBe(sorting);
    await source.read();
    await source.read();
    expect(source.readsCount).toBe(2);
    expect(source.items).toEqual([item1, item2]);
    // @ts-expect-error `filtering` is not in the record.
    expect(source.filtering).toBeUndefined();
  });
});
